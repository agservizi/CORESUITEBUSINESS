"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
  CircularProgress,
  FormControlLabel,
  Checkbox,
  alpha,
} from "@mui/material";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import SecurityIcon from "@mui/icons-material/Security";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { useTheme } from "@mui/material/styles";
import { getShellTokens, mergeShellSx, shellPanelSx } from "@/theme/shell-tokens";
import ThemeModeToggle from "@/components/layout/ThemeModeToggle";
import LoginBrandPanel from "@/components/auth/LoginBrandPanel";
import HubAmbientBackground from "@/components/hub/HubAmbientBackground";
import { hubFadeUp } from "@/lib/hub-motion";

const GRADIENT = "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)";

export default function LoginPageView() {
  const theme = useTheme();
  const reduce = useReducedMotion();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaToken, setMfaToken] = useState("");
  const [mfaCode, setMfaCode] = useState("");

  async function completeLogin(payload: Record<string, unknown>) {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    const data = text ? JSON.parse(text) : {};
    return { res, data };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { res, data } = await completeLogin({
        email,
        password,
        rememberMe,
        ...(mfaRequired ? { mfaToken, mfaCode, rememberMe } : {}),
      });

      if (!res.ok) {
        setError(data.error || "Credenziali non valide");
        return;
      }

      if (data.mfaRequired) {
        setMfaRequired(true);
        setMfaToken(data.mfaToken);
        return;
      }

      router.push(data.redirectTo || "/dashboard");
      router.refresh();
    } catch {
      setError("Errore di connessione. Riprova.");
    } finally {
      setLoading(false);
    }
  }

  function backToCredentials() {
    setMfaRequired(false);
    setMfaToken("");
    setMfaCode("");
    setError("");
  }

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", bgcolor: theme.palette.background.default }}>
      <LoginBrandPanel />

      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          position: "relative",
          overflow: "hidden",
          minHeight: "100vh",
        }}
      >
        <Box sx={{ display: { xs: "block", md: "none" }, position: "absolute", inset: 0, pointerEvents: "none" }}>
          <HubAmbientBackground />
        </Box>

        <Box sx={{ position: "absolute", top: 16, right: 16, zIndex: 10 }}>
          <ThemeModeToggle />
        </Box>

        <Box
          sx={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            p: { xs: 2.5, sm: 4 },
            position: "relative",
            zIndex: 1,
          }}
        >
          <Box
            component={motion.div}
            variants={reduce ? undefined : hubFadeUp}
            initial={reduce ? undefined : "hidden"}
            animate={reduce ? undefined : "show"}
            sx={{ width: "100%", maxWidth: 440 }}
          >
            <Box sx={{ textAlign: "center", mb: 3, display: { md: "none" } }}>
              <Box
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 56,
                  height: 56,
                  borderRadius: 2.5,
                  background: GRADIENT,
                  mb: 1.5,
                  boxShadow: `0 12px 40px ${alpha("#6366f1", 0.35)}`,
                }}
              >
                <Typography sx={{ fontSize: 26, fontWeight: 900, color: "#fff" }}>C</Typography>
              </Box>
              <Typography sx={{ fontWeight: 800, fontSize: "1.2rem" }}>Coresuite</Typography>
            </Box>

            <Box
              sx={{
                mb: 3,
                display: { xs: "block", md: "block" },
                textAlign: { md: "left" },
              }}
            >
              <Typography
                sx={{
                  fontWeight: 800,
                  fontSize: { xs: "1.5rem", md: "1.75rem" },
                  letterSpacing: "-0.02em",
                  mb: 0.5,
                }}
              >
                {mfaRequired ? "Verifica identità" : "Bentornato"}
              </Typography>
              <Typography color="text.secondary">
                {mfaRequired
                  ? "Inserisci il codice dalla tua app authenticator"
                  : "Accedi al tuo hub di servizi"}
              </Typography>
            </Box>

            <Box
              component="form"
              onSubmit={handleSubmit}
              sx={mergeShellSx(shellPanelSx, {
                p: { xs: 3, sm: 4 },
                borderRadius: 3,
                backdropFilter: "blur(24px)",
                boxShadow: (t) =>
                  t.palette.mode === "dark"
                    ? `0 24px 64px rgba(0,0,0,0.45), 0 0 0 1px ${alpha("#6366f1", 0.15)}`
                    : `0 24px 64px rgba(99,102,241,0.12), 0 0 0 1px ${alpha("#6366f1", 0.08)}`,
                borderTop: "3px solid #6366f1",
              })}
            >
              <AnimatePresence mode="wait">
                {error && (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                  >
                    <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>
                      {error}
                    </Alert>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence mode="wait">
                <motion.div
                  key={mfaRequired ? "mfa" : "login"}
                  initial={reduce ? undefined : { opacity: 0, x: mfaRequired ? 16 : -16 }}
                  animate={reduce ? undefined : { opacity: 1, x: 0 }}
                  exit={reduce ? undefined : { opacity: 0, x: mfaRequired ? -16 : 16 }}
                  transition={{ duration: 0.28 }}
                >
                  {!mfaRequired ? (
                    <>
                      <TextField
                        fullWidth
                        label="Email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                        sx={{ mb: 2 }}
                        slotProps={{
                          input: {
                            startAdornment: (
                              <InputAdornment position="start">
                                <EmailOutlinedIcon sx={{ color: "text.secondary", fontSize: 20 }} />
                              </InputAdornment>
                            ),
                          },
                        }}
                      />

                      <TextField
                        fullWidth
                        label="Password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                        sx={{ mb: 1.5 }}
                        slotProps={{
                          input: {
                            startAdornment: (
                              <InputAdornment position="start">
                                <LockOutlinedIcon sx={{ color: "text.secondary", fontSize: 20 }} />
                              </InputAdornment>
                            ),
                            endAdornment: (
                              <InputAdornment position="end">
                                <IconButton
                                  onClick={() => setShowPassword(!showPassword)}
                                  edge="end"
                                  size="small"
                                  sx={{ color: "text.secondary" }}
                                >
                                  {showPassword ? (
                                    <VisibilityOffOutlinedIcon fontSize="small" />
                                  ) : (
                                    <VisibilityOutlinedIcon fontSize="small" />
                                  )}
                                </IconButton>
                              </InputAdornment>
                            ),
                          },
                        }}
                      />

                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            size="small"
                            sx={{
                              color: alpha("#6366f1", 0.6),
                              "&.Mui-checked": { color: "#6366f1" },
                            }}
                          />
                        }
                        label={
                          <Typography variant="body2" color="text.secondary">
                            Ricordami per 30 giorni
                          </Typography>
                        }
                        sx={{ mb: 2.5, display: "block" }}
                      />
                    </>
                  ) : (
                    <>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Codice a 6 cifre per <strong>{email}</strong>
                      </Typography>
                      <TextField
                        fullWidth
                        label="Codice MFA"
                        value={mfaCode}
                        onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        required
                        autoFocus
                        sx={{ mb: 2 }}
                        slotProps={{
                          htmlInput: {
                            inputMode: "numeric",
                            style: { letterSpacing: "0.35em", fontWeight: 700, textAlign: "center" },
                          },
                          input: {
                            startAdornment: (
                              <InputAdornment position="start">
                                <SecurityIcon sx={{ color: "#10b981", fontSize: 20 }} />
                              </InputAdornment>
                            ),
                          },
                        }}
                      />
                      <Button type="button" size="small" onClick={backToCredentials} sx={{ mb: 2.5 }}>
                        ← Torna al login
                      </Button>
                    </>
                  )}
                </motion.div>
              </AnimatePresence>

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading || (mfaRequired && mfaCode.length !== 6)}
                endIcon={!loading && !mfaRequired ? <ArrowForwardIcon /> : undefined}
                sx={{
                  py: 1.5,
                  fontWeight: 700,
                  fontSize: "0.95rem",
                  background: GRADIENT,
                  boxShadow: `0 8px 28px ${alpha("#6366f1", 0.4)}`,
                  "&:hover": {
                    background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
                    boxShadow: `0 10px 32px ${alpha("#6366f1", 0.5)}`,
                  },
                }}
              >
                {loading ? (
                  <CircularProgress size={22} sx={{ color: "#fff" }} />
                ) : mfaRequired ? (
                  "Verifica codice"
                ) : (
                  "Entra in Coresuite"
                )}
              </Button>
            </Box>

            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", textAlign: "center", mt: 3 }}
            >
              © {new Date().getFullYear()} Coresuite
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
