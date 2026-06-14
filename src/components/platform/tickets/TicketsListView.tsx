"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Box, Typography, Button, TextField, InputAdornment, Chip,
  TablePagination, CircularProgress, Avatar, Tooltip, Stack, IconButton,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import ConfirmationNumberOutlinedIcon from "@mui/icons-material/ConfirmationNumberOutlined";
import { motion } from "framer-motion";
import { getShellTokens, shellPanelSx } from "@/theme/shell-tokens";
import { getPlatformService } from "@/config/platform-services";
import ServiceViewHero from "../service-shell/ServiceViewHero";
import { getServiceViewTheme } from "../service-shell/service-view-themes";
import type { TicketRow } from "@/lib/platform/tickets-service";
import {
  VIEW_TITLES, STATUS_LABELS, PRIORITY_LABELS, PRIORITY_COLORS,
  CHANNEL_LABELS, customerLabel, slaLabel, slaState, statusColor,
} from "./tickets-utils";

interface Props {
  viewId: string;
  serviceColor: string;
  onOpenTicket: (id: string) => void;
  onNew?: () => void;
  onRefresh?: () => void;
}

export default function TicketsListView({ viewId, serviceColor, onOpenTicket, onNew, onRefresh }: Props) {
  const [rows, setRows] = useState<TicketRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page + 1),
      limit: String(rowsPerPage),
      view: viewId,
      q: search,
    });
    const res = await fetch(`/api/platform/tickets?${params}`);
    const data = await res.json();
    setRows(data.items || []);
    setTotal(data.total || 0);
    setLoading(false);
  }, [page, rowsPerPage, search, viewId]);

  useEffect(() => {
    const t = setTimeout(fetchRows, 250);
    return () => clearTimeout(t);
  }, [fetchRows]);

  useEffect(() => {
    const onMutated = () => fetchRows();
    window.addEventListener("coresuite:data-mutated", onMutated);
    return () => window.removeEventListener("coresuite:data-mutated", onMutated);
  }, [fetchRows]);

  const platformService = getPlatformService("tickets");
  const viewTheme = getServiceViewTheme(
    "tickets",
    viewId,
    "Ticket & Assistenza",
    serviceColor,
    platformService?.gradient
  );

  const title = VIEW_TITLES[viewId] || "Ticket";

  return (
    <Box sx={{ minWidth: 0, maxWidth: "100%" }}>
      <ServiceViewHero theme={{ ...viewTheme, title, subtitle: `${total} ticket · ricerca e gestione operativa` }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
          <TextField
            size="small"
            placeholder="Cerca codice, oggetto, cliente…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ opacity: 0.7, fontSize: 20, color: "#fff" }} />
                  </InputAdornment>
                ),
                sx: { bgcolor: "rgba(255,255,255,0.15)", borderRadius: 2, color: "#fff" },
              },
            }}
            sx={{ minWidth: 220 }}
          />
          <Tooltip title="Export CSV">
            <IconButton
              component="a"
              href={`/api/platform/tickets/export?view=${viewId}`}
              target="_blank"
              size="small"
              sx={{ color: "#fff" }}
            >
              <FileDownloadIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Aggiorna">
            <IconButton size="small" onClick={() => { fetchRows(); onRefresh?.(); }} sx={{ color: "#fff" }}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          {onNew && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={onNew}
              sx={{ bgcolor: "#fff", color: serviceColor, fontWeight: 700 }}
            >
              Nuovo ticket
            </Button>
          )}
        </Stack>
      </ServiceViewHero>

      <Box sx={[shellPanelSx, { overflow: "hidden", mt: 2 }]}>
        <Box sx={(theme) => ({
          display: "grid",
          gridTemplateColumns: "0.9fr 1.4fr 0.9fr 0.8fr 0.8fr 0.9fr 0.7fr",
          px: 2, py: 1.5,
          borderBottom: getShellTokens(theme).border,
          bgcolor: "action.hover",
        })}>
          {["Codice", "Oggetto", "Cliente", "Stato", "Priorità", "SLA", "Canale"].map((h) => (
            <Typography key={h} variant="caption" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              {h}
            </Typography>
          ))}
        </Box>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress size={28} sx={{ color: serviceColor }} />
          </Box>
        ) : rows.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 8, px: 3 }}>
            <ConfirmationNumberOutlinedIcon sx={{ fontSize: 48, color: "text.disabled", mb: 1 }} />
            <Typography sx={{ fontWeight: 600, mb: 0.5 }}>Nessun ticket in questa vista</Typography>
            <Typography color="text.secondary" sx={{ fontSize: "0.875rem", mb: 2 }}>
              {search ? "Prova a modificare i criteri di ricerca." : "Crea il primo ticket o attendi richieste dal portale clienti."}
            </Typography>
            {onNew && (
              <Button variant="contained" startIcon={<AddIcon />} onClick={onNew} sx={{ background: serviceColor }}>
                Nuovo ticket
              </Button>
            )}
          </Box>
        ) : (
          rows.map((row, i) => {
            const sla = slaState(row.slaDueAt);
            return (
              <Box
                key={row.id}
                component={motion.div}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                onClick={() => onOpenTicket(row.id)}
                sx={(theme) => ({
                  display: "grid",
                  gridTemplateColumns: "0.9fr 1.4fr 0.9fr 0.8fr 0.8fr 0.9fr 0.7fr",
                  px: 2, py: 1.5,
                  alignItems: "center",
                  cursor: "pointer",
                  borderBottom: getShellTokens(theme).border,
                  "&:hover": { bgcolor: "action.hover" },
                })}
              >
                <Typography sx={{ fontWeight: 700, fontSize: "0.825rem", fontFamily: "monospace" }}>{row.code}</Typography>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 600, fontSize: "0.825rem" }} noWrap>{row.subject}</Typography>
                  {row._count?.messages ? (
                    <Typography variant="caption" color="text.secondary">{row._count.messages} messaggi</Typography>
                  ) : null}
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
                  <Avatar sx={{ width: 26, height: 26, fontSize: "0.7rem", bgcolor: serviceColor }}>
                    {customerLabel(row).charAt(0).toUpperCase()}
                  </Avatar>
                  <Typography variant="caption" noWrap>{customerLabel(row)}</Typography>
                </Box>
                <Chip size="small" label={STATUS_LABELS[row.status] || row.status} sx={{ width: "fit-content", height: 24, fontSize: "0.7rem", bgcolor: `${statusColor(row.status)}22`, color: statusColor(row.status) }} />
                <Chip size="small" label={PRIORITY_LABELS[row.priority] || row.priority} sx={{ width: "fit-content", height: 24, fontSize: "0.7rem", bgcolor: `${PRIORITY_COLORS[row.priority]}22`, color: PRIORITY_COLORS[row.priority] }} />
                <Tooltip title={slaLabel(row.slaDueAt)}>
                  <Chip
                    size="small"
                    label={sla === "breached" ? "Scaduto" : sla === "risk" ? "A rischio" : sla === "ok" ? "OK" : "—"}
                    color={sla === "breached" ? "error" : sla === "risk" ? "warning" : "default"}
                    sx={{ width: "fit-content", height: 24, fontSize: "0.7rem" }}
                  />
                </Tooltip>
                <Typography variant="caption" color="text.secondary">{CHANNEL_LABELS[row.channel] || row.channel}</Typography>
              </Box>
            );
          })
        )}

        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          labelRowsPerPage="Righe"
        />
      </Box>
    </Box>
  );
}
