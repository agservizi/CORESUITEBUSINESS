"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Grid,
  Chip,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Stack,
  LinearProgress,
  alpha,
  Switch,
  FormControlLabel,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import PersonIcon from "@mui/icons-material/Person";
import SecurityIcon from "@mui/icons-material/Security";
import LockIcon from "@mui/icons-material/Lock";
import PaletteIcon from "@mui/icons-material/Palette";
import EmailIcon from "@mui/icons-material/Email";
import BadgeIcon from "@mui/icons-material/Badge";
import ScheduleIcon from "@mui/icons-material/Schedule";
import ShieldIcon from "@mui/icons-material/Shield";
import SaveIcon from "@mui/icons-material/Save";
import { useTheme } from "@mui/material/styles";
import { jsonMutationHeaders } from "@/lib/csrf-client";
import { getShellTokens } from "@/theme/shell-tokens";
import { useThemeMode } from "@/context/ThemeModeProvider";
import ServiceStatCard from "@/components/platform/service-shell/ServiceStatCard";
import { hubStaggerContainer, hubFadeUpSoft } from "@/lib/hub-motion";
import ProfileHero from "@/components/profile/ProfileHero";
import ProfileSectionCard from "@/components/profile/ProfileSectionCard";
import HistoryIcon from "@mui/icons-material/History";
import { validatePassword } from "@/lib/password-policy";
import SecurityChecklistPanel from "@/components/profile/SecurityChecklistPanel";
import { getSecurityInsight } from "@/components/profile/security-checklist";
import type { SecurityCheckItem } from "@/components/profile/security-checklist";
import {
  type ProfileUser,
  type ProfileTab,
  PROFILE_TABS,
  getProfileTheme,
  profileRoleLabel,
  formatMemberSince,
  formatRelativeLogin,
  PROFILE_ACCENT,
} from "@/components/profile/profile-utils";

type LoginRecord = {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
};

function InfoRow({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon?: React.ElementType }) {
  return (
    <Box
      sx={(theme) => ({
        p: 2,
        borderRadius: 2,
        bgcolor: getShellTokens(theme).hover,
        border: getShellTokens(theme).border,
      })}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.75 }}>
        {Icon && <Icon sx={{ fontSize: 18, color: "text.secondary" }} />}
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: "0.04em" }}>
          {label}
        </Typography>
      </Stack>
      <Box component="div" sx={{ fontWeight: 600, fontSize: "1rem", lineHeight: 1.5 }}>
        {value}
      </Box>
    </Box>
  );
}

