"use client";

import { useCallback, useEffect, useState } from "react";
import { Box, IconButton, Tooltip } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import { usePlatformNavigation } from "@/context/PlatformNavigationProvider";
import OpportunitiesDashboard from "./opportunities/OpportunitiesDashboard";
import OpportunitiesListView from "./opportunities/OpportunitiesListView";
import OpportunitiesPipelineView from "./opportunities/OpportunitiesPipelineView";
import CollaboratorsView from "./opportunities/CollaboratorsView";
import OpportunitiesReportView from "./opportunities/OpportunitiesReportView";
import OpportunitiesLeaderboard from "./opportunities/OpportunitiesLeaderboard";
import OpportunitiesAdminCatalog from "./opportunities/OpportunitiesAdminCatalog";
import OpportunityDialog from "./opportunities/OpportunityDialog";
import OpportunityDetailDrawer from "./opportunities/OpportunityDetailDrawer";
import OpportunitiesCommandPalette from "./opportunities/OpportunitiesCommandPalette";
import OpportunitiesQuickDock from "./opportunities/OpportunitiesQuickDock";
import type { OpportunityRow } from "./opportunities/opportunities-utils";
import { jsonMutationHeaders } from "@/lib/csrf-client";
import OpportunityWinBurst from "./opportunities/OpportunityWinBurst";

interface Props {
  viewId: string;
  serviceColor?: string;
}

export default function OpportunitiesModuleView({ viewId, serviceColor = "#8b5cf6" }: Props) {
  const { navigate } = usePlatformNavigation();
  const [refreshKey, setRefreshKey] = useState(0);
  const [detail, setDetail] = useState<OpportunityRow | null>(null);
  const [winBurst, setWinBurst] = useState(0);
  const [winMeta, setWinMeta] = useState<{ title?: string; commission?: number }>({});
  const [paletteOpen, setPaletteOpen] = useState(false);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

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
    fetch(`/api/platform/opportunities/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.item) setDetail(data.item);
      })
      .catch(() => undefined);
  }, [refreshKey]);

  async function handleStatusChange(id: string, statusCode: string) {
    await fetch(`/api/platform/opportunities/${id}`, {
      method: "PATCH",
      headers: jsonMutationHeaders(),
      body: JSON.stringify({ statusCode }),
    });
    if (statusCode === "attivato") {
      const row = detail?.id === id ? detail : null;
      setWinMeta({
        title: row?.code || undefined,
        commission: row?.commission,
      });
      setWinBurst((n) => n + 1);
    }
    refresh();
  }

  const listViews = new Set([
    "elenco", "telefonia", "luce", "gas",
    "verifica", "documenti", "firma",
    "attivati", "annullati", "attivi",
  ]);

  const goNew = () => navigate("nuovo");

  function renderView() {
    if (viewId === "nuovo") {
      return (
        <OpportunityDialog
          key={refreshKey}
          open
          variant="page"
          onClose={() => navigate("elenco")}
          onSaved={() => { refresh(); navigate("elenco"); }}
          serviceColor={serviceColor}
        />
      );
    }
    if (viewId === "pipeline") {
      return (
        <OpportunitiesPipelineView
          key={refreshKey}
          serviceColor={serviceColor}
          onRefresh={refresh}
          onNew={goNew}
        />
      );
    }
    if (viewId === "collaboratori") {
      return <CollaboratorsView key={refreshKey} serviceColor={serviceColor} />;
    }
    if (viewId === "classifica") {
      return <OpportunitiesLeaderboard key={refreshKey} serviceColor={serviceColor} />;
    }
    if (viewId === "report") {
      return <OpportunitiesReportView key={refreshKey} serviceColor={serviceColor} />;
    }
    if (viewId === "catalogo") {
      return <OpportunitiesAdminCatalog key={refreshKey} serviceColor={serviceColor} />;
    }
    if (listViews.has(viewId)) {
      return (
        <OpportunitiesListView
          key={`${refreshKey}-${viewId}`}
          viewId={viewId}
          serviceColor={serviceColor}
          onRefresh={refresh}
          onNew={goNew}
        />
      );
    }
    return (
      <OpportunitiesDashboard
        key={refreshKey}
        serviceColor={serviceColor}
        onNavigate={navigate}
        onOpenDetail={setDetail}
        onNew={goNew}
      />
    );
  }

  return (
    <Box sx={{ flex: 1, minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column", pb: { xs: 10, md: 0 } }}>
      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 0.5, mb: 1 }}>
        <Tooltip title="Ricerca rapida (Ctrl+K)">
          <IconButton size="small" onClick={() => setPaletteOpen(true)} sx={{ color: "text.secondary" }}>
            <SearchIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <IconButton size="small" onClick={refresh} sx={{ color: "text.secondary" }}>
          <RefreshIcon fontSize="small" />
        </IconButton>
      </Box>

      {renderView()}

      <OpportunitiesQuickDock
        serviceColor={serviceColor}
        onNew={goNew}
        onPipeline={() => navigate("pipeline")}
        onSearch={() => setPaletteOpen(true)}
        onDashboard={() => navigate("dashboard")}
      />

      <OpportunitiesCommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onNavigate={navigate}
        onOpenContract={setDetail}
        serviceColor={serviceColor}
      />

      <OpportunityWinBurst trigger={winBurst} title={winMeta.title} commission={winMeta.commission} />

      <OpportunityDetailDrawer
        open={Boolean(detail)}
        row={detail}
        onClose={() => setDetail(null)}
        onStatusChange={handleStatusChange}
        onUpdated={refresh}
        serviceColor={serviceColor}
      />
    </Box>
  );
}
