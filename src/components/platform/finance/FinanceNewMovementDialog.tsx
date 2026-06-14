"use client";

import { useEffect, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
  Button, Stack, ToggleButton, ToggleButtonGroup, Box, Typography, alpha,
} from "@mui/material";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import ClientPicker from "../ClientPicker";
import { FINANCE_COLORS } from "./finance-utils";

export interface NewMovementForm {
  description: string;
  type: string;
  amount: string;
  method: string;
  status: string;
  dueDate: string;
  reference: string;
  notes: string;
  clientId: string;
  priceListItemId: string;
  quantity: string;
}

interface ListinoOption {
  id: string;
  name: string;
  clientPrice: number | string;
}

interface Props {
  open: boolean;
  saving: boolean;
  form: NewMovementForm;
  serviceColor: string;
  onChange: (form: NewMovementForm) => void;
  onClose: () => void;
  onSave: () => void;
}

const METHODS = ["Contanti", "POS", "Bonifico", "Assegno", "Carta", "Altro"];

export const EMPTY_MOVEMENT_FORM: NewMovementForm = {
  description: "",
  type: "ENTRATA",
  amount: "",
  method: "Contanti",
  status: "Pagato",
  dueDate: "",
  reference: "",
  notes: "",
  clientId: "",
  priceListItemId: "",
  quantity: "1",
};

export default function FinanceNewMovementDialog({
  open,
  saving,
  form,
  serviceColor,
  onChange,
  onClose,
  onSave,
}: Props) {
  const [listino, setListino] = useState<ListinoOption[]>([]);
  const isEntrata = form.type === "ENTRATA";
  const accent = isEntrata ? FINANCE_COLORS.entrate : FINANCE_COLORS.uscite;

  useEffect(() => {
    if (!open) return;
    fetch("/api/platform/listino")
      .then((r) => r.json())
      .then((d) => setListino(d.items || []))
      .catch(() => setListino([]));
  }, [open]);

  function selectListino(id: string) {
    const item = listino.find((l) => l.id === id);
    const qty = Number(form.quantity) || 1;
    onChange({
      ...form,
      priceListItemId: id,
      description: item ? item.name : form.description,
      amount: item ? String(Number(item.clientPrice) * qty) : form.amount,
    });
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: 3, overflow: "hidden" } } }}
    >
      <Box
        sx={{
          px: 3,
          py: 2.5,
          background: isEntrata
            ? `linear-gradient(135deg, ${alpha(FINANCE_COLORS.entrate, 0.15)} 0%, transparent 100%)`
            : `linear-gradient(135deg, ${alpha(FINANCE_COLORS.uscite, 0.15)} 0%, transparent 100%)`,
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <DialogTitle sx={{ p: 0, fontWeight: 800 }}>Nuovo movimento</DialogTitle>
        <Typography variant="caption" color="text.secondary">
          Registra un&apos;entrata o un&apos;uscita di cassa
        </Typography>
      </Box>
      <DialogContent sx={{ pt: 2.5 }}>
        <Stack spacing={2.5}>
          <ToggleButtonGroup
            exclusive
            fullWidth
            value={form.type}
            onChange={(_, v) => v && onChange({ ...form, type: v })}
            sx={{
              "& .MuiToggleButton-root": { py: 1.25, fontWeight: 700, border: `1px solid ${alpha(accent, 0.3)}` },
              "& .Mui-selected": { bgcolor: `${accent}18 !important`, color: `${accent} !important` },
            }}
          >
            <ToggleButton value="ENTRATA">
              <TrendingUpIcon sx={{ mr: 1, fontSize: 18 }} /> Entrata
            </ToggleButton>
            <ToggleButton value="USCITA">
              <TrendingDownIcon sx={{ mr: 1, fontSize: 18 }} /> Uscita
            </ToggleButton>
          </ToggleButtonGroup>

          {listino.length > 0 && (
            <TextField
              select
              label="Voce listino (opzionale)"
              size="small"
              fullWidth
              value={form.priceListItemId}
              onChange={(e) => selectListino(e.target.value)}
            >
              <MenuItem value="">— Manuale —</MenuItem>
              {listino.map((l) => (
                <MenuItem key={l.id} value={l.id}>{l.name}</MenuItem>
              ))}
            </TextField>
          )}

          <TextField
            label="Descrizione"
            size="small"
            fullWidth
            autoFocus
            value={form.description}
            onChange={(e) => onChange({ ...form, description: e.target.value })}
          />

          <Stack direction="row" spacing={1.5}>
            <TextField
              label="Importo €"
              size="small"
              type="number"
              fullWidth
              value={form.amount}
              onChange={(e) => onChange({ ...form, amount: e.target.value })}
              slotProps={{ input: { sx: { fontWeight: 700, fontSize: "1.1rem" } } }}
            />
            {form.priceListItemId && (
              <TextField
                label="Qtà"
                size="small"
                type="number"
                sx={{ width: 90 }}
                value={form.quantity}
                onChange={(e) => {
                  const qty = e.target.value;
                  const item = listino.find((l) => l.id === form.priceListItemId);
                  onChange({
                    ...form,
                    quantity: qty,
                    amount: item ? String(Number(item.clientPrice) * (Number(qty) || 1)) : form.amount,
                  });
                }}
              />
            )}
          </Stack>

          <TextField
            select
            label="Metodo di pagamento"
            size="small"
            fullWidth
            value={form.method}
            onChange={(e) => onChange({ ...form, method: e.target.value })}
          >
            {METHODS.map((m) => (
              <MenuItem key={m} value={m}>{m}</MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Stato"
            size="small"
            fullWidth
            value={form.status}
            onChange={(e) => onChange({ ...form, status: e.target.value })}
          >
            <MenuItem value="Pagato">Pagato</MenuItem>
            <MenuItem value="In lavorazione">In lavorazione</MenuItem>
            <MenuItem value="Sospeso">Sospeso</MenuItem>
          </TextField>

          <TextField
            label="Scadenza"
            type="date"
            size="small"
            fullWidth
            value={form.dueDate}
            onChange={(e) => onChange({ ...form, dueDate: e.target.value })}
            slotProps={{ inputLabel: { shrink: true } }}
          />

          <TextField
            label="Riferimento"
            size="small"
            fullWidth
            value={form.reference}
            onChange={(e) => onChange({ ...form, reference: e.target.value })}
          />

          <TextField
            label="Note"
            size="small"
            fullWidth
            multiline
            minRows={2}
            value={form.notes}
            onChange={(e) => onChange({ ...form, notes: e.target.value })}
          />

          <ClientPicker value={form.clientId} onChange={(id) => onChange({ ...form, clientId: id })} label="Cliente (opzionale)" />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose}>Annulla</Button>
        <Button
          variant="contained"
          onClick={onSave}
          disabled={saving || !form.description.trim() || !form.amount}
          sx={{ bgcolor: accent, "&:hover": { bgcolor: accent, filter: "brightness(0.92)" } }}
        >
          {saving ? "Salvataggio…" : "Registra movimento"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
