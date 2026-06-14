"use client";

import { useEffect, useState } from "react";
import {
  Box, Typography, Chip, Button, TextField, Tabs, Tab,
  CircularProgress, IconButton, Select, MenuItem, FormControl,
} from "@mui/material";
import { motion } from "framer-motion";
import EuroIcon from "@mui/icons-material/Euro";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import SendIcon from "@mui/icons-material/Send";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import HandshakeIcon from "@mui/icons-material/Handshake";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import AddTaskIcon from "@mui/icons-material/AddTask";
import { useBusinessNavigation } from "@/context/BusinessNavigationProvider";
import { getShellTokens, shellPanelSx } from "@/theme/shell-tokens";

interface Note { id: string; content: string; author: { name: string | null }; createdAt: string }
interface Activity { id: string; type: string; title: string; description?: string; isDone: boolean; dueAt?: string; author: { name: string | null } }
interface Stage { id: string; name: string; color: string }

interface Lead {
  id: string; title: string; status: string; priority: string; source: string;
  value?: number; expectedClose?: string; contactName?: string; contactEmail?: string; contactPhone?: string;
  client?: { id: string; name: string; companyName?: string; email?: string; phone?: string };
  assignee?: { name: string; email: string };
  stage?: Stage;
  pipeline?: { stages: Stage[] };
  notes: Note[];
  activities: Activity[];
  createdAt: string;
}

const PRIORITY_COLOR: Record<string, string> = { LOW: "#64748b", MEDIUM: "#0ea5e9", HIGH: "#f59e0b", URGENT: "#ef4444" };
const PRIORITY_LABEL: Record<string, string> = { LOW: "Bassa", MEDIUM: "Media", HIGH: "Alta", URGENT: "Urgente" };
const SOURCE_LABEL: Record<string, string> = { WEBSITE: "Sito web", REFERRAL: "Referral", SOCIAL: "Social", EMAIL: "Email", PHONE: "Telefono", EVENT: "Evento", OTHER: "Altro" };
const ACTIVITY_ICONS: Record<string, string> = { CALL: "📞", EMAIL: "✉️", MEETING: "🤝", TASK: "✅", NOTE: "📝", DEMO: "🖥️" };

