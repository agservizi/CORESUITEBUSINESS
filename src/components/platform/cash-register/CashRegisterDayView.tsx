"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Box, Typography, Button, TextField, Stack, Chip, CircularProgress,
  Paper, Grid, Alert, alpha,
} from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import PrintIcon from "@mui/icons-material/Print";
import RefreshIcon from "@mui/icons-material/Refresh";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import { useRouter, useSearchParams } from "next/navigation";
import { shellPanelSx } from "@/theme/shell-tokens";
import { jsonMutationHeaders } from "@/lib/csrf-client";
import type { CashDayJournal } from "@/lib/platform/cash-register-service";
import CashRegisterJournalPanel from "./CashRegisterJournalPanel";
import CashRegisterOpenDialog from "./CashRegisterOpenDialog";
import CashRegisterCloseDialog from "./CashRegisterCloseDialog";
import FinanceViewHero from "../finance/FinanceViewHero";
import { FINANCE_COLORS } from "../finance/finance-utils";

interface Session {
  id: string;
  status: "OPEN" | "CLOSED";
  businessDate: string;
  openingAmount: number;
  closingAmount: number | null;
  expectedClosingAmount: number | null;
  variance: number | null;
  openingNotes: string | null;
  closingNotes: string | null;
  journal: CashDayJournal | null;
  openedBy?: { name: string | null; email: string };
  closedBy?: { name: string | null; email: string } | null;
}

interface LiveStats {
  summary: {
    totalEntrate: number;
    totalUscite: number;
    saldoNetto: number;
    expressSalesCount: number;
    expressSalesTotal: number;
    cashEntrate: number;
    cashUscite: number;
  };
}

interface Props {
  serviceColor: string;
}

function money(n: number) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);
}

