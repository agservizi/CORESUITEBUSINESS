"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Chip,
  Button,
  TextField,
  Tabs,
  Tab,
  CircularProgress,
  IconButton,
  MenuItem,
  FormControl,
  Select,
  InputLabel,
  Alert,
} from "@mui/material";
import { motion } from "framer-motion";
import EuroIcon from "@mui/icons-material/Euro";
import SendIcon from "@mui/icons-material/Send";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import { useBusinessNavigation } from "@/context/BusinessNavigationProvider";
import { AppDateField } from "@/components/layout/app-shell";
import { getShellTokens, shellPanelSx } from "@/theme/shell-tokens";

interface Note {
  id: string;
  content: string;
  author: { name: string | null };
  createdAt: string;
}
interface Activity {
  id: string;
  type: string;
  title: string;
  description?: string;
  isDone: boolean;
  dueAt?: string;
  author: { name: string | null };
}

interface Deal {
  id: string;
  title: string;
  value: number;
  status: string;
  probability: number;
  expectedClose?: string | null;
  closedAt?: string | null;
  client: { id: string; name: string; companyName?: string | null; email?: string | null };
  notes: Note[];
  activities: Activity[];
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  OPEN: "#0ea5e9",
  WON: "#10b981",
  LOST: "#ef4444",
  ON_HOLD: "#f59e0b",
};
const STATUS_LABELS: Record<string, string> = {
  OPEN: "Aperto",
  WON: "Vinto",
  LOST: "Perso",
  ON_HOLD: "In attesa",
};
const ACTIVITY_ICONS: Record<string, string> = {
  CALL: "📞",
  EMAIL: "✉️",
  MEETING: "🤝",
  TASK: "✅",
  NOTE: "📝",
  DEMO: "🖥️",
};