export default function LeadDetailView({ leadId }: { leadId: string }) {
  const { navigate, closeDetail } = useBusinessNavigation();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);
  const [noteText, setNoteText] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [newActivity, setNewActivity] = useState({ title: "", type: "TASK" });
  const [addingAct, setAddingAct] = useState(false);
  const [converting, setConverting] = useState(false);
  const [convertError, setConvertError] = useState("");
  const [savingStage, setSavingStage] = useState(false);

  async function fetchLead() {
    setLoading(true);
    const res = await fetch(`/api/business/lead/${leadId}`);
    const data = await res.json();
    setLead(data);
    setLoading(false);
  }

  useEffect(() => { fetchLead(); }, [leadId]);

  async function addNote() {
    if (!noteText.trim()) return;
    setAddingNote(true);
    await fetch("/api/business/note", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: noteText, leadId }) });
    setNoteText("");
    await fetchLead();
    setAddingNote(false);
  }

  async function addActivity() {
    if (!newActivity.title.trim()) return;
    setAddingAct(true);
    await fetch("/api/business/attivita", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...newActivity, leadId }) });
    setNewActivity({ title: "", type: "TASK" });
    await fetchLead();
    setAddingAct(false);
  }

  async function toggleActivity(actId: string, isDone: boolean) {
    await fetch(`/api/business/attivita/${actId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isDone }) });
    await fetchLead();
  }

  async function changeStage(stageId: string) {
    setSavingStage(true);
    const res = await fetch(`/api/business/lead/${leadId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stageId }) });
    if (!res.ok) setConvertError("Errore aggiornamento stage");
    await fetchLead();
    setSavingStage(false);
  }

  async function convertToDeal() {
    setConverting(true);
    setConvertError("");
    const res = await fetch(`/api/business/lead/${leadId}/convert`, { method: "POST" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setConvertError(err.error || "Conversione non riuscita");
      setConverting(false);
      return;
    }
    const deal = await res.json();
    navigate("deals", deal.id);
    setConverting(false);
  }

  async function deleteLead() {
    if (!confirm("Eliminare questo lead?")) return;
    const res = await fetch(`/api/business/lead/${leadId}`, { method: "DELETE" });
    if (res.ok) closeDetail();
  }

  if (loading) return <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}><CircularProgress /></Box>;
  if (!lead) return <Typography color="error">Lead non trovato</Typography>;

  return (
    <Box>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Box sx={[shellPanelSx, { p: 3, mb: 3 }]}>
          <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
            <Box sx={{ flex: 1, minWidth: 200 }}>
              <Typography sx={{ fontWeight: 700, fontSize: "1.25rem", letterSpacing: "-0.01em", mb: 1 }}>{lead.title}</Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: "50%", background: PRIORITY_COLOR[lead.priority] }} />
                  <Typography sx={{ fontSize: "0.8rem", color: PRIORITY_COLOR[lead.priority] }}>{PRIORITY_LABEL[lead.priority]}</Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">Fonte: {SOURCE_LABEL[lead.source]}</Typography>
                {lead.contactName && <Typography variant="caption" color="text.secondary">👤 {lead.contactName}</Typography>}
                {lead.contactEmail && <Typography variant="caption" color="text.secondary">✉️ {lead.contactEmail}</Typography>}
                {lead.assignee && (
                  <Typography variant="caption" color="text.secondary">👤 {lead.assignee.name || lead.assignee.email}</Typography>
                )}
              </Box>
              {lead.client && (
                <Box
                  onClick={() => navigate("clienti", lead.client!.id)}
                  sx={{ display: "inline-flex", alignItems: "center", gap: 0.75, mt: 1.5, px: 1.5, py: 0.5, background: "rgba(99,102,241,0.08)", borderRadius: 1.5, border: "1px solid rgba(99,102,241,0.15)", cursor: "pointer", "&:hover": { background: "rgba(99,102,241,0.14)" } }}
                >
                  <Typography sx={{ fontSize: "0.775rem", fontWeight: 600, color: "primary.light" }}>
                    🏢 {lead.client.companyName || lead.client.name}
                  </Typography>
                </Box>
              )}
            </Box>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 1, alignItems: "flex-end" }}>
              {lead.value && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 2, px: 1.5, py: 0.75 }}>
                  <EuroIcon sx={{ fontSize: 16, color: "#10b981" }} />
                  <Typography sx={{ fontWeight: 700, fontSize: "1.1rem", color: "#10b981" }}>
                    {lead.value.toLocaleString("it-IT")}
                  </Typography>
                </Box>
              )}
              {lead.expectedClose && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <CalendarTodayIcon sx={{ fontSize: 13, color: "text.secondary" }} />
                  <Typography variant="caption" color="text.secondary">
                    Scade: {new Date(lead.expectedClose).toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" })}
                  </Typography>
                </Box>
              )}
              {lead.pipeline && (
                <FormControl size="small" sx={{ minWidth: 180 }}>
                  <Select
                    value={lead.stage?.id || ""}
                    onChange={(e) => changeStage(e.target.value)}
                    disabled={savingStage}
                    sx={{ fontSize: "0.8rem" }}
                  >
                    {lead.pipeline.stages.map((s) => (
                      <MenuItem key={s.id} value={s.id}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Box sx={{ width: 8, height: 8, borderRadius: "50%", background: s.color }} />
                          {s.name}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", justifyContent: "flex-end" }}>
                {lead.client && (
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={converting ? <CircularProgress size={14} /> : <HandshakeIcon />}
                    onClick={convertToDeal}
                    disabled={converting}
                    sx={{ borderColor: "rgba(16,185,129,0.4)", color: "#10b981" }}
                  >
                    Converti in deal
                  </Button>
                )}
                <Button size="small" color="error" startIcon={<DeleteOutlinedIcon />} onClick={deleteLead}>
                  Elimina
                </Button>
              </Box>
              {convertError && (
                <Typography color="error" variant="caption" sx={{ mt: 1, display: "block", textAlign: "right" }}>
                  {convertError}
                </Typography>
              )}
            </Box>
          </Box>
        </Box>
      </motion.div>

      <Box sx={(theme) => ({ borderBottom: getShellTokens(theme).border, mb: 3 })}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ "& .MuiTab-root": { fontSize: "0.825rem", minHeight: 40, textTransform: "none" } }}>
          <Tab label={`Note (${lead.notes.length})`} />
          <Tab label={`Attività (${lead.activities.length})`} />
        </Tabs>
      </Box>

      {tab === 0 && (
        <Box>
          <Box sx={{ display: "flex", gap: 1.5, mb: 3, alignItems: "flex-end" }}>
            <TextField fullWidth multiline rows={2} placeholder="Scrivi una nota..." value={noteText} onChange={(e) => setNoteText(e.target.value)} size="small" onKeyDown={(e) => { if (e.key === "Enter" && e.ctrlKey) addNote(); }} />
            <IconButton onClick={addNote} disabled={addingNote || !noteText.trim()} sx={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", "&:hover": { background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }, "&:disabled": { opacity: 0.4, color: "#fff" }, borderRadius: 2, width: 44, height: 44 }}>
              {addingNote ? <CircularProgress size={18} sx={{ color: "#fff" }} /> : <SendIcon fontSize="small" />}
            </IconButton>
          </Box>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            {lead.notes.length === 0 ? <Typography color="text.secondary" sx={{ textAlign: "center", py: 4 }}>Nessuna nota</Typography> : lead.notes.map((note) => (
              <Box key={note.id} sx={(theme) => {
                const t = getShellTokens(theme);
                return { p: 2, background: t.panel, border: t.border, borderRadius: 2 };
              }}>
                <Typography sx={{ fontSize: "0.875rem", lineHeight: 1.6, mb: 1, whiteSpace: "pre-wrap" }}>{note.content}</Typography>
                <Typography variant="caption" color="text.secondary">{note.author.name} · {new Date(note.createdAt).toLocaleDateString("it-IT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {tab === 1 && (
        <Box>
          <Box sx={{ display: "flex", gap: 1.5, mb: 3, alignItems: "flex-end", flexWrap: "wrap" }}>
            <FormControl size="small" sx={{ minWidth: 130 }}>
              <Select value={newActivity.type} onChange={(e) => setNewActivity((p) => ({ ...p, type: e.target.value }))} sx={{ fontSize: "0.825rem" }}>
                {Object.entries(ACTIVITY_ICONS).map(([v, icon]) => <MenuItem key={v} value={v}>{icon} {v.charAt(0) + v.slice(1).toLowerCase()}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField size="small" placeholder="Titolo attività..." value={newActivity.title} onChange={(e) => setNewActivity((p) => ({ ...p, title: e.target.value }))} sx={{ flex: 1, minWidth: 200 }} onKeyDown={(e) => { if (e.key === "Enter") addActivity(); }} />
            <Button variant="outlined" startIcon={addingAct ? <CircularProgress size={14} /> : <AddTaskIcon />} onClick={addActivity} disabled={addingAct || !newActivity.title.trim()} sx={{ borderColor: "rgba(99,102,241,0.4)", color: "primary.light", "&:hover": { borderColor: "primary.main", background: "rgba(99,102,241,0.08)" } }}>
              Aggiungi
            </Button>
          </Box>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {lead.activities.length === 0 ? <Typography color="text.secondary" sx={{ textAlign: "center", py: 4 }}>Nessuna attività</Typography> : lead.activities.map((act) => (
              <Box key={act.id} sx={(theme) => {
                const t = getShellTokens(theme);
                return {
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 1.5,
                  p: 1.5,
                  background: t.panel,
                  border: t.border,
                  borderRadius: 2,
                  opacity: act.isDone ? 0.55 : 1,
                };
              }}>
                <IconButton size="small" onClick={() => toggleActivity(act.id, !act.isDone)} sx={{ p: 0, color: act.isDone ? "#10b981" : "text.secondary", mt: 0.2 }}>
                  {act.isDone ? <CheckCircleIcon sx={{ fontSize: 20 }} /> : <RadioButtonUncheckedIcon sx={{ fontSize: 20 }} />}
                </IconButton>
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography sx={{ fontSize: "0.8rem" }}>{ACTIVITY_ICONS[act.type]}</Typography>
                    <Typography sx={{ fontWeight: 600, fontSize: "0.875rem", textDecoration: act.isDone ? "line-through" : "none" }}>{act.title}</Typography>
                  </Box>
                  {act.description && <Typography variant="caption" color="text.secondary">{act.description}</Typography>}
                </Box>
                {act.dueAt && <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>{new Date(act.dueAt).toLocaleDateString("it-IT", { day: "2-digit", month: "short" })}</Typography>}
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
}
