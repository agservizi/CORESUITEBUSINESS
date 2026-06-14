"use client";

import { useState, useEffect } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  TextField, Grid, MenuItem, Select, FormControl, InputLabel,
  Typography, CircularProgress, IconButton, Box,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { AppDateField } from "@/components/layout/app-shell";
import ClientPicker from "@/components/platform/ClientPicker";
import { shellDialogPaperSx, dialogFormContentSx, dialogFormGridSx, dialogStaticLabelSx } from "@/theme/shell-tokens";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const INITIAL = {
  title: "", contactName: "", contactEmail: "", contactPhone: "",
  source: "OTHER", priority: "MEDIUM", value: "", expectedClose: "",
  clientId: "", stageId: "",
};

export default function NewLeadDialog({ open, onClose, onCreated }: Props) {
  const [form, setForm] = useState(INITIAL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [stages, setStages] = useState<{ id: string; name: string; color: string }[]>([]);
  const [pipelineId, setPipelineId] = useState<string | undefined>();

  useEffect(() => {
    if (open) {
      fetch("/api/business/pipeline")
        .then((r) => r.json())
        .then((data) => {
          const defaultPipeline = data.find((p: { isDefault: boolean; stages: { id: string; name: string; color: string }[] }) => p.isDefault) || data[0];
          if (defaultPipeline) {
            setPipelineId(defaultPipeline.id);
            setStages(defaultPipeline.stages);
            setForm((prev) => ({
              ...prev,
              stageId: prev.stageId || defaultPipeline.stages[0]?.id || "",
            }));
          }
        });
    } else {
      setForm(INITIAL);
      setError("");
    }
  }, [open]);

  function set(key: string, value: string) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  async function handleSubmit() {
    if (!form.title.trim()) { setError("Il titolo è obbligatorio"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/business/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          value: form.value ? parseFloat(form.value) : undefined,
          stageId: form.stageId || undefined,
          pipelineId: pipelineId || undefined,
          clientId: form.clientId || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Errore durante la creazione");
      }
      onCreated();
      onClose();
      setForm(INITIAL);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Errore durante la creazione");
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
        <Typography sx={{ fontWeight: 700, fontSize: "1.1rem" }}>Nuovo lead</Typography>
        <IconButton size="small" onClick={onClose} sx={{ color: "text.secondary" }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={dialogFormContentSx}>
        {error && <Typography color="error" sx={{ mb: 2, fontSize: "0.825rem" }}>{error}</Typography>}

        <Grid container spacing={2} sx={dialogFormGridSx}>
          <Grid size={12}>
            <Typography component="label" htmlFor="lead-title" sx={dialogStaticLabelSx}>
              Titolo *
            </Typography>
            <TextField
              id="lead-title"
              fullWidth
              size="small"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              autoFocus
            />
          </Grid>
          <Grid size={12}>
            <ClientPicker value={form.clientId} onChange={(clientId) => set("clientId", clientId)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth size="small" label="Nome contatto" value={form.contactName} onChange={(e) => set("contactName", e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth size="small" label="Email contatto" type="email" value={form.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Fonte</InputLabel>
              <Select value={form.source} label="Fonte" onChange={(e) => set("source", e.target.value)}>
                <MenuItem value="WEBSITE">Sito web</MenuItem>
                <MenuItem value="REFERRAL">Referral</MenuItem>
                <MenuItem value="SOCIAL">Social</MenuItem>
                <MenuItem value="EMAIL">Email</MenuItem>
                <MenuItem value="PHONE">Telefono</MenuItem>
                <MenuItem value="EVENT">Evento</MenuItem>
                <MenuItem value="OTHER">Altro</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Priorità</InputLabel>
              <Select value={form.priority} label="Priorità" onChange={(e) => set("priority", e.target.value)}>
                <MenuItem value="LOW">Bassa</MenuItem>
                <MenuItem value="MEDIUM">Media</MenuItem>
                <MenuItem value="HIGH">Alta</MenuItem>
                <MenuItem value="URGENT">Urgente</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth size="small" label="Valore (€)" type="number" value={form.value} onChange={(e) => set("value", e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <AppDateField
              fullWidth
              label="Chiusura prevista"
              value={form.expectedClose}
              onChange={(expectedClose) => set("expectedClose", expectedClose)}
            />
          </Grid>
          {stages.length > 0 && (
            <Grid size={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Stage pipeline</InputLabel>
                <Select value={form.stageId} label="Stage pipeline" onChange={(e) => set("stageId", e.target.value)}>
                  {stages.map((s) => (
                    <MenuItem key={s.id} value={s.id}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: "50%", background: s.color }} />
                        {s.name}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          )}
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
          {loading ? <CircularProgress size={18} sx={{ color: "#fff" }} /> : "Crea lead"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
