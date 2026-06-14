"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Typography,
  CircularProgress,
} from "@mui/material";
import { shellDialogPaperSx, dialogFormContentSx, dialogFormGridSx, dialogStaticLabelSx } from "@/theme/shell-tokens";
import type { ClientOption } from "./ClientPicker";
import ClientTypeFields from "@/components/business/ClientTypeFields";
import {
  applyClientTypeChange,
  guessClientTypeFromName,
  normalizeClientIdentity,
  validateClientForm,
  type ClientFormType,
} from "@/components/business/client-form";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (client: ClientOption) => void;
  initialName?: string;
  initialEmail?: string;
}

const INITIAL_FORM = {
  name: "",
  companyName: "",
  email: "",
  phone: "",
  taxCode: "",
  vatNumber: "",
  type: "INDIVIDUAL" as ClientFormType,
};

export default function QuickClientDialog({
  open,
  onClose,
  onCreated,
  initialName = "",
  initialEmail = "",
}: Props) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const trimmedName = initialName.trim();
    setForm({
      ...INITIAL_FORM,
      name: trimmedName,
      email: initialEmail.trim(),
      type: guessClientTypeFromName(trimmedName),
    });
    setError("");
  }, [open, initialName, initialEmail]);

  function setField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleTypeChange(nextType: ClientFormType) {
    setForm((f) => applyClientTypeChange(f, nextType));
    setError("");
  }

  function handleIdentityFieldChange(
    field: "name" | "companyName" | "taxCode" | "vatNumber",
    value: string
  ) {
    setField(field, value);
  }

  async function handleSubmit() {
    const validationError = validateClientForm(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError("");

    const identity = normalizeClientIdentity(form);
    const payload = {
      ...form,
      ...identity,
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      taxCode: form.taxCode.trim() || undefined,
      vatNumber: form.vatNumber.trim() || undefined,
      companyName: identity.companyName || undefined,
      status: "ACTIVE" as const,
    };

    try {
      const res = await fetch("/api/business/clienti", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Errore durante la creazione");
      }
      onCreated({
        id: data.id,
        name: data.name,
        companyName: data.companyName,
        email: data.email,
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore durante la creazione");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      slotProps={{ paper: { sx: shellDialogPaperSx } }}
    >
      <DialogTitle sx={{ fontWeight: 700, pb: 0.5 }}>Nuovo cliente</DialogTitle>
      <DialogContent sx={dialogFormContentSx}>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
          Crea il cliente al volo e usalo subito per l&apos;invio.
        </Typography>
        {error && (
          <Typography color="error" sx={{ mb: 1.5, fontSize: "0.825rem" }}>
            {error}
          </Typography>
        )}
        <Grid container spacing={2} sx={dialogFormGridSx}>
          <ClientTypeFields
            type={form.type}
            onTypeChange={handleTypeChange}
            name={form.name}
            companyName={form.companyName}
            taxCode={form.taxCode}
            vatNumber={form.vatNumber}
            onFieldChange={handleIdentityFieldChange}
            layout="stack"
            autoFocus
          />

          <Grid size={12}>
            <TextField
              fullWidth
              size="small"
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setField("email", e.target.value)}
              helperText="Usata come Reply-To negli invii per conto del cliente"
            />
          </Grid>
          <Grid size={12}>
            <TextField
              fullWidth
              size="small"
              label="Telefono"
              value={form.phone}
              onChange={(e) => setField("phone", e.target.value)}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ color: "text.secondary" }}>
          Annulla
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={loading}>
          {loading ? <CircularProgress size={18} /> : "Crea e seleziona"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
