"use client";

import { useEffect, useState } from "react";
import { Box, useMediaQuery, useTheme } from "@mui/material";
import PlatformSidebar from "@/components/platform/PlatformSidebar";
import PlatformTopBar from "@/components/platform/PlatformTopBar";
import PlatformWorkspace from "@/components/platform/PlatformWorkspace";
import ServiceEnterTransition from "@/components/hub/ServiceEnterTransition";
import { PlatformNavigationProvider } from "@/context/PlatformNavigationProvider";
import { PlatformUserProvider } from "@/context/PlatformUserContext";
import { APP_SHELL, shellPageSx } from "@/components/layout/app-shell";

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

  return (
    <PlatformNavigationProvider serviceSlug={serviceSlug}>
      <PlatformUserProvider user={{ id: user.id, role: user.role }}>
      <Box sx={(theme) => ({ ...shellPageSx(theme), display: "flex", minHeight: "100vh" })}>
        <PlatformSidebar
          open={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          width={sidebarWidth}
          collapsedWidth={sidebarCollapsedWidth}
          userRole={user.role}
        />
        <Box
          component="main"
          sx={{
            flex: 1,
            ml: { xs: 0, md: `${sidebarOpen ? sidebarWidth : sidebarCollapsedWidth}px` },
            transition: "margin-left 0.25s ease",
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <PlatformTopBar
            serviceSlug={serviceSlug}
            user={user}
            onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          />
          <Box sx={{ flex: 1, p: { xs: 2, md: 3 }, overflow: "hidden" }}>
            <ServiceEnterTransition serviceSlug={serviceSlug}>
              <PlatformWorkspace />
            </ServiceEnterTransition>
          </Box>
        </Box>
      </Box>
      </PlatformUserProvider>
    </PlatformNavigationProvider>
  );
}
