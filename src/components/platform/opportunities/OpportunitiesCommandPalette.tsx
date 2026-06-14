"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Dialog, DialogContent, TextField, InputAdornment, List, ListItemButton,
  ListItemText, Typography, Chip, Box, Divider,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import DashboardIcon from "@mui/icons-material/Dashboard";
import ViewKanbanIcon from "@mui/icons-material/ViewKanban";
import AddIcon from "@mui/icons-material/Add";
import { CATEGORY_LABELS, customerLabel, type OpportunityRow } from "./opportunities-utils";

interface Props {
  open: boolean;
  onClose: () => void;
  onNavigate: (viewId: string) => void;
  onOpenContract: (row: OpportunityRow) => void;
  serviceColor: string;
}

const QUICK_VIEWS = [
  { id: "dashboard", label: "Dashboard", icon: DashboardIcon },
  { id: "pipeline", label: "Pipeline Kanban", icon: ViewKanbanIcon },
  { id: "nuovo", label: "Nuovo contratto", icon: AddIcon },
  { id: "verifica", label: "In verifica", icon: SearchIcon },
  { id: "documenti", label: "Documenti OK", icon: SearchIcon },
  { id: "firma", label: "In firma OTP", icon: SearchIcon },
  { id: "classifica", label: "Classifica collaboratori", icon: DashboardIcon },
  { id: "report", label: "Report commissioni", icon: DashboardIcon },
];

export default function OpportunitiesCommandPalette({
  open,
  onClose,
  onNavigate,
  onOpenContract,
  serviceColor,
}: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<OpportunityRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
    }
  }, [open]);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({ q: q.trim(), limit: "8", page: "1", view: "elenco" });
      const res = await fetch(`/api/platform/opportunities?${params}`);
      const data = await res.json();
      setResults(data.items || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(query), 200);
    return () => clearTimeout(t);
  }, [query, search]);

  function pickView(viewId: string) {
    onNavigate(viewId);
    onClose();
  }

  function pickContract(row: OpportunityRow) {
    onOpenContract(row);
    onClose();
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: 3, overflow: "hidden" } } }}>
      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
          <TextField
            autoFocus
            fullWidth
            size="small"
            placeholder="Cerca contratti, clienti, codici… (Ctrl+K)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: serviceColor }} />
                  </InputAdornment>
                ),
              },
            }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
            Naviga velocemente o apri un contratto
          </Typography>
        </Box>

        {!query.trim() && (
          <List dense disablePadding sx={{ py: 1 }}>
            {QUICK_VIEWS.map((v) => (
              <ListItemButton key={v.id} onClick={() => pickView(v.id)}>
                <v.icon sx={{ mr: 1.5, fontSize: 20, color: serviceColor }} />
                <ListItemText primary={v.label} />
              </ListItemButton>
            ))}
          </List>
        )}

        {query.trim() && (
          <List dense disablePadding sx={{ py: 1, maxHeight: 360, overflow: "auto" }}>
            {loading && (
              <Typography sx={{ px: 2, py: 2, color: "text.secondary", fontSize: "0.875rem" }}>Ricerca…</Typography>
            )}
            {!loading && results.length === 0 && (
              <Typography sx={{ px: 2, py: 2, color: "text.secondary", fontSize: "0.875rem" }}>Nessun risultato</Typography>
            )}
            {results.map((row) => (
              <ListItemButton key={row.id} onClick={() => pickContract(row)}>
                <ListItemText
                  primary={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography component="span" sx={{ fontFamily: "monospace", fontWeight: 700, fontSize: "0.85rem" }}>
                        {row.code}
                      </Typography>
                      <Chip label={CATEGORY_LABELS[row.category]} size="small" sx={{ height: 20, fontSize: "0.6rem" }} />
                    </Box>
                  }
                  secondary={`${customerLabel(row)} · ${row.statusLabel || row.statusCode}`}
                />
              </ListItemButton>
            ))}
          </List>
        )}

        <Divider />
        <Box sx={{ px: 2, py: 1, display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Typography variant="caption" color="text.secondary">Esc chiudi</Typography>
          <Typography variant="caption" color="text.secondary">·</Typography>
          <Typography variant="caption" color="text.secondary">Ctrl+K apri</Typography>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
