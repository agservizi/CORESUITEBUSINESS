"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import { Box, IconButton, Tooltip, LinearProgress } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import { useRouter } from "next/navigation";
import { usePlatformNavigation } from "@/context/PlatformNavigationProvider";
import { buildPlatformUrl } from "@/lib/platform-navigation";
import FinanceDashboard from "./finance/FinanceDashboard";
import FinanceMovementsView from "./finance/FinanceMovementsView";
import FinanceMovementDrawer from "./finance/FinanceMovementDrawer";
import FinanceCommandPalette from "./finance/FinanceCommandPalette";
import FinanceQuickDock from "./finance/FinanceQuickDock";
import FinancePulseBanner from "./finance/FinancePulseBanner";
import CashRegisterDayView from "./cash-register/CashRegisterDayView";
import CashRegisterReportView from "./cash-register/CashRegisterReportView";
import FinanceListinoAdminView from "./finance/FinanceListinoAdminView";
import type { FinanceMovementRow } from "./finance/finance-utils";

interface Props {
  viewId: string;
  serviceColor?: string;
}

const LIST_VIEWS = new Set(["elenco", "entrate", "uscite", "scadenze"]);

export default function EntrateUsciteModuleView({ viewId, serviceColor = "#22c55e" }: Props) {
  const router = useRouter();
  const { navigate, serviceSlug } = usePlatformNavigation();
  const [refreshKey, setRefreshKey] = useState(0);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [detail, setDetail] = useState<FinanceMovementRow | null>(null);
  const [sessionStatus, setSessionStatus] = useState<"OPEN" | "CLOSED" | "NONE" | null>(null);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const loadSession = useCallback(async () => {
    try {
      const res = await fetch("/api/platform/entrate-uscite/cash-session");
      const data = await res.json();
      const status = data.session?.status;
      if (status === "OPEN" || status === "CLOSED") setSessionStatus(status);
      else setSessionStatus("NONE");
    } catch {
      setSessionStatus(null);
    }
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession, refreshKey]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = new URLSearchParams(window.location.search).get("id");
    if (!id) return;
    fetch(`/api/platform/entrate-uscite/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.item) setDetail(data.item as FinanceMovementRow);
      })
      .catch(() => undefined);
  }, [refreshKey]);

  const goNew = () => navigate("nuovo");

  const goGiornata = () => router.push(buildPlatformUrl(serviceSlug, "giornata", { open: "1" }));

  function handleNavigate(target: string) {
    if (target === "giornata") goGiornata();
    else navigate(target);
  }

  async function openMovement(id: string) {
    const res = await fetch(`/api/platform/entrate-uscite/${id}`);
    if (!res.ok) return;
    const data = await res.json();
    if (data?.item) setDetail(data.item as FinanceMovementRow);
  }

  function renderView() {
    if (viewId === "giornata") {
      return (
        <Suspense fallback={<LinearProgress sx={{ mb: 2 }} />}>
          <CashRegisterDayView key={refreshKey} serviceColor={serviceColor} />
        </Suspense>
      );
    }
    if (viewId === "report") {
      return <CashRegisterReportView key={refreshKey} serviceColor={serviceColor} />;
    }
    if (viewId === "listino") {
      return <FinanceListinoAdminView key={refreshKey} serviceColor={serviceColor} />;
    }
    if (viewId === "nuovo") {
      return (
        <FinanceMovementsView
          key={`${refreshKey}-nuovo`}
          viewId="elenco"
          serviceColor={serviceColor}
          initialCreateOpen
          onNew={goNew}
        />
      );
    }
    if (LIST_VIEWS.has(viewId)) {
      return (
        <FinanceMovementsView
          key={`${refreshKey}-${viewId}`}
          viewId={viewId}
          serviceColor={serviceColor}
          onNew={goNew}
        />
      );
    }
    return (
      <FinanceDashboard
        key={refreshKey}
        serviceColor={serviceColor}
        onNavigate={handleNavigate}
        onOpenMovement={openMovement}
      />
    );
  }

  const showToolbar = viewId !== "dashboard";

  return (
    <Box sx={{ flex: 1, minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column", pb: { xs: 10, md: 0 } }}>
      {viewId !== "giornata" && sessionStatus && (
        <FinancePulseBanner sessionStatus={sessionStatus} />
      )}

      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 0.5, mb: 1 }}>
        <Tooltip title="Ricerca rapida (Ctrl+K)">
          <IconButton size="small" onClick={() => setPaletteOpen(true)} sx={{ color: "text.secondary" }}>
            <SearchIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        {showToolbar && (
          <IconButton size="small" onClick={refresh} sx={{ color: "text.secondary" }}>
            <RefreshIcon fontSize="small" />
          </IconButton>
        )}
      </Box>

      {renderView()}

      <FinanceQuickDock
        serviceColor={serviceColor}
        onNew={goNew}
        onSearch={() => setPaletteOpen(true)}
        onDay={goGiornata}
        onReport={() => navigate("report")}
      />

      <FinanceCommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onNavigate={navigate}
        onOpenMovement={openMovement}
        serviceColor={serviceColor}
      />

      <FinanceMovementDrawer
        open={Boolean(detail)}
        row={detail}
        onClose={() => setDetail(null)}
        onUpdated={(item) => setDetail(item)}
        onDeleted={() => { setDetail(null); refresh(); }}
        serviceColor={serviceColor}
      />
    </Box>
  );
}
