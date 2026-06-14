"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Chip,
  TextField,
  Button,
  MenuItem,
  CircularProgress,
  Avatar,
  Divider,
  IconButton,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SendIcon from "@mui/icons-material/Send";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import AiSparkButton from "@/components/ai/AiSparkButton";
import { jsonMutationHeaders } from "@/lib/csrf-client";
import { getShellTokens, shellPaperSx } from "@/theme/shell-tokens";
import { getPlatformService } from "@/config/platform-services";
import ServiceViewHero from "./service-shell/ServiceViewHero";
import { getServiceViewTheme } from "./service-shell/service-view-themes";
import { motion } from "framer-motion";
import { hubFadeUp } from "@/lib/hub-motion";
import { slaLabel, slaState, PRIORITY_COLORS, PRIORITY_LABELS } from "./tickets/tickets-utils";

interface TicketMessage {
  id: string;
  authorName: string;
  body: string;
  createdAt: string;
  isInternal?: boolean;
}

interface TicketDetail {
  id: string;
  code: string;
  subject: string;
  status: string;
  priority: string;
  type: string;
  customerName?: string;
  customerEmail?: string;
  assignedTo?: { id: string; name: string | null; email: string } | null;
  slaDueAt?: string | null;
  lastMessageAt?: string | null;
  messages: TicketMessage[];
  createdAt: string;
}

const STATUS_OPTIONS = [
  { value: "OPEN", label: "Aperto" },
  { value: "IN_PROGRESS", label: "In lavorazione" },
  { value: "WAITING_CLIENT", label: "In attesa cliente" },
  { value: "RESOLVED", label: "Risolto" },
  { value: "CLOSED", label: "Chiuso" },
];

