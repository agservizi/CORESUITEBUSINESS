"use client";

import { useEffect, useState } from "react";
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Button,
  TextField,
  MenuItem,
  Divider,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import type { ModuleDefinition, ModuleField } from "@/config/platform-modules";
import { getModuleKeyFromApiPath, moduleSupportsPdf } from "@/lib/platform/client-modules";
import { jsonMutationHeaders } from "@/lib/csrf-client";
import { getShellTokens, shellDrawerPaperSx } from "@/theme/shell-tokens";

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: ModuleField;
  value: string;
  onChange: (v: string) => void;
}) {
  if (field.type === "select" && field.options) {
    return (
      <TextField
        select
        fullWidth
        size="small"
        label={field.label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {field.options.map((o) => (
          <MenuItem key={o.value} value={o.value}>
            {o.label}
          </MenuItem>
        ))}
      </TextField>
    );
  }

  const inputType =
    field.type === "number"
      ? "number"
      : field.type === "email"
        ? "email"
        : field.type === "date"
          ? "date"
          : field.type === "datetime"
            ? "datetime-local"
            : "text";

  return (
    <TextField
      fullWidth
      size="small"
      label={field.label}
      type={inputType}
      multiline={field.type === "textarea"}
      rows={field.type === "textarea" ? 3 : undefined}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

interface TicketMessage {
  id: string;
  authorName: string;
  body: string;
  createdAt: string;
  isInternal?: boolean;
}

interface ModuleDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  module: ModuleDefinition;
  recordId: string | null;
  serviceColor?: string;
  onUpdated: () => void;
  onDeleted: () => void;
}

export default function ModuleDetailDrawer({
  open,
  onClose,
  module,
  recordId,
  serviceColor = "#6366f1",
  onUpdated,
  onDeleted,
}: ModuleDetailDrawerProps) {
  const moduleKey = getModuleKeyFromApiPath(module.apiPath);
  const [item, setItem] = useState<Record<string, unknown> | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [messages, setMessages] = useState<TicketMessage[]>([]);

  const editFields = module.createFields;

  useEffect(() => {
    if (!open || !recordId) {
      setItem(null);
      return;
    }

    setLoading(true);
    fetch(`${module.apiPath}/${recordId}`)
      .then((r) => r.json())
      .then((data) => {
        const rec = data.item as Record<string, unknown>;
        setItem(rec);
        const initial: Record<string, string> = {};
        editFields.forEach((f) => {
          if (rec[f.key] != null) initial[f.key] = String(rec[f.key]);
        });
        if (rec.status != null) initial.status = String(rec.status);
        setForm(initial);
        if (moduleKey === "tickets" && Array.isArray(rec.messages)) {
          setMessages(rec.messages as TicketMessage[]);
        } else {
          setMessages([]);
        }
      })
      .finally(() => setLoading(false));
  }, [open, recordId, module.apiPath, moduleKey]);

  async function handleSave() {
    if (!recordId) return;
    setSaving(true);
    try {
      const res = await fetch(`${module.apiPath}/${recordId}`, {
        method: "PATCH",
        headers: jsonMutationHeaders(),
        body: JSON.stringify(form),
      });
      if (res.ok) {
        onUpdated();
        onClose();
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!recordId) return;
    setSaving(true);
    try {
      const res = await fetch(`${module.apiPath}/${recordId}`, {
        method: "DELETE",
        headers: jsonMutationHeaders(),
      });
      if (res.ok) {
        setConfirmDelete(false);
        onDeleted();
        onClose();
      }
    } finally {
      setSaving(false);
    }
  }

  const pdfUrl = recordId && moduleSupportsPdf(moduleKey)
    ? `${module.apiPath}/${recordId}/pdf`
    : null;

  return (
    <>
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        slotProps={{
          paper: {
            sx: [shellDrawerPaperSx, { width: { xs: "100%", sm: 440 } }],
          },
        }}
      >
        <Box sx={{ p: 2.5, height: "100%", display: "flex", flexDirection: "column" }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
            <Typography sx={{ fontWeight: 700, fontSize: "1.1rem" }}>
              Dettaglio {module.entityLabel.toLowerCase()}
            </Typography>
            <IconButton size="small" onClick={onClose}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
              <CircularProgress size={28} />
            </Box>
          ) : item ? (
            <>
              <Box sx={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", gap: 2 }}>
                {item.code != null && (
                  <Typography variant="caption" color="text.secondary">
                    Codice: {String(item.code)}
                  </Typography>
                )}

                {editFields.map((field) => (
                  <FieldInput
                    key={field.key}
                    field={field}
                    value={form[field.key] || ""}
                    onChange={(v) => setForm((p) => ({ ...p, [field.key]: v }))}
                  />
                ))}

                {form.status !== undefined && !editFields.some((f) => f.key === "status") && (
                  <TextField
                    fullWidth
                    size="small"
                    label="Stato"
                    value={form.status}
                    onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                  />
                )}

                {moduleKey === "tickets" && messages.length > 0 && (
                  <>
                    <Divider sx={(theme) => ({ borderColor: getShellTokens(theme).borderColor })} />
                    <Typography sx={{ fontWeight: 600, fontSize: "0.875rem" }}>Messaggi</Typography>
                    {messages.map((m) => (
                      <Box
                        key={m.id}
                        sx={(theme) => {
                          const t = getShellTokens(theme);
                          return {
                            p: 1.5,
                            borderRadius: 2,
                            background: t.hover,
                            border: t.border,
                          };
                        }}
                      >
                        <Typography sx={{ fontSize: "0.75rem", fontWeight: 600 }}>
                          {m.authorName}
                        </Typography>
                        <Typography sx={{ fontSize: "0.825rem", mt: 0.5, whiteSpace: "pre-wrap" }}>
                          {m.body}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(m.createdAt).toLocaleString("it-IT")}
                        </Typography>
                      </Box>
                    ))}
                  </>
                )}
              </Box>

              <Box sx={{ pt: 2, display: "flex", flexDirection: "column", gap: 1 }}>
                {pdfUrl && (
                  <Button
                    component="a"
                    href={pdfUrl}
                    target="_blank"
                    rel="noopener"
                    startIcon={<PictureAsPdfIcon />}
                    variant="outlined"
                    size="small"
                  >
                    Scarica PDF
                  </Button>
                )}
                <Box sx={{ display: "flex", gap: 1 }}>
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={handleSave}
                    disabled={saving}
                    sx={{ background: serviceColor }}
                  >
                    {saving ? "Salvataggio…" : "Salva"}
                  </Button>
                  <Button
                    color="error"
                    variant="outlined"
                    onClick={() => setConfirmDelete(true)}
                    disabled={saving}
                  >
                    <DeleteIcon fontSize="small" />
                  </Button>
                </Box>
              </Box>
            </>
          ) : (
            <Typography color="text.secondary">Record non trovato</Typography>
          )}
        </Box>
      </Drawer>

      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)}>
        <DialogTitle>Eliminare questo record?</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            L&apos;operazione non può essere annullata.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(false)}>Annulla</Button>
          <Button color="error" variant="contained" onClick={handleDelete} disabled={saving}>
            Elimina
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
