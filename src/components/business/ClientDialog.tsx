"use client";

import { useEffect, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Grid, MenuItem, Select, FormControl,
  InputLabel, Chip, Box, Typography, CircularProgress, FormControlLabel, Switch,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import IconButton from "@mui/material/IconButton";
import { shellDialogPaperSx, dialogFormContentSx, dialogFormGridSx, dialogStaticLabelSx } from "@/theme/shell-tokens";
import ClientTypeFields from "./ClientTypeFields";
import {
  applyClientTypeChange,
  normalizeClientIdentity,
  validateClientForm,
  type ClientFormType,
} from "./client-form";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  clientId?: string;
}

const INITIAL = {
  name: "", companyName: "", email: "", phone: "", website: "",
  city: "", country: "IT", taxCode: "", vatNumber: "", type: "COMPANY" as ClientFormType,
  status: "ACTIVE", tags: [] as string[],
  morosityFlag: false, morosityScore: "OK", morosityNote: "",
};

const MOROSITY_OPTIONS = [
  { value: "OK", label: "OK" },
  { value: "ATTENZIONE", label: "Attenzione" },
  { value: "BLOCCATO", label: "Bloccato" },
];

export default function ClientDialog({ open, onClose, onSaved, clientId }: Props) {
  const [form, setForm] = useState(INITIAL);
  const [tagInput, setTagInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const isEdit = Boolean(clientId);

  useEffect(() => {
    if (!open) return;
    if (!clientId) {
      setForm(INITIAL);
      setError("");
      return;
    }
    setLoading(true);
    fetch(`/api/business/clienti/${clientId}`)
      .then((r) => r.json())
      .then((data) => {
        setForm({
          name: data.name || "",
          companyName: data.companyName || "",
          email: data.email || "",
          phone: data.phone || "",
          website: data.website || "",
          city: data.city || "",
          country: data.country || "IT",
          taxCode: data.taxCode || "",
          vatNumber: data.vatNumber || "",
          type: (data.type || "COMPANY") as ClientFormType,
          status: data.status || "ACTIVE",
          tags: data.tags || [],
          morosityFlag: Boolean(data.morosityFlag),
          morosityScore: data.morosityScore || "OK",
          morosityNote: data.morosityNote || "",
        });
      })
      .finally(() => setLoading(false));
  }, [open, clientId]);

  function set(key: string, value: string | boolean | string[]) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  function handleTypeChange(nextType: ClientFormType) {
    setForm((f) => applyClientTypeChange(f, nextType));
    setError("");
  }

  function handleIdentityFieldChange(
    field: "name" | "companyName" | "taxCode" | "vatNumber",
    value: string
  ) {
    set(field, value);
  }

  function addTag() {
    const t = tagInput.trim().toLowerCase();
    if (t && !form.tags.includes(t)) setForm((p) => ({ ...p, tags: [...p.tags, t] }));
    setTagInput("");
  }

  function removeTag(tag: string) {
    setForm((p) => ({ ...p, tags: p.tags.filter((t) => t !== tag) }));
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
    const payload = { ...form, ...identity };

    try {
      const res = await fetch(
        isEdit ? `/api/business/clienti/${clientId}` : "/api/business/clienti",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Errore durante il salvataggio");
      }
      onSaved();
      onClose();
      if (!isEdit) setForm(INITIAL);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Errore durante il salvataggio");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{ paper: { sx: shellDialogPaperSx } }}
    >
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pb: 1 }}>
        <Typography sx={{ fontWeight: 700, fontSize: "1.1rem" }}>{isEdit ? "Modifica cliente" : "Nuovo cliente"}</Typography>
        <IconButton size="small" onClick={onClose} sx={{ color: "text.secondary" }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={dialogFormContentSx}>
        {error && <Typography color="error" sx={{ mb: 2, fontSize: "0.825rem" }}>{error}</Typography>}

        <Grid container spacing={2} sx={dialogFormGridSx}>
          <ClientTypeFields
            type={form.type}
            onTypeChange={handleTypeChange}
            name={form.name}
            companyName={form.companyName}
            taxCode={form.taxCode}
            vatNumber={form.vatNumber}
            onFieldChange={handleIdentityFieldChange}
            layout="grid"
            autoFocus={!isEdit}
          />

          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth size="small" label="Email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth size="small" label="Telefono" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth size="small" label="Sito web" value={form.website} onChange={(e) => set("website", e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth size="small" label="Città" value={form.city} onChange={(e) => set("city", e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Stato</InputLabel>
              <Select value={form.status} label="Stato" onChange={(e) => set("status", e.target.value)}>
                <MenuItem value="ACTIVE">Attivo</MenuItem>
                <MenuItem value="PROSPECT">Prospect</MenuItem>
                <MenuItem value="INACTIVE">Inattivo</MenuItem>
                <MenuItem value="CHURNED">Perso</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid size={12}>
            <FormControlLabel
              control={<Switch checked={form.morosityFlag} onChange={(e) => set("morosityFlag", e.target.checked)} />}
              label="Flag morosità attivo"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Score morosità</InputLabel>
              <Select value={form.morosityScore} label="Score morosità" onChange={(e) => set("morosityScore", e.target.value)}>
                {MOROSITY_OPTIONS.map((o) => (
                  <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={12}>
            <TextField
              fullWidth
              size="small"
              label="Note morosità"
              value={form.morosityNote}
              onChange={(e) => set("morosityNote", e.target.value)}
              multiline
              rows={2}
            />
          </Grid>

          <Grid size={12}>
            <Box sx={{ display: "flex", gap: 1, mb: 1, flexWrap: "wrap" }}>
              {form.tags.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  size="small"
                  onDelete={() => removeTag(tag)}
                  sx={{ background: "rgba(99,102,241,0.1)", color: "primary.light", fontSize: "0.7rem" }}
                />
              ))}
            </Box>
            <TextField
              fullWidth
              size="small"
              label="Aggiungi tag"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
              placeholder="Premi Enter per aggiungere"
            />
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button onClick={onClose} sx={{ color: "text.secondary" }}>Annulla</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading}
          sx={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", "&:hover": { background: "linear-gradient(135deg, #4f46e5, #7c3aed)" } }}
        >
          {loading ? <CircularProgress size={18} sx={{ color: "#fff" }} /> : isEdit ? "Salva" : "Crea cliente"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
