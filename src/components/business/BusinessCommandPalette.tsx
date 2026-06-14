"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  List,
  ListItemButton,
  ListItemText,
  TextField,
  Typography,
  Box,
  CircularProgress,
  InputAdornment,
  Divider,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import HandshakeIcon from "@mui/icons-material/Handshake";
import AddIcon from "@mui/icons-material/Add";
import ViewKanbanIcon from "@mui/icons-material/ViewKanban";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { useRouter } from "next/navigation";
import { useBusinessNavigation } from "@/context/BusinessNavigationProvider";
import { shellDialogPaperSx } from "@/theme/shell-tokens";

interface SearchResult {
  clients: { id: string; name: string; companyName?: string | null; email?: string | null }[];
  leads: { id: string; title: string; client?: { name: string; companyName?: string | null } | null }[];
  deals: { id: string; title: string; client?: { name: string; companyName?: string | null } | null }[];
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function BusinessCommandPalette({ open, onClose }: Props) {
  const router = useRouter();
  const { navigate } = useBusinessNavigation();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult>({ clients: [], leads: [], deals: [] });

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults({ clients: [], leads: [], deals: [] });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/business/search?q=${encodeURIComponent(q.trim())}`);
      if (res.ok) setResults(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults({ clients: [], leads: [], deals: [] });
      return;
    }
    const t = setTimeout(() => search(query), 250);
    return () => clearTimeout(t);
  }, [query, open, search]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function go(section: "clienti" | "lead" | "deals", id: string) {
    navigate(section, id);
    onClose();
  }

  const empty = !loading && query.length >= 2 &&
    results.clients.length === 0 && results.leads.length === 0 && results.deals.length === 0;

  const quickActions = query.length < 2 ? [
    { label: "Vai a pipeline", icon: ViewKanbanIcon, action: () => { navigate("pipeline"); onClose(); } },
    { label: "Nuovo lead", icon: AddIcon, action: () => { navigate("lead"); onClose(); } },
  ] : [];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth slotProps={{ paper: { sx: shellDialogPaperSx } }}>
      <DialogTitle sx={{ pb: 1 }}>Cerca in Business</DialogTitle>
      <DialogContent sx={{ pt: 0 }}>
        <TextField
          autoFocus
          fullWidth
          size="small"
          placeholder="Clienti, lead, deal…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
          sx={{ mb: 2 }}
        />

        {quickActions.length > 0 && (
          <>
            <Typography variant="caption" color="text.secondary" sx={{ px: 1, fontWeight: 600 }}>
              AZIONI RAPIDE
            </Typography>
            <List dense disablePadding sx={{ mb: 1 }}>
              {quickActions.map((a) => (
                <ListItemButton key={a.label} onClick={a.action}>
                  <a.icon sx={{ fontSize: 18, mr: 1.5, color: "text.secondary" }} />
                  <ListItemText primary={a.label} slotProps={{ primary: { sx: { fontSize: "0.875rem" } } }} />
                </ListItemButton>
              ))}
            </List>
            <Divider sx={{ mb: 1 }} />
          </>
        )}

        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
            <CircularProgress size={24} />
          </Box>
        )}

        {empty && (
          <Typography color="text.secondary" sx={{ textAlign: "center", py: 3, fontSize: "0.875rem" }}>
            Nessun risultato per &quot;{query}&quot;
          </Typography>
        )}

        {results.clients.length > 0 && (
          <>
            <Typography variant="caption" color="text.secondary" sx={{ px: 1, fontWeight: 600 }}>
              CLIENTI
            </Typography>
            <List dense disablePadding>
              {results.clients.map((c) => (
                <ListItemButton key={c.id} onClick={() => go("clienti", c.id)}>
                  <PeopleAltIcon sx={{ fontSize: 18, mr: 1.5, color: "text.secondary" }} />
                  <ListItemText
                    primary={c.companyName || c.name}
                    secondary={c.email || c.name}
                    slotProps={{ primary: { sx: { fontSize: "0.875rem" } } }}
                  />
                  <OpenInNewIcon
                    sx={{ fontSize: 14, color: "text.disabled", ml: 1 }}
                    onClick={(e) => { e.stopPropagation(); router.push(`/services/express?v=pos&clientId=${c.id}`); onClose(); }}
                  />
                </ListItemButton>
              ))}
            </List>
          </>
        )}

        {results.leads.length > 0 && (
          <>
            <Typography variant="caption" color="text.secondary" sx={{ px: 1, fontWeight: 600, mt: 1, display: "block" }}>
              LEAD
            </Typography>
            <List dense disablePadding>
              {results.leads.map((l) => (
                <ListItemButton key={l.id} onClick={() => go("lead", l.id)}>
                  <TrendingUpIcon sx={{ fontSize: 18, mr: 1.5, color: "text.secondary" }} />
                  <ListItemText
                    primary={l.title}
                    secondary={l.client?.companyName || l.client?.name || "—"}
                    slotProps={{ primary: { sx: { fontSize: "0.875rem" } } }}
                  />
                </ListItemButton>
              ))}
            </List>
          </>
        )}

        {results.deals.length > 0 && (
          <>
            <Typography variant="caption" color="text.secondary" sx={{ px: 1, fontWeight: 600, mt: 1, display: "block" }}>
              DEAL
            </Typography>
            <List dense disablePadding>
              {results.deals.map((d) => (
                <ListItemButton key={d.id} onClick={() => go("deals", d.id)}>
                  <HandshakeIcon sx={{ fontSize: 18, mr: 1.5, color: "text.secondary" }} />
                  <ListItemText
                    primary={d.title}
                    secondary={d.client?.companyName || d.client?.name || "—"}
                    slotProps={{ primary: { sx: { fontSize: "0.875rem" } } }}
                  />
                </ListItemButton>
              ))}
            </List>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