export default function CashRegisterDayView({ serviceColor }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [session, setSession] = useState<Session | null>(null);
  const [live, setLive] = useState<LiveStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [closeDialog, setCloseDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [openingAmount, setOpeningAmount] = useState("");
  const [closingAmount, setClosingAmount] = useState("");
  const [openingNotes, setOpeningNotes] = useState("");
  const [closingNotes, setClosingNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const today = new Date().toISOString().slice(0, 10);
      const url =
        selectedDate === today
          ? "/api/platform/entrate-uscite/cash-session"
          : `/api/platform/entrate-uscite/cash-session?date=${selectedDate}`;
      const res = await fetch(url);
      const data = await res.json();
      setSession(data.session);
      setLive(data.live ?? null);
      if (data.session?.closingAmount != null) {
        setClosingAmount(String(data.session.closingAmount));
      }
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => { load(); }, [load]);

  const clearOpenParam = useCallback(() => {
    if (searchParams.get("open") !== "1") return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("open");
    const qs = params.toString();
    router.replace(qs ? `/services/entrate-uscite?${qs}` : "/services/entrate-uscite?v=giornata", { scroll: false });
  }, [router, searchParams]);

  useEffect(() => {
    if (loading || session) return;
    if (searchParams.get("open") === "1") {
      setOpenDialog(true);
      clearOpenParam();
    }
  }, [loading, session, searchParams, clearOpenParam]);

  const expectedCash = session?.status === "OPEN" && live
    ? session.openingAmount + live.summary.cashEntrate - live.summary.cashUscite
    : session?.expectedClosingAmount ?? null;

  async function handleOpen() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/platform/entrate-uscite/cash-session", {
        method: "POST",
        headers: jsonMutationHeaders(),
        body: JSON.stringify({
          action: "open",
          openingAmount: Number(openingAmount),
          notes: openingNotes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore apertura");
      setOpeningAmount("");
      setOpeningNotes("");
      setOpenDialog(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore");
    } finally {
      setSaving(false);
    }
  }

  async function handleClose() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/platform/entrate-uscite/cash-session", {
        method: "POST",
        headers: jsonMutationHeaders(),
        body: JSON.stringify({
          action: "close",
          closingAmount: Number(closingAmount),
          notes: closingNotes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore chiusura");
      setCloseDialog(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore");
    } finally {
      setSaving(false);
    }
  }

  const isToday = selectedDate === new Date().toISOString().slice(0, 10);

  if (loading) {
    return (
      <Box sx={{ py: 8, display: "flex", justifyContent: "center" }}>
        <CircularProgress sx={{ color: serviceColor }} />
      </Box>
    );
  }

  return (
    <Box>
      <FinanceViewHero
        viewId="giornata"
        badge={
          session
            ? session.status === "OPEN"
              ? "● Cassa aperta"
              : "✓ Giornata chiusa"
            : "○ Cassa da aprire"
        }
      >
        <Stack direction="row" spacing={1}>
          {!session && (
            <Button
              variant="contained"
              startIcon={<PlayArrowIcon />}
              onClick={() => setOpenDialog(true)}
              sx={{
                bgcolor: "#fff",
                color: FINANCE_COLORS.cash,
                fontWeight: 700,
                "&:hover": { bgcolor: "#f0f9ff" },
              }}
            >
              Apri cassa
            </Button>
          )}
          <Button
            size="small"
            startIcon={<RefreshIcon />}
            onClick={load}
            sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "#fff", fontWeight: 600, "&:hover": { bgcolor: "rgba(255,255,255,0.3)" } }}
          >
            Aggiorna
          </Button>
        </Stack>
      </FinanceViewHero>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

      <TextField
        type="date"
        size="small"
        label="Giornata"
        value={selectedDate}
        onChange={(e) => setSelectedDate(e.target.value)}
        sx={{ mb: 2, maxWidth: 220 }}
        slotProps={{ inputLabel: { shrink: true } }}
      />

      {!session && isToday && (
        <Paper
          sx={[
            shellPanelSx,
            {
              p: 4,
              textAlign: "center",
              border: `1px dashed ${alpha(FINANCE_COLORS.cash, 0.35)}`,
              bgcolor: alpha(FINANCE_COLORS.cash, 0.04),
            },
          ]}
        >
          <AccountBalanceWalletIcon sx={{ fontSize: 52, color: alpha(FINANCE_COLORS.cash, 0.45), mb: 1.5 }} />
          <Typography sx={{ fontWeight: 700, fontSize: "1.1rem", mb: 0.5 }}>
            Giornata non ancora aperta
          </Typography>
          <Typography color="text.secondary" sx={{ fontSize: "0.875rem", mb: 2.5, maxWidth: 360, mx: "auto" }}>
            Apri la cassa inserendo il fondo contanti iniziale per tracciare incassi, uscite e il giornale serale.
          </Typography>
          <Button
            variant="contained"
            size="large"
            startIcon={<PlayArrowIcon />}
            onClick={() => setOpenDialog(true)}
            sx={{ background: FINANCE_COLORS.cash, fontWeight: 700, px: 3 }}
          >
            Apri cassa
          </Button>
        </Paper>
      )}

      {session?.status === "OPEN" && isToday && (
        <>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {[
              { label: "Fondo apertura", value: money(session.openingAmount), color: serviceColor },
              { label: "Entrate oggi", value: money(live?.summary.totalEntrate ?? 0), color: "#22c55e" },
              { label: "Uscite oggi", value: money(live?.summary.totalUscite ?? 0), color: "#ef4444" },
              { label: "Saldo netto", value: money(live?.summary.saldoNetto ?? 0), color: "#6366f1" },
              { label: "Vendite Express", value: `${live?.summary.expressSalesCount ?? 0} · ${money(live?.summary.expressSalesTotal ?? 0)}`, color: "#eab308" },
              { label: "Contanti attesi", value: expectedCash != null ? money(expectedCash) : "—", color: "#0ea5e9" },
            ].map((kpi) => (
              <Grid key={kpi.label} size={{ xs: 6, md: 4 }}>
                <Paper sx={[shellPanelSx, { p: 2 }]}>
                  <Typography variant="caption" color="text.secondary">{kpi.label}</Typography>
                  <Typography sx={{ fontWeight: 700, fontSize: "1.1rem", color: kpi.color }}>{kpi.value}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>

          <Paper sx={[shellPanelSx, { p: 3, maxWidth: 480, mb: 3 }]}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 2 }}>
              <Chip label="Giornata aperta" color="success" size="small" />
              <Typography variant="caption" color="text.secondary">
                da {session.openedBy?.name || session.openedBy?.email}
              </Typography>
            </Stack>
            <Typography sx={{ fontWeight: 700, mb: 1 }}>Chiusura sera</Typography>
            <Typography color="text.secondary" sx={{ fontSize: "0.875rem", mb: 2 }}>
              Conta i contanti in cassetto e inserisci l&apos;importo reale. Verrà generato il giornale di cassa.
            </Typography>
            {expectedCash != null && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Contanti attesi in cassa: <strong>{money(expectedCash)}</strong>
              </Alert>
            )}
            <Stack spacing={2}>
              <TextField
                label="Contanti contati €"
                type="number"
                size="small"
                value={closingAmount}
                onChange={(e) => setClosingAmount(e.target.value)}
              />
              <TextField
                label="Note chiusura"
                size="small"
                value={closingNotes}
                onChange={(e) => setClosingNotes(e.target.value)}
              />
              <Button
                variant="contained"
                color="error"
                startIcon={<StopIcon />}
                onClick={() => setCloseDialog(true)}
                disabled={saving || !closingAmount}
              >
                Chiudi giornata e genera giornale
              </Button>
            </Stack>
          </Paper>
        </>
      )}

      {session?.status === "CLOSED" && session.journal && (
        <>
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <Chip label="Giornata chiusa" color="default" size="small" />
            {session.variance != null && session.variance !== 0 && (
              <Chip
                label={`Scostamento ${money(session.variance)}`}
                color={Math.abs(session.variance) > 5 ? "warning" : "default"}
                size="small"
              />
            )}
            <Button
              size="small"
              startIcon={<PictureAsPdfIcon />}
              href={`/api/platform/entrate-uscite/cash-session/${session.id}/pdf`}
              target="_blank"
            >
              Scarica PDF
            </Button>
            <Button
              size="small"
              startIcon={<PrintIcon />}
              onClick={() => window.print()}
            >
              Stampa
            </Button>
          </Stack>
          <CashRegisterJournalPanel journal={session.journal} serviceColor={serviceColor} />
        </>
      )}

      <CashRegisterOpenDialog
        open={openDialog}
        saving={saving}
        openingAmount={openingAmount}
        openingNotes={openingNotes}
        serviceColor={serviceColor}
        onAmountChange={setOpeningAmount}
        onNotesChange={setOpeningNotes}
        onClose={() => setOpenDialog(false)}
        onConfirm={handleOpen}
      />

      <CashRegisterCloseDialog
        open={closeDialog}
        saving={saving}
        closingAmount={closingAmount}
        closingNotes={closingNotes}
        expectedCash={expectedCash}
        serviceColor={serviceColor}
        onAmountChange={setClosingAmount}
        onNotesChange={setClosingNotes}
        onClose={() => setCloseDialog(false)}
        onConfirm={handleClose}
      />
    </Box>
  );
}
