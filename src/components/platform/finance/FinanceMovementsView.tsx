"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box, Typography, Button, TextField, Paper, Chip, CircularProgress,
  InputAdornment, IconButton, Stack, Skeleton, alpha, Grid, Pagination,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import DownloadIcon from "@mui/icons-material/Download";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import { motion, AnimatePresence } from "framer-motion";
import { shellPanelSx } from "@/theme/shell-tokens";
import { jsonMutationHeaders } from "@/lib/csrf-client";
import FinanceMovementDrawer from "./FinanceMovementDrawer";
import FinanceViewHero from "./FinanceViewHero";
import FinanceStatCard from "./FinanceStatCard";
import FinanceNewMovementDialog, { EMPTY_MOVEMENT_FORM } from "./FinanceNewMovementDialog";
import {
  money, movementStatusColor, typeColor, FINANCE_COLORS, VIEW_THEMES,
  isPaidStatus, isOverdueDueDate, type FinanceMovementRow,
} from "./finance-utils";

interface Props {
  viewId: string;
  serviceColor: string;
  onNew?: () => void;
  initialCreateOpen?: boolean;
}

const STATUS_FILTERS = ["Tutti", "Pagato", "In lavorazione", "Sospeso"];
const PAGE_SIZE = 25;

export default function FinanceMovementsView({ viewId, serviceColor, onNew, initialCreateOpen }: Props) {
  const [items, setItems] = useState<FinanceMovementRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Tutti");
  const [detail, setDetail] = useState<FinanceMovementRow | null>(null);
  const [dialogOpen, setDialogOpen] = useState(Boolean(initialCreateOpen));
  const [form, setForm] = useState(EMPTY_MOVEMENT_FORM);
  const [saving, setSaving] = useState(false);

  const theme = VIEW_THEMES[viewId] ?? VIEW_THEMES.elenco;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [viewId, debouncedSearch, statusFilter]);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      view: viewId,
      page: String(page),
      limit: String(PAGE_SIZE),
    });
    if (debouncedSearch) params.set("q", debouncedSearch);
    const res = await fetch(`/api/platform/entrate-uscite?${params}`);
    const data = await res.json();
    setItems(data.items || []);
    setTotal(data.total ?? data.items?.length ?? 0);
    setLoading(false);
  }, [viewId, page, debouncedSearch]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (statusFilter === "Tutti") return items;
    return items.filter((m) => m.status === statusFilter);
  }, [items, statusFilter]);

  const totals = useMemo(() => {
    let entrate = 0;
    let uscite = 0;
    for (const m of filtered) {
      const a = Number(m.amount);
      if (m.type === "ENTRATA") entrate += a;
      else uscite += a;
    }
    return { entrate, uscite, netto: entrate - uscite };
  }, [filtered]);

  async function handleCreate() {
    if (!form.description.trim() || !form.amount) return;
    setSaving(true);
    await fetch("/api/platform/entrate-uscite", {
      method: "POST",
      headers: jsonMutationHeaders(),
      body: JSON.stringify({
        description: form.description.trim(),
        type: form.type,
        amount: Number(form.amount),
        method: form.method,
        status: form.status,
        dueDate: form.dueDate || undefined,
        reference: form.reference || undefined,
        notes: form.notes || undefined,
        clientId: form.clientId || undefined,
        priceListItemId: form.priceListItemId || undefined,
        quantity: form.priceListItemId ? Number(form.quantity) || 1 : undefined,
      }),
    });
    setDialogOpen(false);
    setForm(EMPTY_MOVEMENT_FORM);
    await load();
    setSaving(false);
  }

  async function quickMarkPaid(e: React.MouseEvent, row: FinanceMovementRow) {
    e.stopPropagation();
    await fetch(`/api/platform/entrate-uscite/${row.id}`, {
      method: "PATCH",
      headers: jsonMutationHeaders(),
      body: JSON.stringify({ status: "Pagato" }),
    });
    await load();
  }

  function openCreate() {
    if (onNew) onNew();
    else setDialogOpen(true);
  }

  return (
    <Box>
      <FinanceViewHero
        viewId={viewId}
        badge={`${total} movimenti · Netto ${money(totals.netto)}`}
      >
        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            startIcon={<DownloadIcon />}
            href="/api/platform/entrate-uscite/export?period=month"
            target="_blank"
            sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "#fff", fontWeight: 600 }}
          >
            Export CSV
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openCreate}
            sx={{ bgcolor: "rgba(255,255,255,0.95)", color: theme.accent, fontWeight: 700, "&:hover": { bgcolor: "#fff" } }}
          >
            Nuovo movimento
          </Button>
        </Stack>
      </FinanceViewHero>

      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        <Grid size={{ xs: 4 }}>
          <FinanceStatCard label="Entrate" value={money(totals.entrate)} icon={TrendingUpIcon} color={FINANCE_COLORS.entrate} />
        </Grid>
        <Grid size={{ xs: 4 }}>
          <FinanceStatCard label="Uscite" value={money(totals.uscite)} icon={TrendingDownIcon} color={FINANCE_COLORS.uscite} />
        </Grid>
        <Grid size={{ xs: 4 }}>
          <FinanceStatCard label="Netto" value={money(totals.netto)} icon={AccountBalanceWalletIcon} color={serviceColor} />
        </Grid>
      </Grid>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mb: 2 }}>
        <TextField
          size="small"
          placeholder="Cerca descrizione, metodo, cliente…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flex: 1, maxWidth: { sm: 360 } }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: theme.accent }} />
                </InputAdornment>
              ),
            },
          }}
        />
        {(viewId === "elenco" || viewId === "scadenze") && (
          <Stack direction="row" spacing={0.75} sx={{ flexWrap: "wrap" }}>
            {STATUS_FILTERS.map((s) => (
              <Chip
                key={s}
                label={s}
                size="small"
                onClick={() => setStatusFilter(s)}
                sx={{
                  fontWeight: 600,
                  bgcolor: statusFilter === s ? alpha(theme.accent, 0.15) : "transparent",
                  color: statusFilter === s ? theme.accent : "text.secondary",
                  border: `1px solid ${statusFilter === s ? alpha(theme.accent, 0.35) : "divider"}`,
                }}
              />
            ))}
          </Stack>
        )}
      </Stack>

      <Paper sx={[shellPanelSx, { overflow: "hidden", border: `1px solid ${alpha(theme.accent, 0.12)}` }]}>
        {loading ? (
          <Stack spacing={1.5} sx={{ p: 2 }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} variant="rounded" height={72} sx={{ borderRadius: 2.5 }} />
            ))}
          </Stack>
        ) : filtered.length === 0 ? (
          <Box sx={{ py: 8, textAlign: "center", px: 2 }}>
            <AccountBalanceWalletIcon sx={{ fontSize: 48, color: alpha(theme.accent, 0.35), mb: 1.5 }} />
            <Typography sx={{ fontWeight: 700, mb: 0.5 }}>Nessun movimento</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
              {search || statusFilter !== "Tutti" ? "Prova a modificare i filtri" : "Registra il primo movimento di cassa"}
            </Typography>
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate} sx={{ bgcolor: theme.accent }}>
              Nuovo movimento
            </Button>
          </Box>
        ) : (
          <Stack spacing={0} sx={{ p: 1.5 }}>
            <AnimatePresence initial={false}>
              {filtered.map((row, i) => {
                const c = typeColor(row.type);
                const overdue = viewId === "scadenze" && isOverdueDueDate(row.dueDate, row.status);
                return (
                  <Box
                    key={row.id}
                    component={motion.div}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.03, 0.3) }}
                    onClick={() => setDetail(row)}
                    sx={{
                      p: 1.75,
                      mb: 1,
                      borderRadius: 2.5,
                      cursor: "pointer",
                      border: "1px solid",
                      borderColor: overdue ? alpha(FINANCE_COLORS.overdue, 0.5) : alpha(c, 0.15),
                      bgcolor: overdue ? alpha(FINANCE_COLORS.overdue, 0.06) : alpha(c, 0.03),
                      display: "grid",
                      gridTemplateColumns: { xs: "1fr auto", md: "auto 1fr auto auto auto auto" },
                      gap: { xs: 1, md: 2 },
                      alignItems: "center",
                      transition: "all 0.15s",
                      "&:hover": {
                        borderColor: alpha(c, 0.35),
                        bgcolor: alpha(c, 0.07),
                        transform: "translateX(2px)",
                      },
                    }}
                  >
                    <Box sx={{ display: { xs: "none", md: "flex" }, width: 40, height: 40, borderRadius: 2, alignItems: "center", justifyContent: "center", bgcolor: alpha(c, 0.15) }}>
                      {row.type === "ENTRATA" ? <TrendingUpIcon sx={{ color: c, fontSize: 20 }} /> : <TrendingDownIcon sx={{ color: c, fontSize: 20 }} />}
                    </Box>

                    <Box sx={{ minWidth: 0, gridColumn: { xs: "1", md: "auto" } }}>
                      <Typography sx={{ fontWeight: 700, fontSize: "0.9rem" }} noWrap>{row.description}</Typography>
                      <Stack direction="row" spacing={0.75} sx={{ mt: 0.4, flexWrap: "wrap", alignItems: "center" }}>
                        <Typography variant="caption" color="text.secondary">
                          {row.createdAt ? new Date(row.createdAt).toLocaleDateString("it-IT") : "—"}
                          {row.method ? ` · ${row.method}` : ""}
                          {row.dueDate ? ` · Scad. ${new Date(row.dueDate).toLocaleDateString("it-IT")}` : ""}
                        </Typography>
                        {overdue && (
                          <Chip label="Scaduto" size="small" sx={{ height: 18, fontSize: "0.58rem", bgcolor: alpha(FINANCE_COLORS.overdue, 0.15), color: FINANCE_COLORS.overdue, fontWeight: 700 }} />
                        )}
                        {row.expressSale?.receiptNumber && (
                          <Chip icon={<PointOfSaleIcon sx={{ fontSize: "11px !important" }} />} label={`#${row.expressSale.receiptNumber}`} size="small" sx={{ height: 18, fontSize: "0.58rem", bgcolor: alpha(FINANCE_COLORS.express, 0.12), color: FINANCE_COLORS.express }} />
                        )}
                        {row.client?.name && <Typography variant="caption" color="text.secondary">· {row.client.name}</Typography>}
                      </Stack>
                    </Box>

                    <Chip size="small" label={row.type} sx={{ display: { xs: "none", md: "flex" }, height: 24, fontSize: "0.68rem", fontWeight: 700, bgcolor: alpha(c, 0.12), color: c }} />
                    <Chip size="small" label={row.status} sx={{ display: { xs: "none", sm: "flex" }, height: 24, fontSize: "0.68rem", fontWeight: 600, bgcolor: alpha(movementStatusColor(row.status || ""), 0.12), color: movementStatusColor(row.status || "") }} />

                    <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", gridColumn: { xs: "2", md: "auto" } }}>
                      {!isPaidStatus(row.status) && (viewId === "scadenze" || viewId === "elenco") && (
                        <IconButton size="small" onClick={(e) => quickMarkPaid(e, row)} aria-label="Segna pagato" sx={{ color: FINANCE_COLORS.entrate }}>
                          <CheckCircleIcon fontSize="small" />
                        </IconButton>
                      )}
                      <Typography sx={{ fontWeight: 800, fontSize: "0.95rem", color: c, whiteSpace: "nowrap" }}>
                        {row.type === "ENTRATA" ? "+" : "-"}{money(Number(row.amount))}
                      </Typography>
                      <IconButton size="small" href={`/api/platform/entrate-uscite/${row.id}/pdf`} target="_blank" onClick={(e) => e.stopPropagation()} aria-label="PDF" sx={{ color: "text.secondary" }}>
                        <PictureAsPdfIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Box>
                );
              })}
            </AnimatePresence>
          </Stack>
        )}
      </Paper>

      {totalPages > 1 && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
          <Pagination count={totalPages} page={page} onChange={(_, p) => setPage(p)} color="primary" size="small" />
        </Box>
      )}

      <FinanceMovementDrawer
        open={Boolean(detail)}
        row={detail}
        onClose={() => setDetail(null)}
        onUpdated={(item) => { setDetail(item); load(); }}
        onDeleted={() => { setDetail(null); load(); }}
        serviceColor={serviceColor}
      />

      <FinanceNewMovementDialog
        open={dialogOpen}
        saving={saving}
        form={form}
        serviceColor={serviceColor}
        onChange={setForm}
        onClose={() => setDialogOpen(false)}
        onSave={handleCreate}
      />
    </Box>
  );
}
