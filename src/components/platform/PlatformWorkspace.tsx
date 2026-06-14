"use client";

import { useState, type ReactNode } from "react";
import { Box } from "@mui/material";
import { AnimatePresence, motion } from "framer-motion";
import { usePlatformNavigation } from "@/context/PlatformNavigationProvider";
import { getPlatformService } from "@/config/platform-services";
import { getModuleDefinition } from "@/config/platform-modules";
import OperationsDashboardView from "./OperationsDashboardView";
import TicketDetailView from "./TicketDetailView";
import ExpressModuleView from "./ExpressModuleView";
import OpportunitiesModuleView from "./OpportunitiesModuleView";
import EntrateUsciteModuleView from "./EntrateUsciteModuleView";
import ServiceModuleView from "./service-shell/ServiceModuleView";
import MarketingModuleView from "./marketing/MarketingModuleView";
import AppointmentsModuleView from "./appuntamenti/AppointmentsModuleView";
import TicketsModuleView from "./tickets/TicketsModuleView";
import CafPatronatoModuleView from "./caf-patronato/CafPatronatoModuleView";
import AnprModuleView from "./anpr/AnprModuleView";
import EnergiaModuleView from "./energia/EnergiaModuleView";
import BrtModuleView from "./brt/BrtModuleView";
import LogisticaModuleView from "./logistica/LogisticaModuleView";
import PostaTelematicaModuleView from "./posta-telematica/PostaTelematicaModuleView";
import CurriculumModuleView from "./curriculum/CurriculumModuleView";
import GenericPracticeModuleView from "./shared/GenericPracticeModuleView";
import FedeltaModuleView from "./fedelta/FedeltaModuleView";

/** Moduli con solo dashboard + elenco generico */
const SERVICE_SHELL_MODULES = new Set<string>([]);

export default function PlatformWorkspace() {
  const { serviceSlug, viewId } = usePlatformNavigation();
  const service = getPlatformService(serviceSlug);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  if (serviceSlug === "operations") {
    return (
      <AnimatePresence mode="wait">
        <motion.div key={viewId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }}>
          <OperationsDashboardView viewId={viewId} />
        </motion.div>
      </AnimatePresence>
    );
  }

  const moduleKey = service?.moduleKey || serviceSlug;
  const module = getModuleDefinition(moduleKey);

  if (!module && !["operations"].includes(serviceSlug)) {
    return (
      <Box sx={{ py: 4, textAlign: "center", color: "text.secondary" }}>
        Modulo {service?.name || serviceSlug} in configurazione.
      </Box>
    );
  }

  const motionWrap = (key: string, children: ReactNode) => (
    <AnimatePresence mode="wait">
      <motion.div key={key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }}>
        {children}
      </motion.div>
    </AnimatePresence>
  );

  if (moduleKey === "tickets" && selectedTicketId) {
    return motionWrap(
      `ticket-detail-${selectedTicketId}`,
      <TicketDetailView
        ticketId={selectedTicketId}
        onBack={() => setSelectedTicketId(null)}
        serviceColor={service?.color}
      />
    );
  }

  if (moduleKey === "express") {
    return motionWrap(`express-${viewId}`, <ExpressModuleView viewId={viewId} serviceColor={service?.color} />);
  }

  if (moduleKey === "opportunities") {
    return motionWrap(
      `opportunities-${viewId}`,
      <OpportunitiesModuleView viewId={viewId} serviceColor={service?.color || "#8b5cf6"} />
    );
  }

  if (moduleKey === "entrate-uscite") {
    return motionWrap(
      `entrate-uscite-${viewId}`,
      <EntrateUsciteModuleView viewId={viewId} serviceColor={service?.color || "#22c55e"} />
    );
  }

  if (moduleKey === "marketing") {
    return motionWrap(`marketing-${viewId}`, <MarketingModuleView viewId={viewId} serviceColor={service?.color} />);
  }

  if (moduleKey === "appuntamenti") {
    return motionWrap(`appuntamenti-${viewId}`, <AppointmentsModuleView viewId={viewId} serviceColor={service?.color} />);
  }

  if (moduleKey === "tickets") {
    return motionWrap(
      `tickets-${viewId}`,
      <TicketsModuleView viewId={viewId} serviceColor={service?.color} onOpenTicket={setSelectedTicketId} />
    );
  }

  if (moduleKey === "caf-patronato") {
    return motionWrap(`caf-patronato-${viewId}`, <CafPatronatoModuleView viewId={viewId} serviceColor={service?.color} />);
  }

  if (moduleKey === "anpr") {
    return motionWrap(`anpr-${viewId}`, <AnprModuleView viewId={viewId} serviceColor={service?.color} />);
  }

  if (moduleKey === "energia") {
    return motionWrap(`energia-${viewId}`, <EnergiaModuleView viewId={viewId} serviceColor={service?.color} />);
  }

  if (moduleKey === "brt") {
    return motionWrap(`brt-${viewId}`, <BrtModuleView viewId={viewId} serviceColor={service?.color} />);
  }

  if (moduleKey === "logistica") {
    return motionWrap(`logistica-${viewId}`, <LogisticaModuleView viewId={viewId} serviceColor={service?.color} />);
  }

  if (moduleKey === "posta-telematica") {
    return motionWrap(`posta-telematica-${viewId}`, <PostaTelematicaModuleView viewId={viewId} serviceColor={service?.color} />);
  }

  if (moduleKey === "curriculum") {
    return motionWrap(`curriculum-${viewId}`, <CurriculumModuleView viewId={viewId} serviceColor={service?.color} />);
  }

  if (moduleKey === "fedelta") {
    return motionWrap(`fedelta-${viewId}`, <FedeltaModuleView viewId={viewId} serviceColor={service?.color} />);
  }

  const PRACTICE_MODULE_KEYS = new Set(["cie", "visure-cr", "aci", "telegrammi"]);
  if (PRACTICE_MODULE_KEYS.has(moduleKey)) {
    return motionWrap(
      `${moduleKey}-${viewId}`,
      <GenericPracticeModuleView
        moduleKey={moduleKey}
        viewId={viewId}
        serviceColor={service?.color}
        serviceName={service?.name}
      />
    );
  }

  if (SERVICE_SHELL_MODULES.has(moduleKey)) {
    return motionWrap(
      `${moduleKey}-${viewId}`,
      <ServiceModuleView moduleKey={moduleKey} viewId={viewId} serviceColor={service?.color} />
    );
  }

  if (!module) return null;

  const listViews = new Set(["elenco", "aperti", "aperte", "vinte", "entrate", "uscite", "caf", "patronato", "iscritti", "campagne"]);
  const effectiveView = viewId === "dashboard" || listViews.has(viewId) ? viewId : "elenco";

  return motionWrap(
    `${moduleKey}-${effectiveView}`,
    <ServiceModuleView moduleKey={moduleKey} viewId={effectiveView} serviceColor={service?.color} />
  );
}
