"use client";

import { useState } from "react";
import { Box } from "@mui/material";
import { usePlatformNavigation } from "@/context/PlatformNavigationProvider";
import { getModuleDefinition } from "@/config/platform-modules";
import GenericModuleView from "../GenericModuleView";
import ModuleDashboard from "../service-shell/ModuleDashboard";
import PracticeWorkflowDrawer from "../shared/PracticeWorkflowDrawer";

export default function CafPatronatoModuleView({ viewId, serviceColor = "#f59e0b" }: { viewId: string; serviceColor?: string }) {
  const { navigate, serviceSlug } = usePlatformNavigation();
  const module = getModuleDefinition("caf-patronato")!;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const listView = viewId === "caf" || viewId === "patronato" ? viewId : "elenco";

  if (viewId === "dashboard") {
    return (
      <ModuleDashboard
        moduleKey="caf-patronato"
        serviceColor={serviceColor}
        serviceName="CAF & Patronato"
        listViewId="elenco"
        onNavigate={navigate}
        serviceSlug={serviceSlug}
      />
    );
  }

  return (
    <Box key={refreshKey}>
      <GenericModuleView
        module={module}
        viewId={listView}
        serviceColor={serviceColor}
        showToolbar
        moduleKeyOverride="caf-patronato"
        serviceNameOverride="CAF & Patronato"
        onRowClick={setSelectedId}
      />
      <PracticeWorkflowDrawer
        open={Boolean(selectedId)}
        onClose={() => setSelectedId(null)}
        recordId={selectedId}
        entityType="caf-patronato"
        serviceColor={serviceColor}
        onUpdated={() => setRefreshKey((k) => k + 1)}
      />
    </Box>
  );
}
