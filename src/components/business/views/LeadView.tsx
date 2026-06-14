"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Box, Typography, Button, TextField, InputAdornment,
  Chip, Select, MenuItem, FormControl,
} from "@mui/material";
import { motion } from "framer-motion";
import { useBusinessNavigation } from "@/context/BusinessNavigationProvider";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import EuroIcon from "@mui/icons-material/Euro";
import NewLeadDialog from "@/components/business/NewLeadDialog";
import { getShellTokens, shellPanelSx } from "@/theme/shell-tokens";

interface Lead {
  id: string;
  title: string;
  status: string;
  priority: string;
  source: string;
  value?: number;
  expectedClose?: string;
  createdAt: string;
  client?: { name: string; companyName?: string };
  assignee?: { name: string; email: string };
  stage?: { name: string; color: string };
  contactName?: string;
}

const PRIORITY_COLOR: Record<string, string> = {
  LOW: "#64748b", MEDIUM: "#0ea5e9", HIGH: "#f59e0b", URGENT: "#ef4444",
};
const PRIORITY_LABEL: Record<string, string> = {
  LOW: "Bassa", MEDIUM: "Media", HIGH: "Alta", URGENT: "Urgente",
};
const STATUS_LABEL: Record<string, string> = {
  NEW: "Nuovo", CONTACTED: "Contattato", QUALIFIED: "Qualificato",
  PROPOSAL: "Proposta", NEGOTIATION: "Negoziazione", WON: "Vinto", LOST: "Perso",
};
const SOURCE_LABEL: Record<string, string> = {
  WEBSITE: "Sito web", REFERRAL: "Referral", SOCIAL: "Social", EMAIL: "Email",
  PHONE: "Telefono", EVENT: "Evento", OTHER: "Altro",
};

export default function LeadView() {
  const { openDetail } = useBusinessNavigation();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [openNew, setOpenNew] = useState(false);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ q: search, ...(statusFilter && { status: statusFilter }) });
    const res = await fetch(`/api/business/lead?${params}`);
    const data = await res.json();
    setLeads(data.leads || []);
    setTotal(data.total || 0);
    setLoading(false);
  }, [search, statusFilter]);

  useEffect(() => {
    const t = setTimeout(fetchLeads, 300);
    return () => clearTimeout(t);
  }, [fetchLeads]);

  const totalValue = leads.reduce((s, l) => s + (l.value || 0), 0);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 3 }}>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Typography sx={{ fontWeight: 700, fontSize: "1.5rem", letterSpacing: "-0.02em" }}>Lead</Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 0.5 }}>
            <Typography color="text.secondary" sx={{ fontSize: "0.875rem" }}>{total} lead totali</Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <EuroIcon sx={{ fontSize: 14, color: "#10b981" }} />
              <Typography sx={{ fontSize: "0.875rem", color: "#10b981", fontWeight: 600 }}>
                {totalValue.toLocaleString("it-IT")} in pipeline
              </Typography>
            </Box>
          </Box>
        </motion.div>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenNew(true)}
          sx={{
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            boxShadow: "0 4px 16px rgba(99,102,241,0.3)",
            "&:hover": { background: "linear-gradient(135deg, #4f46e5, #7c3aed)" },
          }}
        >
          Nuovo lead
        </Button>
      </Box>

      {/* Filters */}
      <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
        <TextField
          placeholder="Cerca lead..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="small"
          sx={{ minWidth: 280 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                </InputAdornment>
              ),
            },
          }}
        />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} displayEmpty sx={{ fontSize: "0.825rem" }}>
            <MenuItem value="">Tutti gli stati</MenuItem>
            {Object.entries(STATUS_LABEL).map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
          </Select>
        </FormControl>
      </Box>

      {/* Table */}
      <Box sx={[shellPanelSx, { overflow: "hidden" }]}>
        <Box sx={(theme) => {
          const t = getShellTokens(theme);
          return {
            display: "grid",
            gridTemplateColumns: "2.5fr 1fr 1fr 1fr 1fr 100px",
            px: 2,
            py: 1.5,
            borderBottom: t.border,
            background: t.rowHover,
          };
        }}>
          {["Lead", "Stato", "Priorità", "Fonte", "Valore", "Scadenza"].map((h) => (
            <Typography key={h} variant="caption" sx={{ fontWeight: 600, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</Typography>
          ))}
        </Box>

        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Box key={i} sx={(theme) => {
              const t = getShellTokens(theme);
              return { height: 60, borderBottom: t.border, background: t.rowHover };
            }} />
          ))
        ) : leads.length === 0 ? (
          <Box sx={{ py: 6, textAlign: "center" }}>
            <Typography color="text.secondary">Nessun lead trovato</Typography>
          </Box>
        ) : (
          leads.map((lead, i) => (
            <motion.div key={lead.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
              <Box
                onClick={() => openDetail(lead.id)}
                sx={(theme) => {
                  const t = getShellTokens(theme);
                  return {
                    display: "grid",
                    gridTemplateColumns: "2.5fr 1fr 1fr 1fr 1fr 100px",
                    px: 2, py: 1.5,
                    borderBottom: t.border,
                    alignItems: "center",
                    cursor: "pointer",
                    "&:hover": { background: t.rowHover },
                    "&:last-child": { borderBottom: "none" },
                  };
                }}
              >
                {/* Title */}
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 600, fontSize: "0.825rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {lead.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {lead.client?.companyName || lead.client?.name || lead.contactName || "—"}
                  </Typography>
                </Box>

                {/* Status */}
                <Box>
                  {lead.stage ? (
                    <Chip label={lead.stage.name} size="small" sx={{ height: 20, fontSize: "0.65rem", fontWeight: 600, background: `${lead.stage.color}18`, color: lead.stage.color, border: `1px solid ${lead.stage.color}33` }} />
                  ) : (
                    <Chip label={STATUS_LABEL[lead.status]} size="small" sx={{ height: 20, fontSize: "0.65rem", fontWeight: 600, background: "rgba(99,102,241,0.1)", color: "primary.light", border: "none" }} />
                  )}
                </Box>

                {/* Priority */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                  <Box sx={{ width: 6, height: 6, borderRadius: "50%", background: PRIORITY_COLOR[lead.priority] || "#64748b", flexShrink: 0 }} />
                  <Typography sx={{ fontSize: "0.8rem", color: PRIORITY_COLOR[lead.priority] }}>{PRIORITY_LABEL[lead.priority]}</Typography>
                </Box>

                {/* Source */}
                <Typography sx={{ fontSize: "0.8rem", color: "text.secondary" }}>{SOURCE_LABEL[lead.source] || lead.source}</Typography>

                {/* Value */}
                <Typography sx={{ fontSize: "0.825rem", fontWeight: 600, color: lead.value ? "#10b981" : "text.secondary" }}>
                  {lead.value ? `€${lead.value.toLocaleString("it-IT")}` : "—"}
                </Typography>

                {/* Expected close */}
                <Typography sx={{ fontSize: "0.775rem", color: "text.secondary" }}>
                  {lead.expectedClose ? new Date(lead.expectedClose).toLocaleDateString("it-IT", { day: "2-digit", month: "short" }) : "—"}
                </Typography>
              </Box>
            </motion.div>
          ))
        )}
      </Box>

      <NewLeadDialog open={openNew} onClose={() => setOpenNew(false)} onCreated={fetchLeads} />
    </Box>
  );
}
