"use client";

import { useState } from "react";
import { Box } from "@mui/material";
import { usePlatformNavigation } from "@/context/PlatformNavigationProvider";
import { getModuleDefinition } from "@/config/platform-modules";
import GenericModuleView from "../GenericModuleView";
import ModuleDashboard from "../service-shell/ModuleDashboard";
import RecordDetailDrawer from "./RecordDetailDrawer";

const DOC_ENTITY_TYPES: Record<string, string> = {
  cie: "cie-booking",
  "visure-cr": "visure-case",
  aci: "aci-practice",
  telegrammi: "telegram",
};

export default function GenericPracticeModuleView({
  moduleKey,
  viewId,
  serviceColor = "#6366f1",
  serviceName,
}: {
  moduleKey: string;
  viewId: string;
  serviceColor?: string;
  serviceName?: string;
}) {
  const { navigate, serviceSlug } = usePlatformNavigation();
  const module = getModuleDefinition(moduleKey)!;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  if (viewId === "dashboard") {
    return (
      <ModuleDashboard
        moduleKey={moduleKey}
        serviceColor={serviceColor}
        serviceName={serviceName ?? module.entityLabelPlural}
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
        viewId="elenco"
        serviceColor={serviceColor}
        showToolbar
        moduleKeyOverride={moduleKey}
        serviceNameOverride={serviceName}
        onRowClick={setSelectedId}
      />
      <RecordDetailDrawer
        open={Boolean(selectedId)}
        onClose={() => setSelectedId(null)}
        recordId={selectedId}
        moduleKey={moduleKey}
        module={module}
        docEntityType={DOC_ENTITY_TYPES[moduleKey] ?? moduleKey}
        serviceColor={serviceColor}
        onUpdated={() => setRefreshKey((k) => k + 1)}
      />
    </Box>
  );
}
