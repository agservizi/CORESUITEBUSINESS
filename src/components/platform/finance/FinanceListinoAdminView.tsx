"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Box, Typography, Button, TextField, Paper, Stack, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, alpha, Skeleton,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { shellPanelSx } from "@/theme/shell-tokens";
import { jsonMutationHeaders } from "@/lib/csrf-client";
import FinanceViewHero from "./FinanceViewHero";
import { FINANCE_COLORS, money, VIEW_THEMES } from "./finance-utils";

interface ListinoItem {
  id: string;
  code: string;
  name: string;
  category?: string | null;
  resellerCost: number | string;
  clientPrice: number | string;
  margin: number | string;
}

interface FormState {
  code: string;
  name: string;
  category: string;
  resellerCost: string;
  clientPrice: string;
}

const emptyForm: FormState = { code: "", name: "", category: "", resellerCost: "", clientPrice: "" };

interface Props {
  serviceColor: string;
}

export default function FinanceListinoAdminView({ serviceColor }: Props) {
  const theme = VIEW_THEMES.listino ?? VIEW_THEMES.elenco;
  const [items, setItems] = useState<ListinoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/platform/listino");
    const data = await res.json();
    setItems(data.items || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(item: ListinoItem) {
    setEditingId(item.id);
    setForm({
      code: item.code,
      name: item.name,
      category: item.category || "",
      resellerCost: String(item.resellerCost),
      clientPrice: String(item.clientPrice),
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    const body = {
      code: form.code || undefined,
      name: form.name.trim(),
      category: form.category || undefined,
      resellerCost: Number(form.resellerCost) || 0,
      clientPrice: Number(form.clientPrice) || 0,
    };
    const url = editingId ? `/api/platform/listino/${editingId}` : "/api/platform/listino";
    await fetch(url, {
      method: editingId ? "PATCH" : "POST",
      headers: jsonMutationHeaders(),
      body: JSON.stringify(body),
    });
    setDialogOpen(false);
    await load();
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Eliminare questa voce di listino?")) return;
    await fetch(`/api/platform/listino/${id}`, { method: "DELETE", headers: jsonMutationHeaders() });
    await load();
  }

  return (
    <Box>
      <FinanceViewHero viewId="listino" badge={`${items.length} voci listino`}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openCreate}
          sx={{ bgcolor: "rgba(255,255,255,0.95)", color: theme.accent, fontWeight: 700, "&:hover": { bgcolor: "#fff" } }}
        >
          Nuova voce
        </Button>
      </FinanceViewHero>

      <Paper sx={[shellPanelSx, { overflow: "hidden", border: `1px solid ${alpha(theme.accent, 0.12)}` }]}>
        {loading ? (
          <Stack spacing={1.5} sx={{ p: 2 }}>
            {[1, 2, 3].map((i) => <Skeleton key={i} variant="rounded" height={56} />)}
          </Stack>
        ) : items.length === 0 ? (
          <Box sx={{ py: 6, textAlign: "center" }}>
            <Typography sx={{ fontWeight: 700, mb: 1 }}>Listino vuoto</Typography>
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate} sx={{ bgcolor: theme.accent }}>
              Aggiungi prima voce
            </Button>
          </Box>
        ) : (
          <Stack spacing={0} sx={{ p: 1.5 }}>
            {items.map((item) => (
              <Box
                key={item.id}
                sx={{
                  p: 1.75,
                  mb: 1,
                  borderRadius: 2.5,
                  border: "1px solid",
                  borderColor: alpha(theme.accent, 0.15),
                  display: "grid",
                  gridTemplateColumns: "1fr auto auto auto auto",
                  gap: 2,
                  alignItems: "center",
                }}
              >
                <Box>
                  <Typography sx={{ fontWeight: 700 }}>{item.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {item.code}{item.category ? ` · ${item.category}` : ""}
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">Costo {money(Number(item.resellerCost))}</Typography>
                <Typography sx={{ fontWeight: 700, color: FINANCE_COLORS.entrate }}>{money(Number(item.clientPrice))}</Typography>
                <Typography variant="caption" sx={{ color: serviceColor, fontWeight: 600 }}>
                  Margine {money(Number(item.margin))}
                </Typography>
                <Stack direction="row" spacing={0.5}>
                  <IconButton size="small" onClick={() => openEdit(item)}><EditIcon fontSize="small" /></IconButton>
                  <IconButton size="small" color="error" onClick={() => handleDelete(item.id)}><DeleteIcon fontSize="small" /></IconButton>
                </Stack>
              </Box>
            ))}
          </Stack>
        )}
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? "Modifica voce" : "Nuova voce listino"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField label="Codice" size="small" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            <TextField label="Nome *" size="small" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <TextField label="Categoria" size="small" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            <TextField label="Costo rivenditore €" type="number" size="small" value={form.resellerCost} onChange={(e) => setForm({ ...form, resellerCost: e.target.value })} />
            <TextField label="Prezzo cliente €" type="number" size="small" value={form.clientPrice} onChange={(e) => setForm({ ...form, clientPrice: e.target.value })} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Annulla</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving || !form.name.trim()} sx={{ bgcolor: theme.accent }}>
            {saving ? "Salvataggio…" : "Salva"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
