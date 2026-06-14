"use client";

import { usePlatformNavigation } from "@/context/PlatformNavigationProvider";
import { getModuleDefinition } from "@/config/platform-modules";
import ServiceModuleView from "../service-shell/ServiceModuleView";
import ModuleDashboard from "../service-shell/ModuleDashboard";
import AppointmentCalendarView from "../AppointmentCalendarView";
import ServicePremiumSubView from "../service-shell/ServicePremiumSubView";

interface Props {
  viewId: string;
  serviceColor?: string;
}

export default function AppointmentsModuleView({ viewId, serviceColor = "#10b981" }: Props) {
  const { navigate, serviceSlug } = usePlatformNavigation();
  const module = getModuleDefinition("appuntamenti")!;

  if (viewId === "calendario") {
    return (
      <ServicePremiumSubView
        moduleKey="appuntamenti"
        viewId="calendario"
        serviceName="Appuntamenti"
        serviceColor={serviceColor}
        showKpiStrip={false}
      >
        <AppointmentCalendarView serviceColor={serviceColor} />
      </ServicePremiumSubView>
    );
  }

  if (viewId === "dashboard") {
    return (
      <ModuleDashboard
        moduleKey="appuntamenti"
        serviceColor={serviceColor}
        serviceName="Appuntamenti"
        listViewId="elenco"
        onNavigate={navigate}
        serviceSlug={serviceSlug}
      />
    );
  }

  return (
    <ServiceModuleView moduleKey="appuntamenti" viewId={viewId} serviceColor={serviceColor} />
  );
}
