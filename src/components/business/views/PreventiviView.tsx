"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Box,
  Typography,
  Button,
  TextField,
  InputAdornment,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  CircularProgress,
  Grid,
  Alert,
} from "@mui/material";
import { motion } from "framer-motion";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import SendIcon from "@mui/icons-material/Send";
import WebQuoteDialog from "@/components/business/WebQuoteDialog";
import {
  WEB_QUOTE_STATUS_COLORS,
  WEB_QUOTE_STATUS_LABELS,
} from "@/lib/business/web-quote-types";
import { clientDisplayName, formatEuro } from "@/lib/business/web-quote-utils";
import { readJsonResponse } from "@/lib/fetch-client";
import { getShellTokens, shellPanelSx } from "@/theme/shell-tokens";

interface QuoteRow {
  id: string;
  number: string;
  title: string;
  status: string;
  total: number;
  validUntil?: string | null;
  createdAt: string;
  projectType: string;
  includePackages: boolean;
  client: { id: string; name: string; companyName?: string | null };
  _count: { items: number };
}

interface Stats {
  total: number;
  pipelineValue: number;
  acceptedValue: number;
  byStatus: Record<string, number>;
}

export default function PreventiviView() {
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, pipelineValue: 0, acceptedValue: 0, byStatus: {} });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [openDialog, setOpenDialog] = useState(false);
  const [editId, setEditId] = useState<string | undefined>();
  const [menu, setMenu] = useState<{ el: HTMLElement; id: string } | null>(null);
  const [fetchError, setFetchError] = useState("");

  const fetchQuotes = useCallback(async () => {
    setLoading(true);
    setFetchError("");
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("q", search.trim());
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/business/preventivi?${params}`);
      const data = await readJsonResponse<{
        quotes?: QuoteRow[];
        stats?: Stats;
        error?: string;
      }>(res);
      if (!res.ok || !data) {
        throw new Error(data?.error || "Risposta non valida dal server");
      }
      setQuotes(data.quotes || []);
      setStats(data.stats || { total: 0, pipelineValue: 0, acceptedValue: 0, byStatus: {} });
    } catch (e) {
      setQuotes([]);
      setStats({ total: 0, pipelineValue: 0, acceptedValue: 0, byStatus: {} });
      setFetchError(e instanceof Error ? e.message : "Errore caricamento preventivi");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    const t = setTimeout(fetchQuotes, 250);
    return () => clearTimeout(t);
  }, [fetchQuotes]);

  function openPdf(id: string, number: string) {
    window.open(`/api/business/preventivi/${id}/pdf`, "_blank");
  }

  async function duplicateQuote(id: string) {
    await fetch(`/api/business/preventivi/${id}/duplicate`, { method: "POST" });
    fetchQuotes();
  }

  async function markSent(id: string) {
    await fetch(`/api/business/preventivi/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_sent" }),
    });
    fetchQuotes();
  }

  async function removeQuote(id: string) {
    if (!confirm("Eliminare questo preventivo?")) return;
    await fetch(`/api/business/preventivi/${id}`, { method: "DELETE" });
    fetchQuotes();
  }

  const premiumFeatures = [
    "PDF brandizzato",
    "Pacchetti comparativi",
    "Timeline progetto",
    "Template web agency",
    "Duplica & invia",
  ];

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 3, gap: 2, flexWrap: "wrap" }}>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
            <AutoAwesomeIcon sx={{ color: "#8b5cf6", fontSize: 20 }} />
            <Typography sx={{ fontWeight: 700, fontSize: "1.5rem", letterSpacing: "-0.02em" }}>
              Preventivi Web Agency
            </Typography>
            <Chip label="Premium" size="small" sx={{ height: 22, fontWeight: 700, bgcolor: "rgba(139,92,246,0.15)", color: "#8b5cf6" }} />
          </Box>
          <Typography color="text.secondary" sx={{ fontSize: "0.875rem" }}>
            Crea proposte commerciali professionali con PDF curati per siti, e-commerce e progetti digitali.
          </Typography>
        </motion.div>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => { setEditId(undefined); setOpenDialog(true); }}
          sx={{
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            boxShadow: "0 4px 16px rgba(99,102,241,0.3)",
          }}
        >
          Nuovo preventivo
        </Button>
      </Box>

      {fetchError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {fetchError}
          {fetchError.toLowerCase().includes("webquote") || fetchError.toLowerCase().includes("does not exist") ? (
            <> — Esegui <code>npx prisma migrate deploy</code> e riavvia il dev server.</>
          ) : null}
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: "Preventivi", value: String(stats.total), color: "#6366f1" },
          { label: "Pipeline attiva", value: formatEuro(stats.pipelineValue), color: "#0ea5e9" },
          { label: "Accettati", value: formatEuro(stats.acceptedValue), color: "#10b981" },
          { label: "In bozza", value: String(stats.byStatus.DRAFT || 0), color: "#64748b" },
        ].map((kpi) => (
          <Grid key={kpi.label} size={{ xs: 6, md: 3 }}>
            <Box sx={[shellPanelSx, { p: 2, position: "relative", overflow: "hidden" }]}>
              <Box sx={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, borderRadius: "50%", bgcolor: `${kpi.color}18` }} />
              <Typography variant="caption" color="text.secondary">{kpi.label}</Typography>
              <Typography sx={{ fontWeight: 800, fontSize: "1.25rem", color: kpi.color }}>{kpi.value}</Typography>
            </Box>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
        {premiumFeatures.map((f) => (
          <Chip key={f} size="small" icon={<AutoAwesomeIcon sx={{ fontSize: "14px !important" }} />} label={f} sx={{ bgcolor: "rgba(99,102,241,0.08)" }} />
        ))}
      </Box>

      <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
        <TextField
          placeholder="Cerca preventivo o cliente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="small"
          sx={{ minWidth: 280, flex: 1 }}
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
        <TextField size="small" select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} sx={{ minWidth: 160 }}>
          <MenuItem value="">Tutti gli stati</MenuItem>
          {Object.entries(WEB_QUOTE_STATUS_LABELS).map(([k, v]) => (
            <MenuItem key={k} value={k}>{v}</MenuItem>
          ))}
        </TextField>
      </Box>

      <Box sx={[shellPanelSx, { overflow: "hidden" }]}>
        <Box
          sx={(theme) => {
            const t = getShellTokens(theme);
            return {
              display: "grid",
              gridTemplateColumns: "1.2fr 1.4fr 0.8fr 0.8fr 0.8fr 40px",
              px: 2,
              py: 1.5,
              borderBottom: t.border,
              background: t.rowHover,
            };
          }}
        >
          {["Numero", "Cliente / Progetto", "Totale", "Validità", "Stato", ""].map((h) => (
            <Typography key={h} variant="caption" sx={{ fontWeight: 600, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {h}
            </Typography>
          ))}
        </Box>

        {loading ? (
          <Box sx={{ py: 6, textAlign: "center" }}><CircularProgress size={24} /></Box>
        ) : quotes.length === 0 ? (
          <Box sx={{ py: 6, textAlign: "center" }}>
            <Typography color="text.secondary">Nessun preventivo. Crea il primo per la tua web agency.</Typography>
          </Box>
        ) : (
          quotes.map((quote) => (
            <Box
              key={quote.id}
              sx={(theme) => ({
                display: "grid",
                gridTemplateColumns: "1.2fr 1.4fr 0.8fr 0.8fr 0.8fr 40px",
                px: 2,
                py: 1.75,
                alignItems: "center",
                borderBottom: getShellTokens(theme).border,
                "&:hover": { bgcolor: getShellTokens(theme).rowHover },
              })}
            >
              <Box>
                <Typography sx={{ fontWeight: 700, fontSize: "0.85rem" }}>{quote.number}</Typography>
                {quote.includePackages && (
                  <Chip label="Premium" size="small" sx={{ height: 18, fontSize: "0.6rem", mt: 0.5, bgcolor: "rgba(139,92,246,0.12)", color: "#8b5cf6" }} />
                )}
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 600, fontSize: "0.825rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {clientDisplayName(quote.client)}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {quote.title}
                </Typography>
              </Box>
              <Typography sx={{ fontWeight: 700, color: "#10b981", fontSize: "0.85rem" }}>{formatEuro(quote.total)}</Typography>
              <Typography variant="caption" color="text.secondary">
                {quote.validUntil ? new Date(quote.validUntil).toLocaleDateString("it-IT") : "—"}
              </Typography>
              <Chip
                size="small"
                label={WEB_QUOTE_STATUS_LABELS[quote.status] || quote.status}
                sx={{
                  width: "fit-content",
                  height: 24,
                  fontSize: "0.7rem",
                  bgcolor: `${WEB_QUOTE_STATUS_COLORS[quote.status] || "#64748b"}22`,
                  color: WEB_QUOTE_STATUS_COLORS[quote.status] || "#64748b",
                }}
              />
              <IconButton size="small" onClick={(e) => setMenu({ el: e.currentTarget, id: quote.id })}>
                <MoreVertIcon fontSize="small" />
              </IconButton>
            </Box>
          ))
        )}
      </Box>

      <Menu anchorEl={menu?.el} open={Boolean(menu)} onClose={() => setMenu(null)}>
        <MenuItem onClick={() => { if (menu) { setEditId(menu.id); setOpenDialog(true); } setMenu(null); }}>
          Modifica
        </MenuItem>
        <MenuItem onClick={() => { if (menu) openPdf(menu.id, ""); setMenu(null); }}>
          <PictureAsPdfIcon fontSize="small" sx={{ mr: 1 }} /> Apri PDF / Stampa
        </MenuItem>
        <MenuItem onClick={() => { if (menu) duplicateQuote(menu.id); setMenu(null); }}>
          <ContentCopyIcon fontSize="small" sx={{ mr: 1 }} /> Duplica
        </MenuItem>
        <MenuItem onClick={() => { if (menu) markSent(menu.id); setMenu(null); }}>
          <SendIcon fontSize="small" sx={{ mr: 1 }} /> Segna inviato
        </MenuItem>
        <MenuItem onClick={() => { if (menu) removeQuote(menu.id); setMenu(null); }} sx={{ color: "error.main" }}>
          Elimina
        </MenuItem>
      </Menu>

      <WebQuoteDialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        onSaved={fetchQuotes}
        quoteId={editId}
      />
    </Box>
  );
}
