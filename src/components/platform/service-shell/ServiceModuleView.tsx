"use client";

import { useCallback, useState } from "react";
import { Box, IconButton, Tooltip } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import { usePlatformNavigation } from "@/context/PlatformNavigationProvider";
import { getModuleDefinition } from "@/config/platform-modules";
import { getPlatformService } from "@/config/platform-services";
import GenericModuleView from "../GenericModuleView";
import ModuleDashboard from "./ModuleDashboard";

interface Props {
  moduleKey: string;
  viewId: string;
  serviceColor?: string;
  onRowClick?: (id: string) => void;
  listViews?: string[];
}

const DEFAULT_LIST_VIEWS = [
  "elenco", "aperti", "aperte", "vinte", "entrate", "uscite", "caf", "patronato", "iscritti", "campagne",
];

export default function ServiceModuleView({
  moduleKey,
  viewId,
  serviceColor = "#6366f1",
  onRowClick,
  listViews = DEFAULT_LIST_VIEWS,
}: Props) {
  const { serviceSlug, navigate } = usePlatformNavigation();
  const service = getPlatformService(serviceSlug);
  const module = getModuleDefinition(moduleKey);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  if (!module) return null;

  const listViewId = listViews.includes(viewId) ? viewId : "elenco";

  if (viewId === "dashboard") {
    return (
      <Box key={refreshKey}>
        <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1 }}>
          <Tooltip title="Aggiorna dashboard">
            <IconButton size="small" onClick={refresh}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
        <ModuleDashboard
          moduleKey={moduleKey}
          serviceColor={serviceColor}
          serviceName={service?.name ?? module.entityLabelPlural}
          listViewId={listViewId}
          onNavigate={navigate}
          serviceSlug={serviceSlug}
        />
      </Box>
    );
  }

  return (
    <GenericModuleView
      key={`${refreshKey}-${viewId}`}
      module={module}
      viewId={listViewId}
      serviceColor={serviceColor}
      onRowClick={onRowClick}
      showToolbar
      moduleKeyOverride={moduleKey}
      serviceNameOverride={service?.name}
    />
  );
}
