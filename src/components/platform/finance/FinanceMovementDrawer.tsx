"use client";

import { useEffect, useState } from "react";
import {
  Box, Typography, Drawer, IconButton, Chip, Stack, Button, TextField,
  MenuItem, Divider, Alert, alpha,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import { useTheme } from "@mui/material/styles";
import { getShellTokens, shellDrawerPaperSx } from "@/theme/shell-tokens";
import { jsonMutationHeaders } from "@/lib/csrf-client";
import ClientPicker from "../ClientPicker";
import {
  money, movementStatusColor, typeColor, FINANCE_COLORS,
  isPaidStatus, type FinanceMovementRow,
} from "./finance-utils";

const METHODS = ["Contanti", "POS", "Bonifico", "Assegno", "Carta", "Altro"];
const STATUSES = ["Pagato", "In lavorazione", "Sospeso", "Annullato"];

interface Props {
  open: boolean;
  row: FinanceMovementRow | null;
  onClose: () => void;
  onUpdated?: (item: FinanceMovementRow) => void;
  onDeleted?: () => void;
  serviceColor?: string;
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: 2,
        bgcolor: (theme) => alpha(theme.palette.text.primary, 0.03),
        border: 1,
        borderColor: "divider",
      }}
    >
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", fontSize: "0.62rem" }}>
        {label}
      </Typography>
      <Box sx={{ mt: 0.5 }}>{children}</Box>
    </Box>
  );
}

