"use client";

import { Box } from "@mui/material";
import { AnimatePresence, motion } from "framer-motion";
import { useBusinessNavigation } from "@/context/BusinessNavigationProvider";
import BusinessDashboard from "@/app/business/BusinessDashboard";
import ClientiView from "@/components/business/views/ClientiView";
import LeadView from "@/components/business/views/LeadView";
import PipelineView from "@/components/business/views/PipelineView";
import AttivitaView from "@/components/business/views/AttivitaView";
import PreventiviView from "@/components/business/views/PreventiviView";
import ReportView from "@/components/business/views/ReportView";
import DealsView from "@/components/business/views/DealsView";
import BusinessDetailPanel from "@/components/business/BusinessDetailPanel";

function WorkspaceContent() {
  const { section, detailId } = useBusinessNavigation();

  const views = {
    dashboard: <BusinessDashboard />,
    clienti: <ClientiView />,
    lead: <LeadView />,
    pipeline: <PipelineView />,
    deals: <DealsView />,
    attivita: <AttivitaView />,
    preventivi: <PreventiviView />,
    report: <ReportView />,
  };

  return (
    <Box sx={{ position: "relative", minWidth: 0, maxWidth: "100%", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={section}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2 }}
          style={{ minWidth: 0, maxWidth: "100%", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}
        >
          {views[section]}
        </motion.div>
      </AnimatePresence>

      <BusinessDetailPanel section={section} detailId={detailId} />
    </Box>
  );
}

export default function BusinessWorkspace() {
  return <WorkspaceContent />;
}
