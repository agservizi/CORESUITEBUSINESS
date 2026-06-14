"use client";

import { useEffect, useState } from "react";
import { Box, Typography, Chip, Avatar, TextField,
  Tabs, Tab, CircularProgress, IconButton, Button, MenuItem, FormControlLabel, Switch,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import EmailIcon from "@mui/icons-material/Email";
import PhoneIcon from "@mui/icons-material/Phone";
import LanguageIcon from "@mui/icons-material/Language";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import EuroIcon from "@mui/icons-material/Euro";
import SendIcon from "@mui/icons-material/Send";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import { useBusinessNavigation } from "@/context/BusinessNavigationProvider";
import { getShellTokens, shellPanelSx } from "@/theme/shell-tokens";
import BusinessClientInsightPanel from "@/components/business/BusinessClientInsightPanel";

interface Note { id: string; content: string; author: { name: string | null }; createdAt: string }
interface Activity { id: string; type: string; title: string; description?: string; isDone: boolean; dueAt?: string; author: { name: string | null }; createdAt: string }
interface Lead { id: string; title: string; value?: number; status: string; stage?: { name: string; color: string }; createdAt: string }

interface Client {
  id: string; name: string; companyName?: string; email?: string; phone?: string;
  website?: string; city?: string; status: string; type: string; tags: string[];
  morosityFlag?: boolean; morosityScore?: string; morosityNote?: string | null;
  leads: Lead[]; deals: { id: string; title: string; value: number; status: string }[];
  notes: Note[]; activities: Activity[]; createdAt: string;
}

const MOROSITY_COLORS: Record<string, string> = { OK: "#10b981", ATTENZIONE: "#f59e0b", BLOCCATO: "#ef4444" };
const MOROSITY_LABELS: Record<string, string> = { OK: "OK", ATTENZIONE: "Attenzione", BLOCCATO: "Bloccato" };

const STATUS_COLORS: Record<string, string> = { ACTIVE: "#10b981", INACTIVE: "#64748b", PROSPECT: "#f59e0b", CHURNED: "#ef4444" };
const STATUS_LABELS: Record<string, string> = { ACTIVE: "Attivo", INACTIVE: "Inattivo", PROSPECT: "Prospect", CHURNED: "Perso" };
const ACTIVITY_ICONS: Record<string, string> = { CALL: "📞", EMAIL: "✉️", MEETING: "🤝", TASK: "✅", NOTE: "📝", DEMO: "🖥️" };

interface TimelineEvent {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  amount?: number;
  status: string;
  at: string;
  module?: string;
  link?: string;
}

interface CrossModule {
  expressSales: { id: string; total: number; soldAt: string; status: string }[];
  expressRequests: { id: string; title: string; status: string; createdAt: string }[];
  tickets: { id: string; code: string; subject: string; status: string; priority: string }[];
  practices: { id: string; title: string; status: string; createdAt: string }[];
}

function getInitials(name: string) { return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2); }

