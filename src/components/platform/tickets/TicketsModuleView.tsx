"use client";

import { useCallback, useEffect, useState } from "react";
import { Box, IconButton, Tooltip } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import { usePlatformNavigation } from "@/context/PlatformNavigationProvider";
import TicketsDashboard from "./TicketsDashboard";
import TicketsListView from "./TicketsListView";
import TicketsSlaView from "./TicketsSlaView";
import TicketsChannelsView from "./TicketsChannelsView";
import TicketsReportView from "./TicketsReportView";
import TicketCreateDialog from "./TicketCreateDialog";
import TicketsQuickDock from "./TicketsQuickDock";

interface Props {
  viewId: string;
  serviceColor?: string;
  onOpenTicket: (id: string) => void;
}

const LIST_VIEWS = new Set([
  "elenco", "aperti", "urgenti", "in_lavorazione", "chiusi",
  "portale", "email", "telefono", "sla_scaduti", "sla_rischio",
]);

const SLA_VIEWS = new Set(["sla", "sla_scaduti", "sla_rischio"]);

export default function TicketsModuleView({
  viewId,
  serviceColor = "#0ea5e9",
  onOpenTicket,
}: Props) {
  const { navigate } = usePlatformNavigation();
  const [refreshKey, setRefreshKey] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);
  const goNew = () => setCreateOpen(true);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        navigate("elenco");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);

  function renderView() {
    if (viewId === "canali") {
      return (
        <TicketsChannelsView
          key={refreshKey}
          serviceColor={serviceColor}
          onOpenTicket={onOpenTicket}
          onNew={goNew}
        />
      );
    }
    if (viewId === "report") {
      return <TicketsReportView key={refreshKey} serviceColor={serviceColor} />;
    }
    if (SLA_VIEWS.has(viewId)) {
      return (
        <TicketsSlaView
          key={`${refreshKey}-${viewId}`}
          viewId={viewId}
          serviceColor={serviceColor}
          onOpenTicket={onOpenTicket}
          onNavigate={navigate}
          onNew={goNew}
        />
      );
    }
    if (LIST_VIEWS.has(viewId)) {
      return (
        <TicketsListView
          key={`${refreshKey}-${viewId}`}
          viewId={viewId}
          serviceColor={serviceColor}
          onOpenTicket={onOpenTicket}
          onNew={goNew}
          onRefresh={refresh}
        />
      );
    }
    return (
      <TicketsDashboard
        key={refreshKey}
        serviceColor={serviceColor}
        onNavigate={navigate}
        onOpenTicket={onOpenTicket}
        onNew={goNew}
      />
    );
  }

  return (
    <Box sx={{ flex: 1, minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column", pb: { xs: 10, md: 0 } }}>
      {viewId !== "dashboard" && (
        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 0.5, mb: 1 }}>
          <Tooltip title="Ricerca rapida (Ctrl+K)">
            <IconButton size="small" onClick={() => navigate("elenco")} sx={{ color: "text.secondary" }}>
              <SearchIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <IconButton size="small" onClick={refresh} sx={{ color: "text.secondary" }}>
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Box>
      )}

      {renderView()}

      <TicketsQuickDock
        serviceColor={serviceColor}
        onNew={goNew}
        onUrgent={() => navigate("urgenti")}
        onSearch={() => navigate("elenco")}
        onDashboard={() => navigate("dashboard")}
      />

      <TicketCreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSaved={refresh}
        serviceColor={serviceColor}
      />
    </Box>
  );
}
