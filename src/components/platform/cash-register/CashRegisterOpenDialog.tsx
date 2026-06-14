"use client";

import {
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Button, Stack, Typography, Box, alpha,
} from "@mui/material";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import { FINANCE_COLORS } from "../finance/finance-utils";

interface Props {
  open: boolean;
  saving: boolean;
  openingAmount: string;
  openingNotes: string;
  serviceColor: string;
  onAmountChange: (v: string) => void;
  onNotesChange: (v: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

export default function CashRegisterOpenDialog({
  open,
  saving,
  openingAmount,
  openingNotes,
  serviceColor,
  onAmountChange,
  onNotesChange,
  onClose,
  onConfirm,
}: Props) {
  const canSubmit = openingAmount.trim() !== "" && Number(openingAmount) >= 0;

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
          background: `linear-gradient(135deg, ${alpha(FINANCE_COLORS.cash, 0.18)} 0%, transparent 100%)`,
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mb: 0.5 }}>
          <AccountBalanceWalletIcon sx={{ color: FINANCE_COLORS.cash }} />
          <DialogTitle sx={{ p: 0, fontWeight: 800 }}>Apri cassa</DialogTitle>
        </Box>
        <Typography variant="caption" color="text.secondary">
          Inserisci il fondo contanti con cui inizi la giornata
        </Typography>
      </Box>
      <DialogContent sx={{ pt: 2.5 }}>
        <Stack spacing={2.5}>
          <TextField
            autoFocus
            label="Fondo cassa €"
            type="number"
            size="small"
            fullWidth
            value={openingAmount}
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
          <TextField
            label="Note (opzionale)"
            size="small"
            fullWidth
            multiline
            minRows={2}
            value={openingNotes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Es. banconote da 50€, monete…"
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} disabled={saving}>Annulla</Button>
        <Button
          variant="contained"
          onClick={onConfirm}
          disabled={saving || !canSubmit}
          sx={{
            bgcolor: serviceColor,
            fontWeight: 700,
            "&:hover": { bgcolor: serviceColor, filter: "brightness(0.92)" },
          }}
        >
          {saving ? "Apertura…" : "Apri giornata"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