export default function ClienteDetailView({ clientId }: { clientId: string }) {
  const router = useRouter();
  const { navigate } = useBusinessNavigation();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);
  const [noteText, setNoteText] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [morosityForm, setMorosityForm] = useState({ morosityFlag: false, morosityScore: "OK", morosityNote: "" });
  const [savingMorosity, setSavingMorosity] = useState(false);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [crossModule, setCrossModule] = useState<CrossModule | null>(null);

  async function fetchClient() {
    setLoading(true);
    const res = await fetch(`/api/business/clienti/${clientId}`);
    const data = await res.json();
    setClient(data);
    setMorosityForm({
      morosityFlag: Boolean(data.morosityFlag),
      morosityScore: data.morosityScore || "OK",
      morosityNote: data.morosityNote || "",
    });
    setLoading(false);
  }

  useEffect(() => {
    fetchClient();
    fetch(`/api/business/clienti/${clientId}/timeline`)
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => setTimeline(d.items || []));
    fetch(`/api/business/clienti/${clientId}/profile`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setCrossModule(d?.client?.crossModule ?? null));
  }, [clientId]);

  async function addNote() {
    if (!noteText.trim()) return;
    setAddingNote(true);
    await fetch("/api/business/note", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: noteText, clientId }),
    });
    setNoteText("");
    await fetchClient();
    setAddingNote(false);
  }

  async function saveMorosity() {
    setSavingMorosity(true);
    await fetch(`/api/business/clienti/${clientId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(morosityForm),
    });
    await fetchClient();
    setSavingMorosity(false);
  }

  async function toggleActivity(actId: string, isDone: boolean) {
    await fetch(`/api/business/attivita/${actId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDone }),
    });
    await fetchClient();
  }

  if (loading) return <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}><CircularProgress /></Box>;
  if (!client) return <Typography color="error">Cliente non trovato</Typography>;

  const totalLeadValue = client.leads.reduce((s, l) => s + (l.value || 0), 0);

  return (
    <Box>
      <BusinessClientInsightPanel clientId={clientId} onActivityCreated={fetchClient} />
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Box sx={[shellPanelSx, { p: 3, mb: 3 }]}>
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2.5, flexWrap: "wrap" }}>
            <Avatar sx={{ width: 56, height: 56, fontSize: "1.1rem", fontWeight: 700, background: `linear-gradient(135deg, ${STATUS_COLORS[client.status]}66, ${STATUS_COLORS[client.status]}33)`, color: STATUS_COLORS[client.status] }}>
              {getInitials(client.name)}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 200 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
                <Typography sx={{ fontWeight: 700, fontSize: "1.25rem", letterSpacing: "-0.01em" }}>
                  {client.companyName || client.name}
                </Typography>
                <Chip label={STATUS_LABELS[client.status]} size="small" sx={{ height: 22, fontSize: "0.7rem", fontWeight: 600, background: `${STATUS_COLORS[client.status]}18`, color: STATUS_COLORS[client.status], border: `1px solid ${STATUS_COLORS[client.status]}33` }} />
                {client.morosityScore && client.morosityScore !== "OK" && (
                  <Chip
                    label={`Morosità: ${MOROSITY_LABELS[client.morosityScore] || client.morosityScore}`}
                    size="small"
                    sx={{
                      height: 22,
                      fontSize: "0.7rem",
                      fontWeight: 600,
                      background: `${MOROSITY_COLORS[client.morosityScore] || "#64748b"}18`,
                      color: MOROSITY_COLORS[client.morosityScore] || "#64748b",
                    }}
                  />
                )}
              </Box>
              {client.companyName && client.name !== client.companyName && (
                <Typography color="text.secondary" sx={{ fontSize: "0.875rem", mt: 0.25 }}>{client.name}</Typography>
              )}
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mt: 1.5 }}>
                {client.email && <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}><EmailIcon sx={{ fontSize: 14, color: "text.secondary" }} /><Typography variant="caption" color="text.secondary">{client.email}</Typography></Box>}
                {client.phone && <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}><PhoneIcon sx={{ fontSize: 14, color: "text.secondary" }} /><Typography variant="caption" color="text.secondary">{client.phone}</Typography></Box>}
                {client.city && <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}><LocationOnIcon sx={{ fontSize: 14, color: "text.secondary" }} /><Typography variant="caption" color="text.secondary">{client.city}</Typography></Box>}
                {client.website && <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}><LanguageIcon sx={{ fontSize: 14, color: "text.secondary" }} /><Typography variant="caption" color="text.secondary">{client.website}</Typography></Box>}
              </Box>
              <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", mt: 1.5 }}>
                {client.tags.map((tag) => <Chip key={tag} label={tag} size="small" sx={{ height: 20, fontSize: "0.65rem", background: "rgba(99,102,241,0.1)", color: "primary.light", border: "none" }} />)}
              </Box>
            </Box>

            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              {[
                { label: "Lead", value: client.leads.length, color: "#6366f1" },
                { label: "Deal", value: client.deals.length, color: "#0ea5e9" },
                { label: "Valore", value: `€${totalLeadValue.toLocaleString("it-IT")}`, color: "#10b981" },
              ].map(({ label, value, color }) => (
                <Box key={label} sx={(theme) => {
                  const t = getShellTokens(theme);
                  return { textAlign: "center", background: t.hover, border: t.border, borderRadius: 2, px: 2, py: 1 };
                }}>
                  <Typography sx={{ fontWeight: 700, fontSize: "1.1rem", color }}>{value}</Typography>
                  <Typography variant="caption" color="text.secondary">{label}</Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </motion.div>

      <Box sx={(theme) => ({ borderBottom: getShellTokens(theme).border, mb: 3 })}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ "& .MuiTab-root": { fontSize: "0.825rem", minHeight: 40, textTransform: "none" } }} variant="scrollable" scrollButtons="auto">
          <Tab label="Timeline" />
          <Tab label="Cross-modulo" />
          <Tab label={`Lead (${client.leads.length})`} />
          <Tab label={`Deal (${client.deals.length})`} />
          <Tab label={`Note (${client.notes.length})`} />
          <Tab label={`Attività (${client.activities.length})`} />
          <Tab label="Morosità" />
        </Tabs>
      </Box>

      {tab === 0 && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {timeline.length === 0 ? (
            <Typography color="text.secondary" sx={{ textAlign: "center", py: 4 }}>Nessun evento in timeline</Typography>
          ) : timeline.map((ev) => (
            <Box key={`${ev.type}-${ev.id}`} onClick={() => ev.link && router.push(ev.link)} sx={(theme) => {
              const t = getShellTokens(theme);
              return { p: 2, background: t.panel, border: t.border, borderRadius: 2, cursor: ev.link ? "pointer" : "default" };
            }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                <Typography sx={{ fontWeight: 600, fontSize: "0.875rem" }}>{ev.title}</Typography>
                {ev.module && <Chip label={ev.module} size="small" sx={{ height: 20, fontSize: "0.65rem" }} />}
              </Box>
              <Typography variant="caption" color="text.secondary">
                {new Date(ev.at).toLocaleString("it-IT")}
                {ev.amount != null ? ` · €${ev.amount.toLocaleString("it-IT")}` : ""}
                {ev.status ? ` · ${ev.status}` : ""}
              </Typography>
            </Box>
          ))}
        </Box>
      )}

      {tab === 1 && crossModule && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {[
            { label: "Vendite Express", items: crossModule.expressSales.map((s) => `${new Date(s.soldAt).toLocaleDateString("it-IT")} · €${s.total} · ${s.status}`) },
            { label: "Richieste portale/Express", items: crossModule.expressRequests.map((r) => `${r.title} · ${r.status}`) },
            { label: "Ticket aperti", items: crossModule.tickets.map((t) => `${t.code} · ${t.subject} · ${t.priority}`) },
            { label: "Pratiche", items: crossModule.practices.map((p) => `${p.title} · ${p.status}`) },
          ].map((section) => (
            <Box key={section.label} sx={[shellPanelSx, { p: 2 }]}>
              <Typography sx={{ fontWeight: 600, mb: 1 }}>{section.label}</Typography>
              {section.items.length === 0 ? (
                <Typography variant="body2" color="text.secondary">Nessuno</Typography>
              ) : section.items.map((line, i) => (
                <Typography key={i} variant="body2" sx={{ py: 0.25 }}>{line}</Typography>
              ))}
            </Box>
          ))}
        </Box>
      )}

      {tab === 2 && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {client.leads.length === 0 ? (
            <Typography color="text.secondary" sx={{ textAlign: "center", py: 4 }}>Nessun lead per questo cliente</Typography>
          ) : client.leads.map((lead) => (
            <Box key={lead.id} onClick={() => navigate("lead", lead.id)} sx={(theme) => {
              const t = getShellTokens(theme);
              return {
                display: "flex", alignItems: "center", gap: 2, p: 2,
                background: t.panel, border: t.border, borderRadius: 2, cursor: "pointer",
                "&:hover": { borderColor: t.inputBorderHover },
              };
            }}>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontWeight: 600, fontSize: "0.875rem" }}>{lead.title}</Typography>
                <Typography variant="caption" color="text.secondary">{new Date(lead.createdAt).toLocaleDateString("it-IT")}</Typography>
              </Box>
              {lead.stage && <Chip label={lead.stage.name} size="small" sx={{ height: 20, fontSize: "0.65rem", fontWeight: 600, background: `${lead.stage.color}18`, color: lead.stage.color, border: "none" }} />}
              {lead.value && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.3 }}>
                  <EuroIcon sx={{ fontSize: 12, color: "#10b981" }} />
                  <Typography sx={{ fontSize: "0.8rem", fontWeight: 700, color: "#10b981" }}>{lead.value.toLocaleString("it-IT")}</Typography>
                </Box>
              )}
            </Box>
          ))}
        </Box>
      )}

      {tab === 3 && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {client.deals.length === 0 ? (
            <Typography color="text.secondary" sx={{ textAlign: "center", py: 4 }}>Nessun deal per questo cliente</Typography>
          ) : client.deals.map((deal) => (
            <Box key={deal.id} onClick={() => navigate("deals", deal.id)} sx={(theme) => {
              const t = getShellTokens(theme);
              return {
                display: "flex", alignItems: "center", gap: 2, p: 2,
                background: t.panel, border: t.border, borderRadius: 2, cursor: "pointer",
                "&:hover": { borderColor: t.inputBorderHover },
              };
            }}>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontWeight: 600, fontSize: "0.875rem" }}>{deal.title}</Typography>
                <Chip label={deal.status} size="small" sx={{ height: 20, fontSize: "0.65rem", mt: 0.5 }} />
              </Box>
              <Typography sx={{ fontSize: "0.8rem", fontWeight: 700, color: "#10b981" }}>€{deal.value.toLocaleString("it-IT")}</Typography>
            </Box>
          ))}
        </Box>
      )}

      {tab === 4 && (
        <Box>
          <Box sx={{ display: "flex", gap: 1.5, mb: 3, alignItems: "flex-end" }}>
            <TextField
              fullWidth multiline rows={2} placeholder="Scrivi una nota..."
              value={noteText} onChange={(e) => setNoteText(e.target.value)}
              size="small"
              onKeyDown={(e) => { if (e.key === "Enter" && e.ctrlKey) addNote(); }}
            />
            <IconButton onClick={addNote} disabled={addingNote || !noteText.trim()} sx={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", "&:hover": { background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }, "&:disabled": { opacity: 0.4, color: "#fff" }, borderRadius: 2, width: 44, height: 44 }}>
              {addingNote ? <CircularProgress size={18} sx={{ color: "#fff" }} /> : <SendIcon fontSize="small" />}
            </IconButton>
          </Box>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            {client.notes.length === 0 ? (
              <Typography color="text.secondary" sx={{ textAlign: "center", py: 4 }}>Nessuna nota</Typography>
            ) : client.notes.map((note) => (
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

      {tab === 5 && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {client.activities.length === 0 ? (
            <Typography color="text.secondary" sx={{ textAlign: "center", py: 4 }}>Nessuna attività</Typography>
          ) : client.activities.map((act) => (
            <Box key={act.id} sx={(theme) => {
              const t = getShellTokens(theme);
              return {
                display: "flex", alignItems: "flex-start", gap: 1.5, p: 1.5,
                background: t.panel, border: t.border, borderRadius: 2, opacity: act.isDone ? 0.6 : 1,
              };
            }}>
              <IconButton size="small" onClick={() => toggleActivity(act.id, !act.isDone)} sx={{ p: 0, color: act.isDone ? "#10b981" : "text.secondary", mt: 0.2 }}>
                {act.isDone ? <CheckCircleIcon sx={{ fontSize: 20 }} /> : <RadioButtonUncheckedIcon sx={{ fontSize: 20 }} />}
              </IconButton>
              <Box sx={{ flex: 1, minWidth: 0 }}>
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
      )}

      {tab === 6 && (
        <Box sx={{ maxWidth: 480, display: "flex", flexDirection: "column", gap: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={morosityForm.morosityFlag}
                onChange={(e) => setMorosityForm((p) => ({ ...p, morosityFlag: e.target.checked }))}
              />
            }
            label="Flag morosità attivo"
          />
          <TextField
            select
            fullWidth
            size="small"
            label="Score morosità"
            value={morosityForm.morosityScore}
            onChange={(e) => setMorosityForm((p) => ({ ...p, morosityScore: e.target.value }))}
          >
            {Object.entries(MOROSITY_LABELS).map(([v, l]) => (
              <MenuItem key={v} value={v}>{l}</MenuItem>
            ))}
          </TextField>
          <TextField
            fullWidth
            multiline
            rows={3}
            size="small"
            label="Note morosità"
            value={morosityForm.morosityNote}
            onChange={(e) => setMorosityForm((p) => ({ ...p, morosityNote: e.target.value }))}
          />
          <Button
            variant="contained"
            onClick={saveMorosity}
            disabled={savingMorosity}
            sx={{ alignSelf: "flex-start", background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
          >
            {savingMorosity ? "Salvataggio…" : "Salva morosità"}
          </Button>
        </Box>
      )}
    </Box>
  );
}
