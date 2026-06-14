"use client";

import { useEffect, useState } from "react";
import { Box, useMediaQuery, useTheme } from "@mui/material";
import PlatformSidebar from "@/components/platform/PlatformSidebar";
import PlatformTopBar from "@/components/platform/PlatformTopBar";
import PlatformWorkspace from "@/components/platform/PlatformWorkspace";
import ServiceEnterTransition from "@/components/hub/ServiceEnterTransition";
import { PlatformNavigationProvider } from "@/context/PlatformNavigationProvider";
import { PlatformUserProvider } from "@/context/PlatformUserContext";
import { APP_SHELL, AppShellMainColumn, shellPageSx } from "@/components/layout/app-shell";

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  avatar: string | null;
}

export default function PlatformLayoutClient({
  serviceSlug,
  user,
  children,
}: {
  serviceSlug: string;
  user: User;
  children?: React.ReactNode;
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"), { noSsr: true });
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  const sidebarWidth = APP_SHELL.sidebarWidth;
  const sidebarCollapsedWidth = APP_SHELL.sidebarCollapsedWidth;
  const sidebarOffset = { xs: 0, md: `${sidebarOpen ? sidebarWidth : sidebarCollapsedWidth}px` };

  return (
    <PlatformNavigationProvider serviceSlug={serviceSlug}>
      <PlatformUserProvider user={{ id: user.id, role: user.role }}>
        <Box sx={(theme) => ({ ...shellPageSx(theme), display: "flex", height: "100vh", overflow: "hidden" })}>
          <PlatformSidebar
            open={sidebarOpen}
            onToggle={() => setSidebarOpen(!sidebarOpen)}
            width={sidebarWidth}
            collapsedWidth={sidebarCollapsedWidth}
            userRole={user.role}
          />
          <AppShellMainColumn
            sidebarOffset={sidebarOffset}
            topBar={
              <PlatformTopBar
                serviceSlug={serviceSlug}
                user={user}
                onMenuClick={() => setSidebarOpen(!sidebarOpen)}
              />
            }
          >
            <ServiceEnterTransition serviceSlug={serviceSlug}>
              <PlatformWorkspace />
            </ServiceEnterTransition>
          </AppShellMainColumn>
        </Box>
      </PlatformUserProvider>
    </PlatformNavigationProvider>
  );
}
