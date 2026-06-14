"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  MenuItem,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Checkbox,
  FormControlLabel,
  Chip,
  Alert,
  IconButton,
  alpha,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import SettingsIcon from "@mui/icons-material/Settings";
import SaveIcon from "@mui/icons-material/Save";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import ImageIcon from "@mui/icons-material/Image";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import { apiFetch, readJsonResponse } from "@/lib/fetch-client";
import { money } from "./express-utils";
import { processStoreLogo } from "./express-logo-upload";
import { getShellTokens } from "@/theme/shell-tokens";

interface SettingsData {
  default_vat: number;
  sim_vat: number;
  sim_price_default: number;
  payment_methods: string[];
  default_payment_method: string;
  stock_alert_threshold: number;
  tax_note: string;
  notify_on_sale: boolean;
  loyalty_on_sale: boolean;
  loyalty_points_per_sim: number;
  loyalty_points_per_euro: number;
  ticket_on_sim_sale: boolean;
  notify_staff_on_sale: boolean;
  allow_negative_margin?: boolean;
  receipt_counter?: number;
  store_name: string;
  store_address: string;
  store_city: string;
  store_vat: string;
  store_phone: string;
  store_email: string;
  receipt_footer: string;
  store_logo?: string;
}

interface OperatorRow {
  id: string;
  name: string;
  reorderThreshold: number;
  _count?: { iccidStock: number };
}

interface CampaignRow {
  id: string;
  name: string;
  type: string;
  value: number | string;
  active: boolean;
}

interface Props {
  serviceColor: string;
}

const emptyCampaign = (): Partial<CampaignRow> => ({
  name: "",
  type: "Fixed",
  value: 0,
  active: true,
});