export default function FinanceMovementDrawer({
  open,
  row,
  onClose,
  onUpdated,
  onDeleted,
  serviceColor = "#22c55e",
}: Props) {
  const theme = useTheme();
  const shell = getShellTokens(theme);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    description: "",
    type: "ENTRATA",
    amount: "",
    method: "Contanti",
    status: "In lavorazione",
    dueDate: "",
    reference: "",
    notes: "",
    clientId: "",
  });

  useEffect(() => {
    if (!row) return;
    setEditing(false);
    setError("");
    setForm({
      description: row.description || "",
      type: row.type || "ENTRATA",
      amount: String(row.amount ?? ""),
      method: row.method || "Contanti",
      status: row.status || "In lavorazione",
      dueDate: row.dueDate ? row.dueDate.slice(0, 10) : "",
      reference: row.reference || "",
      notes: row.notes || "",
      clientId: row.client?.id || "",
    });
  }, [row]);

  if (!row) return null;

  const amount = Number(row.amount);
  const c = typeColor(row.type);
  const linkedExpress = Boolean(row.expressSale?.id);
  const paid = isPaidStatus(row.status);

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/platform/entrate-uscite/${row!.id}`, {
        method: "PATCH",
        headers: jsonMutationHeaders(),
        body: JSON.stringify({
          description: form.description.trim(),
          type: form.type,
          amount: Number(form.amount),
          method: form.method,
          status: form.status,
          dueDate: form.dueDate || null,
          reference: form.reference || null,
          notes: form.notes || null,
          clientId: form.clientId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore salvataggio");
      setEditing(false);
      onUpdated?.(data.item as FinanceMovementRow);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore");
    } finally {
      setSaving(false);
    }
  }

  async function handleMarkPaid() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/platform/entrate-uscite/${row!.id}`, {
        method: "PATCH",
        headers: jsonMutationHeaders(),
        body: JSON.stringify({ status: "Pagato" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore");
      onUpdated?.(data.item as FinanceMovementRow);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Eliminare questo movimento?")) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/platform/entrate-uscite/${row!.id}`, {
        method: "DELETE",
        headers: jsonMutationHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore eliminazione");
      onDeleted?.();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: [shellDrawerPaperSx, { width: { xs: "100vw", sm: 440 }, maxWidth: "100%" }],
        },
      }}
    >
      <Box
        sx={{
          px: 2.5,
          py: 2,
          background: row.type === "ENTRATA"
            ? `linear-gradient(135deg, ${alpha(FINANCE_COLORS.entrate, 0.18)} 0%, transparent 100%)`
            : `linear-gradient(135deg, ${alpha(FINANCE_COLORS.uscite, 0.18)} 0%, transparent 100%)`,
          borderBottom: 1,
          borderColor: shell.borderColor,
        }}
      >
        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
          <Chip
            icon={row.type === "ENTRATA" ? <TrendingUpIcon /> : <TrendingDownIcon />}
            label={row.type}
            size="small"
            sx={{ bgcolor: alpha(c, 0.15), color: c, fontWeight: 700, "& .MuiChip-icon": { color: c } }}
          />
          <Stack direction="row" spacing={0.5}>
            {!editing && !linkedExpress && (
              <IconButton size="small" onClick={() => setEditing(true)} aria-label="Modifica">
                <EditIcon fontSize="small" />
              </IconButton>
            )}
            <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
          </Stack>
        </Stack>
        <Typography sx={{ fontWeight: 700, fontSize: "1.1rem", mb: 0.5, lineHeight: 1.3 }}>
          {editing ? "Modifica movimento" : row.description}
        </Typography>
        {!editing && (
          <Typography sx={{ fontWeight: 800, fontSize: "1.75rem", color: c }}>
            {row.type === "ENTRATA" ? "+" : "-"}{money(amount)}
          </Typography>
        )}
      </Box>

      <Box sx={{ p: 2.5, overflowY: "auto", flex: 1 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {linkedExpress && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Movimento collegato a vendita Express — modifica limitata
          </Alert>
        )}

        {editing ? (
          <Stack spacing={2}>
            <TextField label="Descrizione" size="small" fullWidth value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <TextField select label="Tipo" size="small" fullWidth value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <MenuItem value="ENTRATA">Entrata</MenuItem>
              <MenuItem value="USCITA">Uscita</MenuItem>
            </TextField>
            <TextField label="Importo €" type="number" size="small" fullWidth value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            <TextField select label="Metodo" size="small" fullWidth value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
              {METHODS.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
            </TextField>
            <TextField select label="Stato" size="small" fullWidth value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {STATUSES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>
            <TextField label="Scadenza" type="date" size="small" fullWidth value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField label="Riferimento" size="small" fullWidth value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
            <TextField label="Note" size="small" fullWidth multiline minRows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            <ClientPicker value={form.clientId} onChange={(id) => setForm({ ...form, clientId: id })} label="Cliente" />
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" fullWidth onClick={() => setEditing(false)} disabled={saving}>Annulla</Button>
              <Button variant="contained" fullWidth onClick={handleSave} disabled={saving || !form.description.trim()} sx={{ bgcolor: serviceColor }}>
                {saving ? "Salvataggio…" : "Salva"}
              </Button>
            </Stack>
          </Stack>
        ) : (
          <>
            <Stack spacing={1.25}>
              <DetailRow label="Stato">
                <Chip
                  size="small"
                  label={row.status || "—"}
                  sx={{ bgcolor: alpha(movementStatusColor(row.status || ""), 0.12), color: movementStatusColor(row.status || ""), fontWeight: 600 }}
                />
              </DetailRow>
              <DetailRow label="Metodo">
                <Typography sx={{ fontWeight: 600 }}>{row.method || "—"}</Typography>
              </DetailRow>
              {row.client?.name && (
                <DetailRow label="Cliente">
                  <Typography>{row.client.name}</Typography>
                </DetailRow>
              )}
              {row.reference && (
                <DetailRow label="Riferimento">
                  <Typography>{row.reference}</Typography>
                </DetailRow>
              )}
              {row.notes && (
                <DetailRow label="Note">
                  <Typography sx={{ whiteSpace: "pre-wrap" }}>{row.notes}</Typography>
                </DetailRow>
              )}
              {row.margin != null && Number(row.margin) !== 0 && (
                <DetailRow label="Margine">
                  <Typography sx={{ fontWeight: 700, color: serviceColor }}>{money(Number(row.margin))}</Typography>
                </DetailRow>
              )}
              {row.createdAt && (
                <DetailRow label="Registrato">
                  <Typography>{new Date(row.createdAt).toLocaleString("it-IT")}</Typography>
                </DetailRow>
              )}
              {row.paidAt && (
                <DetailRow label="Pagato il">
                  <Typography>{new Date(row.paidAt).toLocaleString("it-IT")}</Typography>
                </DetailRow>
              )}
              {row.dueDate && (
                <DetailRow label="Scadenza">
                  <Typography>{new Date(row.dueDate).toLocaleDateString("it-IT")}</Typography>
                </DetailRow>
              )}
              {row.expressSale?.receiptNumber && (
                <DetailRow label="Vendita Express">
                  <Typography sx={{ fontWeight: 600 }}>Scontrino #{row.expressSale.receiptNumber}</Typography>
                </DetailRow>
              )}
            </Stack>

            <Divider sx={{ my: 2 }} />

            <Stack spacing={1}>
              {!paid && (
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<CheckCircleIcon />}
                  onClick={handleMarkPaid}
                  disabled={saving}
                  sx={{ bgcolor: FINANCE_COLORS.entrate, fontWeight: 700 }}
                >
                  Segna pagato
                </Button>
              )}
              <Button
                fullWidth
                variant="outlined"
                startIcon={<PictureAsPdfIcon />}
                href={`/api/platform/entrate-uscite/${row.id}/pdf`}
                target="_blank"
              >
                Scarica PDF
              </Button>
              {row.expressSale?.id && (
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<OpenInNewIcon />}
                  href={`/services/express?v=vendite&id=${row.expressSale.id}`}
                  sx={{ borderColor: FINANCE_COLORS.express, color: FINANCE_COLORS.express }}
                >
                  Apri in Express
                </Button>
              )}
              {!linkedExpress && (
                <Button
                  fullWidth
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={handleDelete}
                  disabled={saving}
                >
                  Elimina movimento
                </Button>
              )}
            </Stack>
          </>
        )}
      </Box>
    </Drawer>
  );
}
