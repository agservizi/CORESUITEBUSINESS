"use client";

import { useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, MenuItem, CircularProgress, Typography,
} from "@mui/material";
import { getModuleDefinition } from "@/config/platform-modules";
import { jsonMutationHeaders } from "@/lib/csrf-client";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  serviceColor: string;
}

export default function TicketCreateDialog({ open, onClose, onSaved, serviceColor }: Props) {
  const module = getModuleDefinition("tickets")!;
  const [form, setForm] = useState<Record<string, string>>({ priority: "MEDIUM", type: "SUPPORT" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    if (!form.subject?.trim()) {
      setError("Inserisci l'oggetto del ticket");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/platform/tickets", {
        method: "POST",
        headers: jsonMutationHeaders(),
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore creazione");
      setForm({ priority: "MEDIUM", type: "SUPPORT" });
      onSaved();
      onClose();
      window.dispatchEvent(new CustomEvent("coresuite:data-mutated", { detail: { moduleKey: "tickets" } }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Nuovo ticket</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
        {module.createFields.map((field) => (
          <TextField
            key={field.key}
            fullWidth
            size="small"
            label={field.label}
            required={field.required}
            type={field.type === "email" ? "email" : "text"}
            select={field.type === "select"}
            value={form[field.key] ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
          >
            {field.options?.map((o) => (
              <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
            ))}
          </TextField>
        ))}
        {error && (
          <Typography sx={{ color: "error.main", fontSize: "0.875rem" }}>{error}</Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Annulla</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving}
          sx={{ bgcolor: serviceColor }}
        >
          {saving ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : "Crea ticket"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
