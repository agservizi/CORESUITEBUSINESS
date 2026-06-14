"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Box, Typography, Button, TextField, InputAdornment, Chip,
  TablePagination, CircularProgress,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import { motion } from "framer-motion";
import { getShellTokens, shellPanelSx } from "@/theme/shell-tokens";
import { jsonMutationHeaders } from "@/lib/csrf-client";
import {
  CATEGORY_LABELS, CATEGORY_COLORS, customerLabel, money, statusColor,
  type OpportunityRow,
} from "./opportunities-utils";
import OpportunityDetailDrawer from "./OpportunityDetailDrawer";
import OpportunityHealthBadge from "./OpportunityHealthBadge";

interface Props {
  viewId: string;
  serviceColor: string;
  onRefresh?: () => void;
  onNew?: () => void;
}

const VIEW_TITLES: Record<string, string> = {
  elenco: "Elenco contratti",
  telefonia: "Contratti Telefonia",
  luce: "Contratti Luce",
  gas: "Contratti Gas",
  verifica: "In verifica",
  attivati: "Attivati",
  annullati: "Annullati",
  attivi: "Contratti attivi",
  documenti: "Documenti OK",
  firma: "In firma OTP",
};

export default function OpportunitiesListView({ viewId, serviceColor, onRefresh, onNew }: Props) {
  const [rows, setRows] = useState<OpportunityRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<OpportunityRow | null>(null);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page + 1),
      limit: String(rowsPerPage),
      view: viewId,
      q: search,
    });
    const res = await fetch(`/api/platform/opportunities?${params}`);
    const data = await res.json();
    setRows(data.items || []);
    setTotal(data.total || 0);
    setLoading(false);
  }, [page, rowsPerPage, search, viewId]);

  useEffect(() => {
    const t = setTimeout(fetchRows, 250);
    return () => clearTimeout(t);
  }, [fetchRows]);

  async function handleStatusChange(id: string, statusCode: string) {
    await fetch(`/api/platform/opportunities/${id}`, {
      method: "PATCH",
      headers: jsonMutationHeaders(),
      body: JSON.stringify({ statusCode }),
    });
    await fetchRows();
    onRefresh?.();
    if (detail?.id === id) {
      setDetail((d) => (d ? { ...d, statusCode, statusLabel: undefined } : d));
    }
  }

  const title = VIEW_TITLES[viewId] || "Elenco contratti";

  return (
    <Box sx={{ minWidth: 0, maxWidth: "100%" }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 3, gap: 2, flexWrap: "wrap" }}>
        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: "1.5rem" }}>{title}</Typography>
          <Typography color="text.secondary" sx={{ fontSize: "0.875rem" }}>{total} totali</Typography>
        </Box>
        {onNew && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={onNew}
            sx={{ background: serviceColor }}
          >
            Nuovo contratto
          </Button>
        )}
      </Box>

      <TextField
        size="small"
        placeholder="Cerca codice, cliente, CF, gestore..."
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(0); }}
        sx={{ mb: 2, minWidth: 280 }}
        slotProps={{
          input: {
            startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18 }} /></InputAdornment>,
          },
        }}
      />

      <Box sx={[shellPanelSx, { overflow: "hidden" }]}>
        <Box sx={(theme) => ({
          display: "grid",
          gridTemplateColumns: "1fr 1.3fr 0.85fr 1fr 0.9fr 1fr 0.95fr",
          px: 2, py: 1.5,
          borderBottom: getShellTokens(theme).border,
          background: getShellTokens(theme).rowHover,
        })}>
          {["Codice", "Cliente", "Categoria", "Gestore", "Commissione", "Salute", "Stato"].map((h) => (
            <Typography key={h} variant="caption" sx={{ fontWeight: 600, color: "text.secondary", textTransform: "uppercase" }}>{h}</Typography>
          ))}
        </Box>

        {loading ? (
          <Box sx={{ py: 6, display: "flex", justifyContent: "center" }}><CircularProgress size={28} /></Box>
        ) : rows.length === 0 ? (
          <Typography sx={{ py: 6, textAlign: "center", color: "text.secondary" }}>Nessun contratto</Typography>
        ) : (
          rows.map((row, i) => {
            const stColor = row.statusColor || statusColor(row.statusCode);
            return (
              <motion.div key={row.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}>
                <Box
                  onClick={() => setDetail(row)}
                  sx={(theme) => ({
                    display: "grid",
                    gridTemplateColumns: "1fr 1.3fr 0.85fr 1fr 0.9fr 1fr 0.95fr",
                    px: 2, py: 1.5, alignItems: "center", cursor: "pointer",
                    borderBottom: getShellTokens(theme).border,
                    "&:hover": { background: getShellTokens(theme).rowHover },
                  })}
                >
                  <Typography sx={{ fontWeight: 600, fontSize: "0.825rem", fontFamily: "monospace" }} noWrap>{row.code}</Typography>
                  <Typography sx={{ fontSize: "0.825rem", color: "text.secondary" }} noWrap>{customerLabel(row)}</Typography>
                  <Chip
                    label={CATEGORY_LABELS[row.category]}
                    size="small"
                    sx={{ width: "fit-content", height: 22, fontSize: "0.65rem", fontWeight: 700, background: `${CATEGORY_COLORS[row.category]}18`, color: CATEGORY_COLORS[row.category] }}
                  />
                  <Typography sx={{ fontSize: "0.825rem" }} noWrap>{row.providerLabel}</Typography>
                  <Typography sx={{ fontSize: "0.825rem", fontWeight: 600, color: "#10b981" }}>{money(row.commission)}</Typography>
                  <Box><OpportunityHealthBadge row={row} showScore={false} /></Box>
                  <Chip
                    label={row.statusLabel || row.statusCode}
                    size="small"
                    sx={{ width: "fit-content", height: 22, fontSize: "0.65rem", fontWeight: 700, background: `${stColor}18`, color: stColor }}
                  />
                </Box>
              </motion.div>
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
          rowsPerPageOptions={[10, 20, 50]}
          labelRowsPerPage="Righe"
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} di ${count}`}
        />
      </Box>

      <OpportunityDetailDrawer
        open={Boolean(detail)}
        row={detail}
        onClose={() => setDetail(null)}
        onStatusChange={handleStatusChange}
        onUpdated={fetchRows}
      />
    </Box>
  );
}
