"use client";

import { useEffect, useState } from "react";
import { Box, Button, Typography, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { motion, AnimatePresence } from "framer-motion";
import { getShellTokens } from "@/theme/shell-tokens";

const STEPS = [
  {
    title: "Benvenuto nel tuo hub",
    body: "Qui coordini tutti i servizi AG Servizi. Usa la barra di ricerca o Ctrl+K per muoverti velocemente.",
  },
  {
    title: "Personalizza il workspace",
    body: "Fissa i servizi che usi di più, trascinali per riordinarli e scegli layout compatto o espanso.",
  },
  {
    title: "Apri il primo servizio",
    body: "La sezione Consigliato per te suggerisce azioni basate sul tuo ruolo e sugli alert operativi.",
  },
];

interface HubOnboardingTourProps {
  open: boolean;
  onComplete: () => void;
  onOpenFirstService?: () => void;
  onScrollToExplorer?: () => void;
}

export default function HubOnboardingTour({
  open,
  onComplete,
  onOpenFirstService,
  onScrollToExplorer,
}: HubOnboardingTourProps) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  const isLast = step === STEPS.length - 1;

  return (
    <AnimatePresence>
      {open && (
        <Box
          component={motion.div}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          sx={{
            position: "fixed",
            inset: 0,
            zIndex: 12000,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            p: { xs: 2, md: 4 },
            bgcolor: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(6px)",
          }}
        >
          <Box
            component={motion.div}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            sx={(theme) => {
              const t = getShellTokens(theme);
              return {
                width: "100%",
                maxWidth: 480,
                p: 3,
                borderRadius: 3,
                border: t.border,
                background: t.panel,
                backdropFilter: "blur(20px)",
                boxShadow: "0 24px 80px rgba(0,0,0,0.45)",
              };
            }}
          >
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
              <Typography variant="overline" color="primary.light" sx={{ letterSpacing: "0.12em" }}>
                Tour · {step + 1}/{STEPS.length}
              </Typography>
              <IconButton size="small" onClick={onComplete} aria-label="Chiudi tour">
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>

            <Box
              component={motion.div}
              key={step}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.28 }}
            >
              <Typography sx={{ fontWeight: 700, fontSize: "1.15rem", mb: 1 }}>
                {STEPS[step].title}
              </Typography>
              <Typography color="text.secondary" sx={{ fontSize: "0.9rem", mb: 2.5 }}>
                {STEPS[step].body}
              </Typography>
            </Box>

            <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
              <Button onClick={onComplete} color="inherit" sx={{ textTransform: "none" }}>
                Salta
              </Button>
              {!isLast ? (
                <Button
                  variant="contained"
                  onClick={() => {
                    if (step === 1) onScrollToExplorer?.();
                    setStep((s) => s + 1);
                  }}
                  sx={{ textTransform: "none" }}
                >
                  Avanti
                </Button>
              ) : (
                <Button
                  variant="contained"
                  onClick={() => {
                    onOpenFirstService?.();
                    onComplete();
                  }}
                  sx={{ textTransform: "none" }}
                >
                  Apri il tuo primo servizio
                </Button>
              )}
            </Box>
          </Box>
        </Box>
      )}
    </AnimatePresence>
  );
}