export default function ExpressSettingsView({ serviceColor }: Props) {
  const theme = useTheme();
  const backdrop = getShellTokens(theme).backdrop;
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [operators, setOperators] = useState<OperatorRow[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [thresholdDraft, setThresholdDraft] = useState<Record<string, string>>({});
  const [paymentMethodsText, setPaymentMethodsText] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [campaignDialog, setCampaignDialog] = useState<Partial<CampaignRow> | null>(null);
  const [campaignSaving, setCampaignSaving] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState("");
  const [operatorDialog, setOperatorDialog] = useState<{ id?: string; name: string; reorderThreshold: number } | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/platform/express?view=impostazioni", { credentials: "include" });
    const data = await readJsonResponse<{
      settings: SettingsData;
      operators: OperatorRow[];
      campaigns: CampaignRow[];
      error?: string;
    }>(res);
    if (!data || !res.ok) return;
    setSettings(data.settings);
    setOperators(data.operators || []);
    setCampaigns(
      (data.campaigns || []).map((c) => ({ ...c, value: Number(c.value) }))
    );
    setPaymentMethodsText((data.settings.payment_methods || []).join(", "));
    const drafts: Record<string, string> = {};
    (data.operators || []).forEach((op) => {
      drafts[op.id] = String(op.reorderThreshold);
    });
    setThresholdDraft(drafts);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function saveSettings() {
    if (!settings) return;
    setSaving(true);
    setFeedback("");
    const methods = paymentMethodsText
      .split(",")
      .map((m) => m.trim())
      .filter(Boolean);
    const res = await apiFetch("/api/platform/express", {
      method: "POST",
      body: JSON.stringify({
        action: "updateSettings",
        settings: {
          ...settings,
          payment_methods: methods,
        },
      }),
    });
    setSaving(false);
    if (res.ok) {
      setFeedback("Impostazioni salvate");
      load();
    } else {
      const data = await readJsonResponse<{ error?: string }>(res);
      setFeedback(data?.error || "Errore salvataggio");
    }
  }

  async function persistStoreLogo(store_logo: string) {
    const res = await apiFetch("/api/platform/express", {
      method: "POST",
      body: JSON.stringify({ action: "updateSettings", settings: { store_logo } }),
    });
    if (!res.ok) {
      const data = await readJsonResponse<{ error?: string }>(res);
      throw new Error(data?.error || "Impossibile salvare il logo");
    }
  }

  async function handleLogoFile(file: File | null) {
    if (!file || !settings) return;
    setLogoError("");
    setLogoUploading(true);
    try {
      const dataUrl = await processStoreLogo(file);
      setSettings({ ...settings, store_logo: dataUrl });
      await persistStoreLogo(dataUrl);
      setFeedback("Logo negozio salvato — comparirà in cima alla ricevuta 80mm");
    } catch (e) {
      setLogoError(e instanceof Error ? e.message : "Errore caricamento logo");
    } finally {
      setLogoUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  }

  async function removeLogo() {
    if (!settings) return;
    setLogoError("");
    setLogoUploading(true);
    try {
      setSettings({ ...settings, store_logo: "" });
      await persistStoreLogo("");
      setFeedback("Logo rimosso dalla ricevuta");
    } catch (e) {
      setLogoError(e instanceof Error ? e.message : "Errore rimozione logo");
    } finally {
      setLogoUploading(false);
    }
  }

  async function saveThreshold(operatorId: string) {
    const threshold = Number(thresholdDraft[operatorId]);
    if (Number.isNaN(threshold) || threshold < 0) return;
    const res = await apiFetch("/api/platform/express", {
      method: "POST",
      body: JSON.stringify({ action: "updateThreshold", operatorId, threshold }),
    });
    if (res.ok) {
      setFeedback(`Soglia aggiornata per operatore`);
      load();
    }
  }

  async function saveOperator() {
    if (!operatorDialog?.name?.trim()) return;
    const res = await apiFetch("/api/platform/express", {
      method: "POST",
      body: JSON.stringify({
        action: operatorDialog.id ? "updateOperator" : "createOperator",
        id: operatorDialog.id,
        name: operatorDialog.name,
        reorderThreshold: operatorDialog.reorderThreshold,
      }),
    });
    if (res.ok) {
      setOperatorDialog(null);
      setFeedback(operatorDialog.id ? "Operatore aggiornato" : "Operatore creato");
      load();
    }
  }

  async function saveCampaign() {
    if (!campaignDialog?.name?.trim()) return;
    setCampaignSaving(true);
    const res = await apiFetch("/api/platform/express", {
      method: "POST",
      body: JSON.stringify({
        action: "upsertCampaign",
        id: campaignDialog.id,
        name: campaignDialog.name,
        type: campaignDialog.type || "Fixed",
        value: Number(campaignDialog.value ?? 0),
        active: campaignDialog.active ?? true,
      }),
    });
    setCampaignSaving(false);
    if (res.ok) {
      setCampaignDialog(null);
      load();
    }
  }

  if (!settings) {
    return <Typography color="text.secondary">Caricamento impostazioni…</Typography>;
  }

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
        <SettingsIcon sx={{ color: serviceColor, fontSize: 32 }} />
        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: "1.25rem" }}>Impostazioni Express</Typography>
          <Typography variant="body2" color="text.secondary">
            Parametri cassa, soglie stock e campagne sconto
          </Typography>
        </Box>
      </Box>

      {feedback && (
        <Alert severity="info" sx={{ mb: 2 }} onClose={() => setFeedback("")}>
          {feedback}
        </Alert>
      )}

      <Card variant="outlined" sx={{ mb: 3, borderColor: alpha(serviceColor, 0.3) }}>
        <CardContent>
          <Typography sx={{ fontWeight: 700, mb: 2 }}>Parametri generali</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="IVA prodotti %"
                value={settings.default_vat}
                onChange={(e) => setSettings({ ...settings, default_vat: Number(e.target.value) })}
                helperText="Applicata solo ai prodotti a catalogo"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="IVA SIM e servizi %"
                value={settings.sim_vat}
                onChange={(e) => setSettings({ ...settings, sim_vat: Number(e.target.value) })}
                helperText="Di solito 0% (art. 74 DPR 633/72)"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Prezzo SIM predefinito €"
                value={settings.sim_price_default}
                onChange={(e) => setSettings({ ...settings, sim_price_default: Number(e.target.value) })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Soglia alert stock globale"
                value={settings.stock_alert_threshold}
                onChange={(e) =>
                  setSettings({ ...settings, stock_alert_threshold: Number(e.target.value) })
                }
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Metodi pagamento (separati da virgola)"
                value={paymentMethodsText}
                onChange={(e) => setPaymentMethodsText(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                size="small"
                select
                label="Metodo pagamento predefinito"
                value={settings.default_payment_method}
                onChange={(e) => setSettings({ ...settings, default_payment_method: e.target.value })}
              >
                {paymentMethodsText
                  .split(",")
                  .map((m) => m.trim())
                  .filter(Boolean)
                  .map((m) => (
                    <MenuItem key={m} value={m}>
                      {m}
                    </MenuItem>
                  ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Typography sx={{ fontWeight: 700, mb: 1.5, mt: 1 }}>Intestazione negozio (ricevuta 80mm)</Typography>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                size="small"
                label="Nome negozio"
                value={settings.store_name}
                onChange={(e) => setSettings({ ...settings, store_name: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Indirizzo"
                value={settings.store_address}
                onChange={(e) => setSettings({ ...settings, store_address: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Città / CAP"
                value={settings.store_city}
                onChange={(e) => setSettings({ ...settings, store_city: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                size="small"
                label="P.IVA"
                value={settings.store_vat}
                onChange={(e) => setSettings({ ...settings, store_vat: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                size="small"
                label="Telefono"
                value={settings.store_phone}
                onChange={(e) => setSettings({ ...settings, store_phone: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                size="small"
                label="Email"
                value={settings.store_email}
                onChange={(e) => setSettings({ ...settings, store_email: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                size="small"
                label="Footer ricevuta"
                value={settings.receipt_footer}
                onChange={(e) => setSettings({ ...settings, receipt_footer: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                size="small"
                multiline
                minRows={2}
                label="Nota fiscale ricevuta"
                value={settings.tax_note}
                onChange={(e) => setSettings({ ...settings, tax_note: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={settings.notify_on_sale}
                    onChange={(e) => setSettings({ ...settings, notify_on_sale: e.target.checked })}
                  />
                }
                label="Notifica operatore alla registrazione vendita"
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 1, mb: 0.5 }}>
                Integrazioni con altri moduli
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={settings.loyalty_on_sale ?? true}
                    onChange={(e) => setSettings({ ...settings, loyalty_on_sale: e.target.checked })}
                  />
                }
                label="Accredita punti fedeltà (se cliente selezionato)"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Punti per SIM"
                value={settings.loyalty_points_per_sim ?? 10}
                onChange={(e) =>
                  setSettings({ ...settings, loyalty_points_per_sim: Number(e.target.value) })
                }
              />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Punti per € speso"
                value={settings.loyalty_points_per_euro ?? 0}
                onChange={(e) =>
                  setSettings({ ...settings, loyalty_points_per_euro: Number(e.target.value) })
                }
                helperText="0 = disattivato"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={settings.ticket_on_sim_sale ?? true}
                    onChange={(e) => setSettings({ ...settings, ticket_on_sim_sale: e.target.checked })}
                  />
                }
                label="Crea ticket attivazione SIM in /tickets"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={settings.notify_staff_on_sale ?? true}
                    onChange={(e) =>
                      setSettings({ ...settings, notify_staff_on_sale: e.target.checked })
                    }
                  />
                }
                label="Notifica staff (Centrale + team)"
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={settings.allow_negative_margin ?? false}
                    onChange={(e) =>
                      setSettings({ ...settings, allow_negative_margin: e.target.checked })
                    }
                  />
                }
                label="Consenti margine negativo (sconti oltre il prezzo riga)"
              />
            </Grid>
          </Grid>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={saveSettings}
            disabled={saving}
            sx={{ mt: 2, background: serviceColor }}
          >
            {saving ? "Salvataggio…" : "Salva impostazioni"}
          </Button>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ mb: 3, borderColor: alpha(serviceColor, 0.3) }}>
        <CardContent>
          <Typography sx={{ fontWeight: 700, mb: 0.5 }}>Logo negozio (ricevuta 80mm)</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Carica il logo del negozio: verrà stampato in cima alla ricevuta termica, sopra il nome.
            Formati PNG, JPG o WebP — consigliato sfondo bianco o trasparente.
          </Typography>

          {logoError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setLogoError("")}>
              {logoError}
            </Alert>
          )}

          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: 3,
              alignItems: "flex-start",
            }}
          >
            <Box
              sx={{
                width: 280,
                minHeight: 120,
                borderRadius: 2,
                border: "1px dashed",
                borderColor: alpha(serviceColor, 0.45),
                bgcolor: alpha(serviceColor, 0.04),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                p: 2,
              }}
            >
              {settings.store_logo ? (
                <Box
                  component="img"
                  src={settings.store_logo}
                  alt="Logo negozio"
                  sx={{ maxWidth: "100%", maxHeight: 100, objectFit: "contain" }}
                />
              ) : (
                <Box sx={{ textAlign: "center", color: "text.secondary" }}>
                  <ImageIcon sx={{ fontSize: 40, mb: 1, opacity: 0.5 }} />
                  <Typography variant="body2">Nessun logo caricato</Typography>
                </Box>
              )}
            </Box>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                hidden
                onChange={(e) => void handleLogoFile(e.target.files?.[0] ?? null)}
              />
              <Button
                variant="contained"
                startIcon={<ImageIcon />}
                disabled={logoUploading}
                onClick={() => logoInputRef.current?.click()}
                sx={{ background: serviceColor, alignSelf: "flex-start" }}
              >
                {logoUploading ? "Caricamento…" : settings.store_logo ? "Sostituisci logo" : "Carica logo"}
              </Button>
              {settings.store_logo && (
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteOutlinedIcon />}
                  disabled={logoUploading}
                  onClick={() => void removeLogo()}
                  sx={{ alignSelf: "flex-start" }}
                >
                  Rimuovi logo
                </Button>
              )}
              <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 320 }}>
                L&apos;immagine viene ridimensionata automaticamente per la stampa termica (max 240px).
                Il salvataggio del logo è immediato.
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Typography sx={{ fontWeight: 700 }}>Operatori telefonici</Typography>
            <Button size="small" startIcon={<AddIcon />} onClick={() => setOperatorDialog({ name: "", reorderThreshold: 10 })}>
              Nuovo operatore
            </Button>
          </Box>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Operatore</TableCell>
                <TableCell>Stock attuale</TableCell>
                <TableCell>Soglia riordino</TableCell>
                <TableCell align="right">Azioni</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {operators.map((op) => (
                <TableRow key={op.id}>
                  <TableCell>{op.name}</TableCell>
                  <TableCell>{op._count?.iccidStock ?? 0}</TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      type="number"
                      value={thresholdDraft[op.id] ?? op.reorderThreshold}
                      onChange={(e) =>
                        setThresholdDraft((d) => ({ ...d, [op.id]: e.target.value }))
                      }
                      sx={{ width: 100 }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => saveThreshold(op.id)} aria-label="Salva soglia">
                      <SaveIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() =>
                        setOperatorDialog({ id: op.id, name: op.name, reorderThreshold: op.reorderThreshold })
                      }
                      aria-label="Modifica operatore"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Typography sx={{ fontWeight: 700 }}>Campagne sconto</Typography>
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={() => setCampaignDialog(emptyCampaign())}
              sx={{ color: serviceColor }}
            >
              Nuova campagna
            </Button>
          </Box>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Nome</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Valore</TableCell>
                <TableCell>Stato</TableCell>
                <TableCell align="right">Azioni</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {campaigns.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{c.name}</TableCell>
                  <TableCell>{c.type}</TableCell>
                  <TableCell>
                    {c.type === "Percent" ? `${Number(c.value)}%` : money(c.value)}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={c.active ? "Attiva" : "Disattiva"}
                      size="small"
                      color={c.active ? "success" : "default"}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => setCampaignDialog({ ...c, value: Number(c.value) })}
                      aria-label="Modifica campagna"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={async () => {
                        if (!confirm("Eliminare questa campagna?")) return;
                        await apiFetch("/api/platform/express", {
                          method: "POST",
                          body: JSON.stringify({ action: "deleteCampaign", id: c.id }),
                        });
                        load();
                      }}
                      aria-label="Elimina campagna"
                    >
                      <DeleteOutlinedIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {campaignDialog && (
        <Box
          sx={{
            position: "fixed",
            inset: 0,
            bgcolor: backdrop,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1300,
          }}
          onClick={() => setCampaignDialog(null)}
        >
          <Card sx={{ width: 400, maxWidth: "95vw" }} onClick={(e) => e.stopPropagation()}>
            <CardContent>
              <Typography sx={{ fontWeight: 700, mb: 2 }}>
                {campaignDialog.id ? "Modifica campagna" : "Nuova campagna"}
              </Typography>
              <TextField
                fullWidth
                size="small"
                label="Nome"
                value={campaignDialog.name || ""}
                onChange={(e) => setCampaignDialog({ ...campaignDialog, name: e.target.value })}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                size="small"
                select
                label="Tipo"
                value={campaignDialog.type || "Fixed"}
                onChange={(e) => setCampaignDialog({ ...campaignDialog, type: e.target.value })}
                sx={{ mb: 2 }}
              >
                <MenuItem value="Fixed">Fisso (€)</MenuItem>
                <MenuItem value="Percent">Percentuale (%)</MenuItem>
              </TextField>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Valore"
                value={campaignDialog.value ?? 0}
                onChange={(e) =>
                  setCampaignDialog({ ...campaignDialog, value: Number(e.target.value) })
                }
                sx={{ mb: 2 }}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={campaignDialog.active ?? true}
                    onChange={(e) => setCampaignDialog({ ...campaignDialog, active: e.target.checked })}
                  />
                }
                label="Campagna attiva"
              />
              <Box sx={{ display: "flex", gap: 1, mt: 2, justifyContent: "flex-end" }}>
                <Button onClick={() => setCampaignDialog(null)}>Annulla</Button>
                <Button
                  variant="contained"
                  onClick={saveCampaign}
                  disabled={campaignSaving}
                  sx={{ background: serviceColor }}
                >
                  {campaignSaving ? "Salvataggio…" : "Salva"}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}

      {operatorDialog && (
        <Box
          sx={{
            position: "fixed",
            inset: 0,
            bgcolor: backdrop,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1300,
          }}
          onClick={() => setOperatorDialog(null)}
        >
          <Card sx={{ width: 360, m: 2 }} onClick={(e) => e.stopPropagation()}>
            <CardContent>
              <Typography sx={{ fontWeight: 700, mb: 2 }}>
                {operatorDialog.id ? "Modifica operatore" : "Nuovo operatore"}
              </Typography>
              <TextField
                fullWidth
                size="small"
                label="Nome"
                value={operatorDialog.name}
                onChange={(e) => setOperatorDialog({ ...operatorDialog, name: e.target.value })}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Soglia riordino"
                value={operatorDialog.reorderThreshold}
                onChange={(e) =>
                  setOperatorDialog({ ...operatorDialog, reorderThreshold: Number(e.target.value) })
                }
                sx={{ mb: 2 }}
              />
              <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
                <Button onClick={() => setOperatorDialog(null)}>Annulla</Button>
                <Button variant="contained" onClick={saveOperator} sx={{ background: serviceColor }}>
                  Salva
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}
    </Box>
  );
}
