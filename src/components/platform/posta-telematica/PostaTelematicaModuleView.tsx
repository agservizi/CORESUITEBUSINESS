"use client";

import { useCallback, useEffect, useState } from "react";
import { usePlatformNavigation } from "@/context/PlatformNavigationProvider";
import { getPlatformService } from "@/config/platform-services";
import PostaTelematicaDashboard from "./PostaTelematicaDashboard";
import PostaSendComposer from "./PostaSendComposer";
import PostaStoricoView from "./PostaStoricoView";
import PostaInboxView from "./PostaInboxView";
import PostaMessageDrawer from "./PostaMessageDrawer";
import type { PecStatus, PostaMessageRow } from "./posta-utils";
import { fetchPostaJson } from "./posta-fetch";

export default function PostaTelematicaModuleView({
  viewId,
  serviceColor = "#7c3aed",
}: {
  viewId: string;
  serviceColor?: string;
}) {
  const { navigate, serviceSlug } = usePlatformNavigation();
  const service = getPlatformService(serviceSlug);
  const [pecStatus, setPecStatus] = useState<PecStatus | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<PostaMessageRow | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      setPecStatus(await fetchPostaJson<PecStatus>("/api/platform/posta-telematica/messages?view=status"));
    } catch {
      setPecStatus(null);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    if (viewId === "elenco") navigate("dashboard");
  }, [viewId, navigate]);

  function openMessage(message: PostaMessageRow) {
    setSelectedMessage(message);
    setDrawerOpen(true);
  }

  if (viewId === "dashboard" || viewId === "elenco") {
    return (
      <>
        <PostaTelematicaDashboard
          serviceColor={serviceColor}
          onNavigate={navigate}
          onOpenMessage={openMessage}
        />
        <PostaMessageDrawer
          message={selectedMessage}
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          serviceColor={serviceColor}
        />
      </>
    );
  }

  if (viewId === "invio") {
    return (
      <PostaSendComposer
        serviceColor={serviceColor}
        serviceGradient={service?.gradient}
        pecStatus={pecStatus}
        onSent={() => navigate("storico")}
      />
    );
  }

  if (viewId === "storico") {
    return (
      <>
        <PostaStoricoView
          serviceColor={serviceColor}
          serviceGradient={service?.gradient}
          onOpenMessage={openMessage}
        />
        <PostaMessageDrawer
          message={selectedMessage}
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          serviceColor={serviceColor}
        />
      </>
    );
  }

  if (viewId === "inbox") {
    return (
      <PostaInboxView
        serviceColor={serviceColor}
        serviceGradient={service?.gradient}
        pecStatus={pecStatus}
      />
    );
  }

  return null;
}
