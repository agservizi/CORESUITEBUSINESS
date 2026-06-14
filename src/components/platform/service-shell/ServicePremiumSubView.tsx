"use client";

import { Box } from "@mui/material";
import ServiceViewHero from "./ServiceViewHero";
import { ServiceKpiStrip } from "./useModuleDashboardMini";
import { getServiceViewTheme } from "./service-view-themes";

interface Props {
  moduleKey: string;
  viewId: string;
  serviceName: string;
  serviceColor: string;
  serviceGradient?: string;
  badge?: string;
  actions?: React.ReactNode;
  showKpiStrip?: boolean;
  children: React.ReactNode;
}

export default function ServicePremiumSubView({
  moduleKey,
  viewId,
  serviceName,
  serviceColor,
  serviceGradient,
  badge,
  actions,
  showKpiStrip = true,
  children,
}: Props) {
  const theme = getServiceViewTheme(moduleKey, viewId, serviceName, serviceColor, serviceGradient);

  return (
    <Box>
      <ServiceViewHero theme={theme} badge={badge}>
        {actions}
      </ServiceViewHero>
      {showKpiStrip && viewId !== "dashboard" && (
        <ServiceKpiStrip moduleKey={moduleKey} serviceColor={serviceColor} max={4} />
      )}
      {children}
    </Box>
  );
}