function ProfileSkeleton() {
  return (
    <Box sx={{ maxWidth: 960, mx: "auto", px: { xs: 2, md: 4 }, py: { xs: 2, md: 4 } }}>
      <LinearProgress sx={{ mb: 3, borderRadius: 1 }} />
      <Box sx={{ borderRadius: 3, height: 220, bgcolor: "action.hover", mb: 3 }} />
      <Grid container spacing={2}>
        {[0, 1, 2, 3].map((i) => (
          <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}>
            <Box sx={{ height: 100, borderRadius: 2, bgcolor: "action.hover" }} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

export default function ProfileClient() {
  const router = useRouter();
  const muiTheme = useTheme();
  const { mode, toggleMode } = useThemeMode();
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<ProfileTab>("account");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [passwordMsg, setPasswordMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [nameDraft, setNameDraft] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [pwdForm, setPwdForm] = useState({ current: "", next: "", confirm: "", mfa: "" });
  const [savingPassword, setSavingPassword] = useState(false);
  const [recentLogins, setRecentLogins] = useState<LoginRecord[]>([]);
  const [loginsLoading, setLoginsLoading] = useState(false);

  async function loadProfile() {
    try {
      const res = await fetch("/api/profile", { credentials: "include" });
      const text = await res.text();
      if (!text) {
        setError("Risposta vuota dal server. Prova a riavviare `npm run dev`.");
        return;
      }
      const data = JSON.parse(text) as { user?: ProfileUser; error?: string };
      if (!res.ok) {
        setError(data.error || "Errore caricamento profilo");
        return;
      }
      if (!data.user) {
        setError("Profilo non disponibile");
        return;
      }
      setUser(data.user);
      setNameDraft(data.user.name ?? "");
    } catch {
      setError("Impossibile caricare il profilo");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadRecentLogins() {
    setLoginsLoading(true);
    try {
      const res = await fetch("/api/profile/security", { credentials: "include" });
      const text = await res.text();
      if (!text) return;
      const data = JSON.parse(text) as { recentLogins?: LoginRecord[] };
      setRecentLogins(Array.isArray(data.recentLogins) ? data.recentLogins : []);
    } catch {
      setRecentLogins([]);
    } finally {
      setLoginsLoading(false);
    }
  }

  useEffect(() => {
    if (tab === "security") loadRecentLogins();
  }, [tab]);

  async function startMfaSetup() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/profile/mfa", {
        method: "POST",
        headers: jsonMutationHeaders(),
      });
      const data = await res.json();
      if (data.qrDataUrl) setQrDataUrl(data.qrDataUrl);
      else setError(data.error || "Errore setup MFA");
    } finally {
      setBusy(false);
    }
  }

  async function confirmMfa() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/profile/mfa", {
        method: "PUT",
        headers: jsonMutationHeaders(),
        body: JSON.stringify({ code: mfaCode }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess("MFA attivato — il tuo account è ora più protetto");
        setQrDataUrl(null);
        setMfaCode("");
        await loadProfile();
      } else {
        setError(data.error || "Codice non valido");
      }
    } finally {
      setBusy(false);
    }
  }

  async function disableMfa() {
    if (!confirm("Disattivare l'autenticazione a due fattori?")) return;
    setBusy(true);
    await fetch("/api/profile/mfa", { method: "DELETE", headers: jsonMutationHeaders() });
    setSuccess("MFA disattivato");
    setQrDataUrl(null);
    await loadProfile();
    setBusy(false);
  }

  async function changePassword() {
    const policy = validatePassword(pwdForm.next);
    if (!policy.valid) {
      setError(policy.error ?? "Password non valida");
      return;
    }
    if (pwdForm.next !== pwdForm.confirm) {
      setError("Le password non coincidono");
      return;
    }
    if (user?.mfaEnabled && pwdForm.mfa.length !== 6) {
      setError("Inserisci il codice MFA a 6 cifre");
      return;
    }

    setSavingPassword(true);
    setError("");
    setPasswordMsg("");
    try {
      const res = await fetch("/api/profile/password", {
        method: "POST",
        headers: jsonMutationHeaders(),
        body: JSON.stringify({
          currentPassword: pwdForm.current,
          newPassword: pwdForm.next,
          confirmPassword: pwdForm.confirm,
          mfaCode: user?.mfaEnabled ? pwdForm.mfa : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Impossibile aggiornare la password");
        return;
      }
      setPasswordMsg(data.message);
      setSuccess("Password aggiornata — punteggio sicurezza migliorato");
      setPwdForm({ current: "", next: "", confirm: "", mfa: "" });
      await loadProfile();
    } finally {
      setSavingPassword(false);
    }
  }

  function handleSecurityAction(action: SecurityCheckItem["action"], targetTab: ProfileTab) {
    setTab(targetTab);
    window.setTimeout(() => {
      const targetId =
        action === "mfa" ? "profile-mfa" : action === "password" ? "profile-password" : action === "name" ? "profile-name" : null;
      if (targetId) document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "center" });
      if (action === "mfa" && user && !user.mfaEnabled && !qrDataUrl) startMfaSetup();
    }, 280);
  }

  async function saveName() {
    const trimmed = nameDraft.trim();
    if (trimmed.length < 2) {
      setError("Il nome deve contenere almeno 2 caratteri");
      return;
    }
    setSavingName(true);
    setError("");
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: jsonMutationHeaders(),
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Impossibile aggiornare il nome");
        return;
      }
      setUser(data.user);
      setNameDraft(data.user.name ?? "");
      setSuccess("Nome aggiornato con successo");
      window.dispatchEvent(new CustomEvent("coresuite:user-updated", { detail: { user: data.user } }));
    } finally {
      setSavingName(false);
    }
  }

  const nameChanged = nameDraft.trim() !== (user?.name ?? "").trim();

  if (loading) {
    return (
      <Box sx={(theme) => ({ minHeight: "100vh", bgcolor: getShellTokens(theme).pageBg })}>
        <ProfileSkeleton />
      </Box>
    );
  }

  if (!user) {
    return (
      <Box sx={{ py: 8, textAlign: "center" }}>
        <Typography color="error">Profilo non disponibile</Typography>
      </Box>
    );
  }

  const accent = getProfileTheme(user.role).color;
  const security = getSecurityInsight(user);
  const pwdPreview = pwdForm.next ? validatePassword(pwdForm.next) : null;

  return (
    <Box sx={(theme) => ({ minHeight: "100vh", bgcolor: getShellTokens(theme).pageBg, py: { xs: 2, md: 4 } })}>
      <Box sx={{ maxWidth: 960, mx: "auto", px: { xs: 2, md: 4 } }}>
        <ProfileHero user={user} onBack={() => router.push("/dashboard")} onSecurityAction={handleSecurityAction} />

        <Grid
          container
          spacing={2}
          component={motion.div}
          variants={hubStaggerContainer}
          initial="hidden"
          animate="show"
          sx={{ mb: 3 }}
        >
          <Grid size={{ xs: 12, sm: 6, md: 3 }} component={motion.div} variants={hubFadeUpSoft}>
            <ServiceStatCard label="Ruolo" value={profileRoleLabel(user.role)} color={accent} icon={BadgeIcon} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }} component={motion.div} variants={hubFadeUpSoft}>
            <ServiceStatCard label="Membro da" value={formatMemberSince(user.createdAt)} color="#8b5cf6" icon={PersonIcon} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }} component={motion.div} variants={hubFadeUpSoft}>
            <ServiceStatCard
              label="Ultimo accesso"
              value={formatRelativeLogin(user.lastLoginAt)}
              sub={user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString("it-IT") : undefined}
              color="#0ea5e9"
              icon={ScheduleIcon}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }} component={motion.div} variants={hubFadeUpSoft}>
            <ServiceStatCard
              label="Sicurezza"
              value={`${security.score}/100`}
              sub={security.label}
              color={security.color}
              icon={ShieldIcon}
            />
          </Grid>
        </Grid>

        {(error || success) && (
          <Box sx={{ mb: 2 }}>
            {error && <Alert severity="error" sx={{ mb: 1 }} onClose={() => setError("")}>{error}</Alert>}
            {success && <Alert severity="success" onClose={() => setSuccess("")}>{success}</Alert>}
          </Box>
        )}

        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v as ProfileTab)}
          sx={{
            mb: 3,
            "& .MuiTab-root": { fontWeight: 700, textTransform: "none", minHeight: 48 },
            "& .Mui-selected": { color: accent },
            "& .MuiTabs-indicator": { bgcolor: accent, height: 3, borderRadius: 2 },
          }}
        >
          {PROFILE_TABS.map((t) => (
            <Tab key={t.id} value={t.id} label={t.label} />
          ))}
        </Tabs>

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28 }}
          >
            {tab === "account" && (
              <Stack spacing={2.5}>
                <ProfileSectionCard
                  title="Informazioni account"
                  subtitle="Dati associati al tuo accesso Coresuite"
                  icon={PersonIcon}
                  accent={accent}
                >
                  <Stack id="profile-name" spacing={2.5} sx={{ mb: 2 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Nome completo"
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                      placeholder="Es. Mario Rossi"
                      slotProps={{ htmlInput: { maxLength: 120 } }}
                      helperText="Visibile in ticket, attività e comunicazioni interne"
                    />
                    <Box>
                      <Button
                        variant="contained"
                        startIcon={savingName ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : <SaveIcon />}
                        onClick={saveName}
                        disabled={savingName || !nameChanged || nameDraft.trim().length < 2}
                        sx={{ bgcolor: accent, fontWeight: 700 }}
                      >
                        Salva nome
                      </Button>
                    </Box>
                  </Stack>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <InfoRow label="Email" value={user.email} icon={EmailIcon} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <InfoRow
                        label="Ruolo piattaforma"
                        value={<Chip size="small" label={profileRoleLabel(user.role)} sx={{ bgcolor: alpha(accent, 0.12), color: accent, fontWeight: 700 }} />}
                        icon={BadgeIcon}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <InfoRow
                        label="ID utente"
                        value={
                          <Box component="span" sx={{ fontFamily: "monospace", opacity: 0.8, fontSize: "0.875rem" }}>
                            {user.id.slice(0, 8)}…
                          </Box>
                        }
                      />
                    </Grid>
                  </Grid>
                </ProfileSectionCard>
              </Stack>
            )}

            {tab === "security" && (
              <Stack spacing={2.5}>
                <SecurityChecklistPanel
                  items={security.items}
                  score={security.score}
                  accent={accent}
                  onAction={handleSecurityAction}
                />

                <ProfileSectionCard
                  title="Autenticazione a due fattori"
                  subtitle="Proteggi l'accesso con un codice TOTP da app authenticator"
                  icon={SecurityIcon}
                  accent="#10b981"
                  action={
                    user.mfaEnabled ? (
                      <Chip label="Attivo" color="success" size="small" sx={{ fontWeight: 700 }} />
                    ) : (
                      <Chip label="Non configurato" size="small" sx={{ fontWeight: 600 }} />
                    )
                  }
                >
                  <Box id="profile-mfa">
                  {!user.mfaEnabled ? (
                    !qrDataUrl ? (
                      <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 520 }}>
                          Attiva MFA per aumentare drasticamente la sicurezza del tuo account. Compatibile con Google Authenticator, Authy e altre app TOTP.
                        </Typography>
                        <Button
                          variant="contained"
                          onClick={startMfaSetup}
                          disabled={busy}
                          sx={{ bgcolor: "#10b981", fontWeight: 700, px: 3 }}
                        >
                          {busy ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : "Configura MFA"}
                        </Button>
                      </Box>
                    ) : (
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: { xs: "column", md: "row" },
                          gap: 3,
                          alignItems: { md: "flex-start" },
                        }}
                      >
                        <Box
                          sx={{
                            p: 2,
                            borderRadius: 3,
                            bgcolor: alpha("#fff", muiTheme.palette.mode === "dark" ? 0.06 : 0.9),
                            border: `1px solid ${alpha("#10b981", 0.25)}`,
                            boxShadow: `0 8px 32px ${alpha("#10b981", 0.12)}`,
                          }}
                        >
                          <Box
                            component="img"
                            src={qrDataUrl}
                            alt="QR code MFA"
                            sx={{ width: 200, height: 200, borderRadius: 2, display: "block" }}
                          />
                        </Box>
                        <Box sx={{ flex: 1, maxWidth: 360 }}>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            1. Scansiona il QR con la tua app authenticator<br />
                            2. Inserisci il codice a 6 cifre generato
                          </Typography>
                          <TextField
                            fullWidth
                            size="small"
                            label="Codice a 6 cifre"
                            value={mfaCode}
                            onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                            sx={{ mb: 2 }}
                            slotProps={{ htmlInput: { inputMode: "numeric", style: { letterSpacing: "0.3em", fontWeight: 700 } } }}
                          />
                          <Stack direction="row" spacing={1}>
                            <Button variant="contained" onClick={confirmMfa} disabled={busy || mfaCode.length !== 6} sx={{ bgcolor: "#10b981", fontWeight: 700 }}>
                              Verifica e attiva
                            </Button>
                            <Button variant="text" onClick={() => { setQrDataUrl(null); setMfaCode(""); }}>
                              Annulla
                            </Button>
                          </Stack>
                        </Box>
                      </Box>
                    )
                  ) : (
                    <Box>
                      <Alert severity="success" sx={{ mb: 2 }}>
                        MFA attivo — ogni accesso richiederà un codice dalla tua app authenticator.
                      </Alert>
                      <Button color="error" variant="outlined" onClick={disableMfa} disabled={busy}>
                        Disattiva MFA
                      </Button>
                    </Box>
                  )}
                  </Box>
                </ProfileSectionCard>

                <ProfileSectionCard
                  title="Password"
                  subtitle="Aggiorna le credenziali di accesso"
                  icon={LockIcon}
                  accent={PROFILE_ACCENT}
                  delay={0.08}
                >
                  <Box id="profile-password">
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 520 }}>
                      Minimo 8 caratteri, con lettere e numeri. Consigliato aggiornare ogni 90 giorni.
                    </Typography>
                    <Grid container spacing={2} sx={{ mb: 2, maxWidth: 520 }}>
                      <Grid size={{ xs: 12 }}>
                        <TextField
                          fullWidth
                          size="small"
                          type="password"
                          label="Password attuale"
                          value={pwdForm.current}
                          onChange={(e) => setPwdForm((f) => ({ ...f, current: e.target.value }))}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          fullWidth
                          size="small"
                          type="password"
                          label="Nuova password"
                          value={pwdForm.next}
                          onChange={(e) => setPwdForm((f) => ({ ...f, next: e.target.value }))}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          fullWidth
                          size="small"
                          type="password"
                          label="Conferma password"
                          value={pwdForm.confirm}
                          onChange={(e) => setPwdForm((f) => ({ ...f, confirm: e.target.value }))}
                        />
                      </Grid>
                      {pwdPreview && pwdForm.next && (
                        <Grid size={{ xs: 12 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block" }}>
                            Forza password: {pwdPreview.strength === "strong" ? "Alta" : pwdPreview.strength === "fair" ? "Media" : "Bassa"}
                          </Typography>
                          <LinearProgress
                            variant="determinate"
                            value={pwdPreview.score}
                            sx={{
                              height: 6,
                              borderRadius: 3,
                              bgcolor: alpha(PROFILE_ACCENT, 0.12),
                              "& .MuiLinearProgress-bar": {
                                bgcolor: pwdPreview.strength === "strong" ? "#10b981" : pwdPreview.strength === "fair" ? "#f59e0b" : "#ef4444",
                              },
                            }}
                          />
                        </Grid>
                      )}
                      {user.mfaEnabled && (
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Codice MFA"
                            value={pwdForm.mfa}
                            onChange={(e) => setPwdForm((f) => ({ ...f, mfa: e.target.value.replace(/\D/g, "").slice(0, 6) }))}
                            helperText="Richiesto con MFA attivo"
                          />
                        </Grid>
                      )}
                    </Grid>
                    <Button
                      variant="contained"
                      onClick={changePassword}
                      disabled={savingPassword || !pwdForm.current || !pwdForm.next || !pwdForm.confirm}
                      sx={{ bgcolor: PROFILE_ACCENT, fontWeight: 700 }}
                    >
                      {savingPassword ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : "Aggiorna password"}
                    </Button>
                    {passwordMsg && (
                      <Alert severity="success" sx={{ mt: 2 }}>
                        {passwordMsg}
                      </Alert>
                    )}
                  </Box>
                </ProfileSectionCard>

                <ProfileSectionCard
                  title="Accessi recenti"
                  subtitle="Ultimi login riusciti sul tuo account"
                  icon={HistoryIcon}
                  accent="#0ea5e9"
                  delay={0.12}
                >
                  {loginsLoading ? (
                    <CircularProgress size={22} />
                  ) : recentLogins.length === 0 ? (
                    <Typography color="text.secondary">Nessun accesso registrato.</Typography>
                  ) : (
                    <Stack spacing={1}>
                      {recentLogins.map((log) => (
                        <Box
                          key={log.id}
                          sx={(theme) => ({
                            p: 1.5,
                            borderRadius: 2,
                            bgcolor: getShellTokens(theme).hover,
                            border: getShellTokens(theme).border,
                          })}
                        >
                          <Typography sx={{ fontWeight: 600, fontSize: "0.875rem" }}>
                            {new Date(log.createdAt).toLocaleString("it-IT")}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                            IP: {log.ipAddress ?? "—"}
                          </Typography>
                          {log.userAgent && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25, opacity: 0.85 }}>
                              {log.userAgent.length > 80 ? `${log.userAgent.slice(0, 80)}…` : log.userAgent}
                            </Typography>
                          )}
                        </Box>
                      ))}
                    </Stack>
                  )}
                </ProfileSectionCard>
              </Stack>
            )}

            {tab === "preferences" && (
              <Stack spacing={2.5}>
                <ProfileSectionCard
                  title="Aspetto"
                  subtitle="Personalizza l'esperienza visiva della piattaforma"
                  icon={PaletteIcon}
                  accent="#8b5cf6"
                >
                  <Box
                    sx={(theme) => ({
                      p: 2.5,
                      borderRadius: 2.5,
                      bgcolor: getShellTokens(theme).hover,
                      border: getShellTokens(theme).border,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 2,
                    })}
                  >
                    <Box>
                      <Typography sx={{ fontWeight: 700 }}>Tema interfaccia</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {mode === "dark" ? "Modalità scura attiva" : "Modalità chiara attiva"}
                      </Typography>
                    </Box>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={mode === "dark"}
                          onChange={toggleMode}
                          sx={{
                            "& .MuiSwitch-switchBase.Mui-checked": { color: "#8b5cf6" },
                            "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { bgcolor: alpha("#8b5cf6", 0.5) },
                          }}
                        />
                      }
                      label={mode === "dark" ? "Scuro" : "Chiaro"}
                    />
                  </Box>
                </ProfileSectionCard>

                <ProfileSectionCard
                  title="Sessione"
                  subtitle="Informazioni sulla sessione corrente"
                  icon={ScheduleIcon}
                  accent="#0ea5e9"
                  delay={0.06}
                >
                  <InfoRow
                    label="Ultimo accesso registrato"
                    value={
                      user.lastLoginAt
                        ? new Date(user.lastLoginAt).toLocaleString("it-IT", { dateStyle: "full", timeStyle: "short" })
                        : "—"
                    }
                    icon={ScheduleIcon}
                  />
                </ProfileSectionCard>
              </Stack>
            )}
          </motion.div>
        </AnimatePresence>
      </Box>
    </Box>
  );
}
