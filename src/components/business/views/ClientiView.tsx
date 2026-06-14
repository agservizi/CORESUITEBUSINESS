"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Box, Typography, Button, TextField, InputAdornment,
  Chip, Avatar, Menu, MenuItem, IconButton, Select, FormControl,
  TablePagination,
} from "@mui/material";
import { motion } from "framer-motion";
import { useBusinessNavigation } from "@/context/BusinessNavigationProvider";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import BusinessIcon from "@mui/icons-material/Business";
import PersonIcon from "@mui/icons-material/Person";
import ClientDialog from "@/components/business/ClientDialog";
import { getShellTokens, shellMenuPaperSx, shellPanelSx } from "@/theme/shell-tokens";

interface Client {
  id: string;
  name: string;
  companyName?: string;
  email?: string;
  phone?: string;
  city?: string;
  type: string;
  status: string;
  tags: string[];
  createdAt: string;
  _count: { leads: number; deals: number };
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "#10b981", INACTIVE: "#64748b", PROSPECT: "#f59e0b", CHURNED: "#ef4444",
};
const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Attivo", INACTIVE: "Inattivo", PROSPECT: "Prospect", CHURNED: "Perso",
};

const ROWS_PER_PAGE_OPTIONS = [10, 20, 50, 100] as const;

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export default function ClientiView() {
  const { openDetail } = useBusinessNavigation();
  const [clients, setClients] = useState<Client[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [openNew, setOpenNew] = useState(false);
  const [editClientId, setEditClientId] = useState<string | undefined>();
  const [menuAnchor, setMenuAnchor] = useState<{ el: HTMLElement; id: string } | null>(null);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      q: search,
      page: String(page + 1),
      limit: String(rowsPerPage),
      ...(statusFilter && { status: statusFilter }),
    });
    const res = await fetch(`/api/business/clienti?${params}`);
    const data = await res.json();
    setClients(data.clients || []);
    setTotal(data.total || 0);
    setLoading(false);
  }, [search, statusFilter, page, rowsPerPage]);

  const pageCount = Math.max(1, Math.ceil(total / rowsPerPage));
  const safePage = total === 0 ? 0 : Math.min(page, pageCount - 1);

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage]);

  useEffect(() => {
    const t = setTimeout(fetchClients, 300);
    return () => clearTimeout(t);
  }, [fetchClients]);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Typography sx={{ fontWeight: 700, fontSize: "1.5rem", letterSpacing: "-0.02em" }}>
            Clienti
          </Typography>
          <Typography color="text.secondary" sx={{ fontSize: "0.875rem" }}>
            {total} clienti totali
            {total > 0 && (
              <> · pagina {safePage + 1} di {pageCount}</>
            )}
          </Typography>
        </motion.div>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => { setEditClientId(undefined); setOpenNew(true); }}
          sx={{
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            boxShadow: "0 4px 16px rgba(99,102,241,0.3)",
            "&:hover": { background: "linear-gradient(135deg, #4f46e5, #7c3aed)" },
          }}
        >
          Nuovo cliente
        </Button>
      </Box>

      {/* Filters */}
      <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
        <TextField
          placeholder="Cerca clienti..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
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
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <Select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(0);
            }}
            displayEmpty
            sx={{ fontSize: "0.825rem" }}
          >
            <MenuItem value="">Tutti gli stati</MenuItem>
            <MenuItem value="ACTIVE">Attivo</MenuItem>
            <MenuItem value="PROSPECT">Prospect</MenuItem>
            <MenuItem value="INACTIVE">Inattivo</MenuItem>
            <MenuItem value="CHURNED">Perso</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Table */}
      <Box sx={[shellPanelSx, { overflow: "hidden" }]}>
        {/* Table header */}
        <Box
          sx={(theme) => {
            const t = getShellTokens(theme);
            return {
              display: "grid",
              gridTemplateColumns: "2fr 1fr 1fr 1fr 80px 40px",
              px: 2,
              py: 1.5,
              borderBottom: t.border,
              background: t.rowHover,
            };
          }}
        >
          {["Cliente", "Stato", "Città", "Lead / Deal", "Tag", ""].map((h) => (
            <Typography key={h} variant="caption" sx={{ fontWeight: 600, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {h}
            </Typography>
          ))}
        </Box>

        {/* Rows */}
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Box key={i} sx={(theme) => {
              const t = getShellTokens(theme);
              return {
                height: 60,
                borderBottom: t.border,
                display: "flex",
                alignItems: "center",
                px: 2,
                gap: 2,
              };
            }}>
              <Avatar sx={(theme) => ({ width: 32, height: 32, bgcolor: getShellTokens(theme).skeleton })} />
              <Box sx={(theme) => ({ flex: 1, height: 12, bgcolor: getShellTokens(theme).skeleton, borderRadius: 1 })} />
            </Box>
          ))
        ) : clients.length === 0 ? (
          <Box sx={{ py: 6, textAlign: "center" }}>
            <Typography color="text.secondary">Nessun cliente trovato</Typography>
          </Box>
        ) : (
          clients.map((client, i) => (
            <motion.div
              key={client.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.03 }}
            >
              <Box
                onClick={() => openDetail(client.id)}
                sx={(theme) => {
                  const t = getShellTokens(theme);
                  return {
                    display: "grid",
                    gridTemplateColumns: "2fr 1fr 1fr 1fr 80px 40px",
                    px: 2,
                    py: 1.5,
                    borderBottom: t.border,
                    alignItems: "center",
                    cursor: "pointer",
                    "&:hover": { background: t.rowHover },
                    "&:last-child": { borderBottom: "none" },
                  };
                }}
              >
                {/* Client name */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
                  <Avatar
                    sx={{
                      width: 34,
                      height: 34,
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      flexShrink: 0,
                      background: `linear-gradient(135deg, ${STATUS_COLORS[client.status]}66, ${STATUS_COLORS[client.status]}33)`,
                      color: STATUS_COLORS[client.status],
                    }}
                  >
                    {getInitials(client.name)}
                  </Avatar>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 600, fontSize: "0.825rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {client.companyName || client.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {client.email || "—"}
                    </Typography>
                  </Box>
                </Box>

                {/* Status */}
                <Box>
                  <Chip
                    label={STATUS_LABELS[client.status]}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: "0.65rem",
                      fontWeight: 600,
                      background: `${STATUS_COLORS[client.status]}18`,
                      color: STATUS_COLORS[client.status],
                      border: `1px solid ${STATUS_COLORS[client.status]}33`,
                    }}
                  />
                </Box>

                {/* City */}
                <Typography sx={{ fontSize: "0.825rem", color: "text.secondary" }}>
                  {client.city || "—"}
                </Typography>

                {/* Counts */}
                <Box sx={{ display: "flex", gap: 1.5 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <PersonIcon sx={{ fontSize: 14, color: "text.secondary" }} />
                    <Typography variant="caption" color="text.secondary">{client._count.leads}</Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <BusinessIcon sx={{ fontSize: 14, color: "text.secondary" }} />
                    <Typography variant="caption" color="text.secondary">{client._count.deals}</Typography>
                  </Box>
                </Box>

                {/* Tags */}
                <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                  {client.tags.slice(0, 2).map((tag) => (
                    <Chip key={tag} label={tag} size="small" sx={{ height: 18, fontSize: "0.6rem", background: "rgba(99,102,241,0.1)", color: "primary.light", border: "none" }} />
                  ))}
                </Box>

                {/* Actions */}
                <IconButton size="small" sx={{ color: "text.secondary" }} onClick={(e) => { e.stopPropagation(); setMenuAnchor({ el: e.currentTarget, id: client.id }); }}>
                  <MoreVertIcon fontSize="small" />
                </IconButton>
              </Box>
            </motion.div>
          ))
        )}
        <TablePagination
          component="div"
          count={total}
          page={safePage}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[...ROWS_PER_PAGE_OPTIONS]}
          labelRowsPerPage="Righe per pagina"
          labelDisplayedRows={({ from, to, count }) =>
            count === 0 ? "0 clienti" : `${from}–${to} di ${count}`
          }
          sx={{
            borderTop: (theme) => getShellTokens(theme).border,
            "& .MuiTablePagination-toolbar": { px: 2 },
            "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": {
              fontSize: "0.825rem",
            },
          }}
        />
      </Box>

      {/* Context menu */}
      <Menu
        anchorEl={menuAnchor?.el}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
        slotProps={{ paper: { sx: [shellMenuPaperSx, { minWidth: 160 }] } }}
      >
        <MenuItem onClick={() => { if (menuAnchor) openDetail(menuAnchor.id); setMenuAnchor(null); }} sx={{ fontSize: "0.825rem" }}>Visualizza</MenuItem>
        <MenuItem onClick={() => { if (menuAnchor) { setEditClientId(menuAnchor.id); setOpenNew(true); } setMenuAnchor(null); }} sx={{ fontSize: "0.825rem" }}>Modifica</MenuItem>
        <MenuItem
          onClick={async () => {
            if (!menuAnchor) return;
            const id = menuAnchor.id;
            setMenuAnchor(null);
            if (!confirm("Eliminare questo cliente?")) return;
            const res = await fetch(`/api/business/clienti/${id}`, { method: "DELETE" });
            if (res.ok) {
              if (clients.length === 1 && page > 0) setPage((p) => p - 1);
              else fetchClients();
            }
          }}
          sx={{ fontSize: "0.825rem", color: "error.main" }}
        >
          Elimina
        </MenuItem>
      </Menu>

      <ClientDialog
        open={openNew}
        onClose={() => { setOpenNew(false); setEditClientId(undefined); }}
        onSaved={fetchClients}
        clientId={editClientId}
      />
    </Box>
  );
}
