"use client";

import {
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Button, Stack, Typography, Box, Alert, alpha,
} from "@mui/material";
import StopIcon from "@mui/icons-material/Stop";
import { FINANCE_COLORS, money } from "../finance/finance-utils";

interface Props {
  open: boolean;
  saving: boolean;
  closingAmount: string;
  closingNotes: string;
  expectedCash: number | null;
  serviceColor: string;
  onAmountChange: (v: string) => void;
  onNotesChange: (v: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

export default function CashRegisterCloseDialog({
  open,
  saving,
  closingAmount,
  closingNotes,
  expectedCash,
  serviceColor,
  onAmountChange,
  onNotesChange,
  onClose,
  onConfirm,
}: Props) {
  const canSubmit = closingAmount.trim() !== "" && Number(closingAmount) >= 0;
  const variance =
    expectedCash != null && closingAmount.trim() !== ""
      ? Number(closingAmount) - expectedCash
      : null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: 3, overflow: "hidden" } } }}
    >
      <Box
        sx={{
          px: 3,
          py: 2.5,
          background: `linear-gradient(135deg, ${alpha("#ef4444", 0.12)} 0%, transparent 100%)`,
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mb: 0.5 }}>
          <StopIcon sx={{ color: "#ef4444" }} />
          <DialogTitle sx={{ p: 0, fontWeight: 800 }}>Chiudi giornata</DialogTitle>
        </Box>
        <Typography variant="caption" color="text.secondary">
          Conta i contanti in cassetto e conferma la chiusura
        </Typography>
      </Box>
      <DialogContent sx={{ pt: 2.5 }}>
        <Stack spacing={2.5}>
          {expectedCash != null && (
            <Alert severity="info">
              Contanti attesi: <strong>{money(expectedCash)}</strong>
            </Alert>
          )}
          <TextField
            autoFocus
            label="Contanti contati €"
            type="number"
            size="small"
            fullWidth
            value={closingAmount}
            onChange={(e) => onAmountChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && canSubmit && !saving) onConfirm();
            }}
            slotProps={{
              input: {
                sx: { fontWeight: 700, fontSize: "1.15rem" },
                inputProps: { min: 0, step: "0.01" },
              },
            }}
          />
          {variance != null && variance !== 0 && (
            <Alert severity={Math.abs(variance) > 5 ? "warning" : "info"}>
              Scostamento: <strong>{money(variance)}</strong>
            </Alert>
          )}
          <TextField
            label="Note chiusura (opzionale)"
            size="small"
            fullWidth
            multiline
            minRows={2}
            value={closingNotes}
            onChange={(e) => onNotesChange(e.target.value)}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} disabled={saving}>Annulla</Button>
        <Button
          variant="contained"
          color="error"
          onClick={onConfirm}
          disabled={saving || !canSubmit}
          sx={{ fontWeight: 700 }}
        >
          {saving ? "Chiusura…" : "Chiudi e genera giornale"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
