"use client";

import { useState } from "react";
import { Box } from "@mui/material";
import { usePlatformNavigation } from "@/context/PlatformNavigationProvider";
import { getModuleDefinition } from "@/config/platform-modules";
import GenericModuleView from "../GenericModuleView";
import ModuleDashboard from "../service-shell/ModuleDashboard";
import PracticeWorkflowDrawer from "../shared/PracticeWorkflowDrawer";

export default function AnprModuleView({ viewId, serviceColor = "#3b82f6" }: { viewId: string; serviceColor?: string }) {
  const { navigate, serviceSlug } = usePlatformNavigation();
  const module = getModuleDefinition("anpr")!;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  if (viewId === "dashboard") {
    return (
      <ModuleDashboard moduleKey="anpr" serviceColor={serviceColor} serviceName="ANPR" listViewId="elenco" onNavigate={navigate} serviceSlug={serviceSlug} />
    );
  }

  return (
    <Box key={refreshKey}>
      <GenericModuleView
        module={module}
        viewId="elenco"
        serviceColor={serviceColor}
        showToolbar
        moduleKeyOverride="anpr"
        serviceNameOverride="ANPR"
        onRowClick={setSelectedId}
      />
      <PracticeWorkflowDrawer
        open={Boolean(selectedId)}
        onClose={() => setSelectedId(null)}
        recordId={selectedId}
        entityType="anpr"
        serviceColor={serviceColor}
        onUpdated={() => setRefreshKey((k) => k + 1)}
      />
    </Box>
  );
}