export default function TicketDetailView({
  ticketId,
  onBack,
  serviceColor = "#0ea5e9",
}: {
  ticketId: string;
  onBack: () => void;
  serviceColor?: string;
}) {
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadTicket() {
    setLoading(true);
    const res = await fetch(`/api/platform/tickets/${ticketId}`);
    const data = await res.json();
    setTicket(data.item);
    setLoading(false);
  }

  useEffect(() => {
    loadTicket();
  }, [ticketId]);

  async function updateField(fields: Record<string, unknown>) {
    setSaving(true);
    await fetch(`/api/platform/tickets/${ticketId}`, {
      method: "POST",
      headers: jsonMutationHeaders(),
      body: JSON.stringify(fields),
    });
    await loadTicket();
    setSaving(false);
  }

  async function sendReply() {
    if (!reply.trim()) return;
    setSaving(true);
    await fetch(`/api/platform/tickets/${ticketId}`, {
      method: "POST",
      headers: jsonMutationHeaders(),
      body: JSON.stringify({ action: "reply", body: reply }),
    });
    setReply("");
    await loadTicket();
    setSaving(false);
  }

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!ticket) {
    return <Typography color="error">Ticket non trovato</Typography>;
  }

  const platformService = getPlatformService("tickets");
  const viewTheme = getServiceViewTheme(
    "tickets",
    "elenco",
    "Ticket & Assistenza",
    serviceColor,
    platformService?.gradient
  );

  return (
    <Box component={motion.div} variants={hubFadeUp} initial="hidden" animate="show">
      <ServiceViewHero theme={{ ...viewTheme, title: ticket.subject, subtitle: `${ticket.code} · ${new Date(ticket.createdAt).toLocaleString("it-IT")}` }} badge={ticket.status.replace(/_/g, " ")}>
        <IconButton size="small" onClick={onBack} sx={{ color: "#fff", mr: 0.5 }}>
          <ArrowBackIcon />
        </IconButton>
        <Button
          component="a"
          href={`/api/platform/tickets/${ticketId}/pdf`}
          target="_blank"
          size="small"
          startIcon={<PictureAsPdfIcon />}
          sx={{ bgcolor: "rgba(255,255,255,0.15)", color: "#fff", fontWeight: 600 }}
        >
          PDF
        </Button>
        <AiSparkButton scope="tickets" action="summarize" entityId={ticketId} label="Riassumi" inline={false} />
        <AiSparkButton scope="tickets" action="draft" entityId={ticketId} label="Bozza risposta" inline={false} onResult={(t) => setReply(t)} />
        <AiSparkButton scope="tickets" action="triage" entityId={ticketId} label="Triage" inline={false} />
      </ServiceViewHero>

      <Paper sx={[shellPaperSx, { p: 2.5, mb: 3, mt: 2 }]}>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 2 }}>
          <TextField
            select
            size="small"
            label="Stato"
            value={ticket.status}
            onChange={(e) => updateField({ status: e.target.value })}
            sx={{ minWidth: 180 }}
          >
            {STATUS_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </TextField>
          <Chip
            label={PRIORITY_LABELS[ticket.priority] || ticket.priority}
            size="small"
            sx={{
              alignSelf: "center",
              background: `${PRIORITY_COLORS[ticket.priority] || "#64748b"}22`,
              color: PRIORITY_COLORS[ticket.priority] || "#64748b",
              fontWeight: 600,
            }}
          />
          {slaState(ticket.slaDueAt) && (
            <Chip
              size="small"
              label={slaLabel(ticket.slaDueAt)}
              color={slaState(ticket.slaDueAt) === "breached" ? "error" : slaState(ticket.slaDueAt) === "risk" ? "warning" : "success"}
              sx={{ alignSelf: "center", fontWeight: 600 }}
            />
          )}
          <Chip label={ticket.type} size="small" variant="outlined" />
        </Box>
        {(ticket.customerName || ticket.customerEmail) && (
          <Typography variant="body2" color="text.secondary">
            Cliente: {ticket.customerName || ticket.customerEmail}
          </Typography>
        )}
        {ticket.assignedTo && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Assegnato a: {ticket.assignedTo.name || ticket.assignedTo.email}
          </Typography>
        )}
      </Paper>

      <Typography sx={{ fontWeight: 600, mb: 2 }}>Conversazione</Typography>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mb: 3 }}>
        {ticket.messages.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 4, px: 2, borderRadius: 2, bgcolor: "action.hover" }}>
            <Typography color="text.secondary" sx={{ mb: 1 }}>Nessun messaggio ancora</Typography>
            <Typography variant="caption" color="text.secondary">Scrivi la prima risposta al cliente qui sotto, oppure usa AI per una bozza.</Typography>
          </Box>
        ) : (
          ticket.messages.map((m) => (
            <Box
              key={m.id}
              sx={(theme) => {
                const t = getShellTokens(theme);
                return {
                  display: "flex",
                  gap: 1.5,
                  p: 2,
                  borderRadius: 2,
                  background: t.panel,
                  border: t.border,
                };
              }}
            >
              <Avatar sx={{ width: 32, height: 32, fontSize: "0.75rem", background: serviceColor }}>
                {m.authorName.charAt(0).toUpperCase()}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                  <Typography sx={{ fontWeight: 600, fontSize: "0.825rem" }}>{m.authorName}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(m.createdAt).toLocaleString("it-IT")}
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: "0.875rem", mt: 0.5, whiteSpace: "pre-wrap" }}>
                  {m.body}
                </Typography>
              </Box>
            </Box>
          ))
        )}
      </Box>

      <Divider sx={(theme) => ({ mb: 2, borderColor: getShellTokens(theme).borderColor })} />
      <Box sx={{ display: "flex", gap: 1, alignItems: "flex-end" }}>
        <TextField
          fullWidth
          multiline
          rows={2}
          size="small"
          placeholder="Scrivi una risposta…"
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.ctrlKey) sendReply();
          }}
        />
        <IconButton
          onClick={sendReply}
          disabled={saving || !reply.trim()}
          sx={{
            background: serviceColor,
            color: "#fff",
            borderRadius: 2,
            width: 44,
            height: 44,
            "&:hover": { background: serviceColor, opacity: 0.9 },
            "&:disabled": { opacity: 0.4, color: "#fff" },
          }}
        >
          {saving ? <CircularProgress size={18} sx={{ color: "#fff" }} /> : <SendIcon fontSize="small" />}
        </IconButton>
      </Box>
    </Box>
  );
}
