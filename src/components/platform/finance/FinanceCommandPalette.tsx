"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Dialog, DialogContent, TextField, List, ListItemButton, ListItemText,
  Typography, Box, Chip, InputAdornment, Divider, alpha,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import DashboardIcon from "@mui/icons-material/Dashboard";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import AssessmentIcon from "@mui/icons-material/Assessment";
import AddIcon from "@mui/icons-material/Add";
import type { SvgIconComponent } from "@mui/icons-material";
import { money, typeColor } from "./finance-utils";

interface Props {
  open: boolean;
  onClose: () => void;
  onNavigate: (viewId: string) => void;
  onOpenMovement: (id: string) => void;
  serviceColor?: string;
}

const QUICK_VIEWS: { id: string; label: string; icon: SvgIconComponent }[] = [
  { id: "dashboard", label: "Dashboard finanza", icon: DashboardIcon },
  { id: "giornata", label: "Giornata cassa", icon: AccountBalanceWalletIcon },
  { id: "nuovo", label: "Nuovo movimento", icon: AddIcon },
  { id: "elenco", label: "Tutti i movimenti", icon: SearchIcon },
  { id: "entrate", label: "Entrate", icon: TrendingUpIcon },
  { id: "uscite", label: "Uscite", icon: TrendingDownIcon },
  { id: "scadenze", label: "Scadenze", icon: PendingActionsIcon },
  { id: "report", label: "Report periodo", icon: AssessmentIcon },
];

export default function FinanceCommandPalette({
  open,
  onClose,
  onNavigate,
  onOpenMovement,
  serviceColor = "#22c55e",
}: Props) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<{ id: string; description: string; amount: number; type: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (term: string) => {
    if (!term.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/platform/entrate-uscite/insights?q=${encodeURIComponent(term)}`);
      const data = await res.json();
      setResults(data.items || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(q), 200);
    return () => clearTimeout(t);
  }, [q, search]);

  useEffect(() => {
    if (!open) {
      setQ("");
      setResults([]);
    }
  }, [open]);

  const navFiltered = QUICK_VIEWS.filter((n) => !q || n.label.toLowerCase().includes(q.toLowerCase()));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      slotProps={{ paper: { sx: { borderRadius: 3, overflow: "hidden" } } }}
    >
      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider", background: `linear-gradient(180deg, ${alpha(serviceColor, 0.06)} 0%, transparent 100%)` }}>
          <TextField
            autoFocus
            fullWidth
            size="small"
            placeholder="Cerca movimento o vai a una sezione… (Ctrl+K)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
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
            Naviga velocemente o apri un movimento
          </Typography>
        </Box>

        {!q.trim() && (
          <List dense disablePadding sx={{ py: 1 }}>
            {navFiltered.map((n) => (
              <ListItemButton
                key={n.id}
                onClick={() => {
                  onNavigate(n.id);
                  onClose();
                }}
              >
                <n.icon sx={{ mr: 1.5, fontSize: 20, color: serviceColor }} />
                <ListItemText primary={n.label} />
              </ListItemButton>
            ))}
          </List>
        )}

        {q.trim() && (
          <List dense disablePadding sx={{ py: 1, maxHeight: 360, overflow: "auto" }}>
            {loading && (
              <Typography sx={{ px: 2, py: 2, color: "text.secondary", fontSize: "0.875rem" }}>Ricerca…</Typography>
            )}
            {!loading && results.length === 0 && (
              <Typography sx={{ px: 2, py: 2, color: "text.secondary", fontSize: "0.875rem" }}>Nessun risultato</Typography>
            )}
            {results.map((r) => {
              const c = typeColor(r.type);
              return (
                <ListItemButton
                  key={r.id}
                  onClick={() => {
                    onOpenMovement(r.id);
                    onClose();
                  }}
                >
                  <ListItemText
                    primary={r.description}
                    secondary={
                      <Chip
                        size="small"
                        label={`${r.type === "ENTRATA" ? "+" : "-"}${money(r.amount)}`}
                        sx={{ mt: 0.5, height: 20, fontSize: "0.65rem", fontWeight: 700, bgcolor: alpha(c, 0.12), color: c }}
                      />
                    }
                  />
                </ListItemButton>
              );
            })}
          </List>
        )}

        <Divider />
        <Box sx={{ px: 2, py: 1, display: "flex", gap: 1 }}>
          <Typography variant="caption" color="text.secondary">Esc chiudi</Typography>
          <Typography variant="caption" color="text.secondary">·</Typography>
          <Typography variant="caption" color="text.secondary">Ctrl+K apri</Typography>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