export default function DealDetailView({ dealId }: { dealId: string }) {
  const { navigate, closeDetail } = useBusinessNavigation();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);
  const [noteText, setNoteText] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [edit, setEdit] = useState({ title: "", status: "OPEN", probability: "50", expectedClose: "" });

  async function fetchDeal() {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/business/deals/${dealId}`);
    if (!res.ok) {
      setDeal(null);
      setError("Deal non trovato");
      setLoading(false);
      return;
    }
    const data = await res.json();
    setDeal(data);
    setEdit({
      title: data.title,
      status: data.status,
      probability: String(data.probability ?? 50),
      expectedClose: data.expectedClose ? data.expectedClose.slice(0, 10) : "",
    });
    setLoading(false);
  }

  useEffect(() => {
    fetchDeal();
  }, [dealId]);

  async function addNote() {
    if (!noteText.trim()) return;
    setAddingNote(true);
    await fetch("/api/business/note", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: noteText, dealId }),
    });
    setNoteText("");
    await fetchDeal();
    setAddingNote(false);
  }

  async function toggleActivity(actId: string, isDone: boolean) {
    await fetch(`/api/business/attivita/${actId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDone }),
    });
    await fetchDeal();
  }

  async function saveDeal() {
    setSaving(true);
    setError("");
    const res = await fetch(`/api/business/deals/${dealId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: edit.title,
        status: edit.status,
        probability: Number(edit.probability),
        expectedClose: edit.expectedClose || null,
      }),
    });
    if (!res.ok) {
      setError("Errore durante il salvataggio");
      setSaving(false);
      return;
    }
    await fetchDeal();
    setSaving(false);
  }

  async function deleteDeal() {
    if (!confirm("Eliminare questo deal?")) return;
    const res = await fetch(`/api/business/deals/${dealId}`, { method: "DELETE" });
    if (res.ok) closeDetail();
    else setError("Impossibile eliminare il deal");
  }

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }
  if (!deal) return <Typography color="error">{error || "Deal non trovato"}</Typography>;

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Box sx={[shellPanelSx, { p: 3, mb: 3 }]}>
          <Box sx={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 2, mb: 2 }}>
            <Box sx={{ flex: 1, minWidth: 200 }}>
              <Typography sx={{ fontWeight: 700, fontSize: "1.25rem", mb: 1 }}>{deal.title}</Typography>
              <Box
                onClick={() => navigate("clienti", deal.client.id)}
                sx={{
                  display: "inline-flex",
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 1.5,
                  background: "rgba(99,102,241,0.08)",
                  border: "1px solid rgba(99,102,241,0.15)",
                  cursor: "pointer",
                }}
              >
                <Typography sx={{ fontSize: "0.775rem", fontWeight: 600, color: "primary.light" }}>
                  🏢 {deal.client.companyName || deal.client.name}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 2, px: 1.5, py: 0.75 }}>
              <EuroIcon sx={{ fontSize: 16, color: "#10b981" }} />
              <Typography sx={{ fontWeight: 700, fontSize: "1.1rem", color: "#10b981" }}>
                {deal.value.toLocaleString("it-IT")}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2, mb: 2 }}>
            <TextField size="small" label="Titolo" value={edit.title} onChange={(e) => setEdit((p) => ({ ...p, title: e.target.value }))} />
            <FormControl size="small">
              <InputLabel>Stato</InputLabel>
              <Select value={edit.status} label="Stato" onChange={(e) => setEdit((p) => ({ ...p, status: e.target.value }))}>
                {Object.entries(STATUS_LABELS).map(([v, l]) => (
                  <MenuItem key={v} value={v}>{l}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField size="small" label="Probabilità %" type="number" value={edit.probability} onChange={(e) => setEdit((p) => ({ ...p, probability: e.target.value }))} />
            <AppDateField label="Chiusura prevista" value={edit.expectedClose} onChange={(expectedClose) => setEdit((p) => ({ ...p, expectedClose }))} />
          </Box>

          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
            <Chip
              label={STATUS_LABELS[deal.status] || deal.status}
              size="small"
              sx={{ background: `${STATUS_COLORS[deal.status]}18`, color: STATUS_COLORS[deal.status] }}
            />
            <Typography variant="caption" color="text.secondary">
              Creato {new Date(deal.createdAt).toLocaleDateString("it-IT")}
            </Typography>
            {deal.closedAt && (
              <Typography variant="caption" color="text.secondary">
                · Chiuso {new Date(deal.closedAt).toLocaleDateString("it-IT")}
              </Typography>
            )}
            <Box sx={{ flex: 1 }} />
            <Button size="small" variant="outlined" onClick={saveDeal} disabled={saving}>
              {saving ? "Salvataggio…" : "Salva"}
            </Button>
            <Button size="small" color="error" startIcon={<DeleteOutlinedIcon />} onClick={deleteDeal}>
              Elimina
            </Button>
          </Box>
        </Box>
      </motion.div>

      <Box sx={(theme) => ({ borderBottom: getShellTokens(theme).border, mb: 3 })}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ "& .MuiTab-root": { fontSize: "0.825rem", minHeight: 40, textTransform: "none" } }}>
          <Tab label={`Note (${deal.notes.length})`} />
          <Tab label={`Attività (${deal.activities.length})`} />
        </Tabs>
      </Box>

      {tab === 0 && (
        <Box>
          <Box sx={{ display: "flex", gap: 1.5, mb: 3, alignItems: "flex-end" }}>
            <TextField fullWidth multiline rows={2} placeholder="Scrivi una nota..." value={noteText} onChange={(e) => setNoteText(e.target.value)} size="small" />
            <IconButton onClick={addNote} disabled={addingNote || !noteText.trim()} sx={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", borderRadius: 2, width: 44, height: 44 }}>
              {addingNote ? <CircularProgress size={18} sx={{ color: "#fff" }} /> : <SendIcon fontSize="small" />}
            </IconButton>
          </Box>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            {deal.notes.length === 0 ? (
              <Typography color="text.secondary" sx={{ textAlign: "center", py: 4 }}>Nessuna nota</Typography>
            ) : (
              deal.notes.map((note) => (
                <Box key={note.id} sx={(theme) => {
                  const t = getShellTokens(theme);
                  return { p: 2, background: t.panel, border: t.border, borderRadius: 2 };
                }}>
                  <Typography sx={{ fontSize: "0.875rem", mb: 1, whiteSpace: "pre-wrap" }}>{note.content}</Typography>
                  <Typography variant="caption" color="text.secondary">{note.author.name}</Typography>
                </Box>
              ))
            )}
          </Box>
        </Box>
      )}

      {tab === 1 && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {deal.activities.length === 0 ? (
            <Typography color="text.secondary" sx={{ textAlign: "center", py: 4 }}>Nessuna attività</Typography>
          ) : (
            deal.activities.map((act) => (
              <Box key={act.id} sx={(theme) => {
                const t = getShellTokens(theme);
                return {
                  display: "flex",
                  gap: 1.5,
                  p: 1.5,
                  background: t.panel,
                  border: t.border,
                  borderRadius: 2,
                  opacity: act.isDone ? 0.55 : 1,
                };
              }}>
                <IconButton size="small" onClick={() => toggleActivity(act.id, !act.isDone)} sx={{ p: 0, color: act.isDone ? "#10b981" : "text.secondary" }}>
                  {act.isDone ? <CheckCircleIcon sx={{ fontSize: 20 }} /> : <RadioButtonUncheckedIcon sx={{ fontSize: 20 }} />}
                </IconButton>
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontWeight: 600, fontSize: "0.875rem", textDecoration: act.isDone ? "line-through" : "none" }}>
                    {ACTIVITY_ICONS[act.type]} {act.title}
                  </Typography>
                </Box>
              </Box>
            ))
          )}
        </Box>
      )}
    </Box>
  );
}
