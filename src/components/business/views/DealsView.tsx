"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Grid,
  Alert,
} from "@mui/material";
import { motion } from "framer-motion";
import AddIcon from "@mui/icons-material/Add";
import EuroIcon from "@mui/icons-material/Euro";
import ClientPicker from "@/components/platform/ClientPicker";
import { useBusinessNavigation } from "@/context/BusinessNavigationProvider";
import { shellPaperSx } from "@/theme/shell-tokens";

interface Deal {
  id: string;
  title: string;
  value: number;
  status: string;
  probability: number;
  expectedClose?: string;
  client: { id: string; name: string; companyName?: string | null };
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  OPEN: "#0ea5e9",
  WON: "#10b981",
  LOST: "#ef4444",
  ON_HOLD: "#f59e0b",
};

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Aperto",
  WON: "Vinto",
  LOST: "Perso",
  ON_HOLD: "In attesa",
};

export default function DealsView() {
  const { openDetail } = useBusinessNavigation();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    clientId: "",
    value: "",
    status: "OPEN",
    probability: "50",
  });

  async function loadDeals() {
    setLoading(true);
    const res = await fetch("/api/business/deals");
    if (res.ok) {
      const data = await res.json();
      setDeals(data.deals || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadDeals();
  }, []);

  async function handleCreate() {
    if (!form.title || !form.clientId || !form.value) {
      setError("Compila titolo, cliente e valore");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/business/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          clientId: form.clientId,
          value: Number(form.value),
          status: form.status,
          probability: Number(form.probability),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Errore durante la creazione");
      }
      setOpen(false);
      setForm({ title: "", clientId: "", value: "", status: "OPEN", probability: "50" });
      await loadDeals();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Errore durante la creazione");
    } finally {
      setSaving(false);
    }
  }

  const totalOpen = deals.filter((d) => d.status === "OPEN").reduce((s, d) => s + d.value, 0);
  const totalWon = deals.filter((d) => d.status === "WON").reduce((s, d) => s + d.value, 0);

  return (
    <Box>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 3 }}>
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: "1.5rem", letterSpacing: "-0.02em" }}>
              Deal
            </Typography>
            <Typography color="text.secondary" sx={{ fontSize: "0.875rem" }}>
              Opportunità commerciali e contratti
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpen(true)}
            sx={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
          >
            Nuovo deal
          </Button>
        </Box>
      </motion.div>

      {error && !open && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: "Deal totali", value: deals.length, color: "#6366f1" },
          { label: "Valore aperto", value: `€${totalOpen.toLocaleString("it-IT")}`, color: "#0ea5e9" },
          { label: "Valore vinto", value: `€${totalWon.toLocaleString("it-IT")}`, color: "#10b981" },
        ].map(({ label, value, color }) => (
          <Grid key={label} size={{ xs: 12, sm: 4 }}>
            <Paper sx={[shellPaperSx, { p: 2, borderTop: `3px solid ${color}` }]}>
              <Typography variant="caption" color="text.secondary">{label}</Typography>
              <Typography sx={{ fontWeight: 800, fontSize: "1.5rem", color }}>{value}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Paper sx={[shellPaperSx, { overflow: "auto" }]}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Titolo</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Cliente</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Valore</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Stato</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Probabilità</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Creato</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {deals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: "text.secondary" }}>
                    Nessun deal. Crea il primo con il pulsante Nuovo deal.
                  </TableCell>
                </TableRow>
              ) : (
                deals.map((deal) => (
                  <TableRow key={deal.id} hover sx={{ cursor: "pointer" }} onClick={() => openDetail(deal.id)}>
                    <TableCell sx={{ fontWeight: 600 }}>{deal.title}</TableCell>
                    <TableCell>{deal.client.companyName || deal.client.name}</TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.3 }}>
                        <EuroIcon sx={{ fontSize: 14, color: "#10b981" }} />
                        {deal.value.toLocaleString("it-IT")}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={STATUS_LABELS[deal.status] || deal.status}
                        size="small"
                        sx={{
                          background: `${STATUS_COLORS[deal.status] || "#64748b"}18`,
                          color: STATUS_COLORS[deal.status] || "#64748b",
                        }}
                      />
                    </TableCell>
                    <TableCell>{deal.probability}%</TableCell>
                    <TableCell>
                      {new Date(deal.createdAt).toLocaleDateString("it-IT")}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Paper>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nuovo deal</DialogTitle>
        <DialogContent>
          {error && open && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField
              fullWidth
              size="small"
              label="Titolo *"
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            />
            <ClientPicker
              value={form.clientId}
              onChange={(id) => setForm((p) => ({ ...p, clientId: id }))}
              required
            />
            <TextField
              fullWidth
              size="small"
              label="Valore € *"
              type="number"
              value={form.value}
              onChange={(e) => setForm((p) => ({ ...p, value: e.target.value }))}
            />
            <TextField
              select
              fullWidth
              size="small"
              label="Stato"
              value={form.status}
              onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
            >
              {Object.entries(STATUS_LABELS).map(([v, l]) => (
                <MenuItem key={v} value={v}>{l}</MenuItem>
              ))}
            </TextField>
            <TextField
              fullWidth
              size="small"
              label="Probabilità %"
              type="number"
              value={form.probability}
              onChange={(e) => setForm((p) => ({ ...p, probability: e.target.value }))}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Annulla</Button>
          <Button variant="contained" onClick={handleCreate} disabled={saving}>
            {saving ? "Salvataggio…" : "Crea deal"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
