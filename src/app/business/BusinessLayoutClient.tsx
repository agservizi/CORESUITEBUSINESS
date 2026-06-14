"use client";

import { useEffect, useState } from "react";
import { Box, useMediaQuery, useTheme } from "@mui/material";
import BusinessSidebar from "@/components/business/BusinessSidebar";
import BusinessTopBar from "@/components/business/BusinessTopBar";
import BusinessWorkspace from "@/components/business/BusinessWorkspace";
import ServiceEnterTransition from "@/components/hub/ServiceEnterTransition";
import { BusinessNavigationProvider } from "@/context/BusinessNavigationProvider";
import { APP_SHELL, AppShellMainColumn, shellPageSx } from "@/components/layout/app-shell";

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  avatar: string | null;
}

export default function BusinessLayoutClient({
  user,
}: {
  children: React.ReactNode;
  user: User;
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
    <BusinessNavigationProvider>
      <Box
        sx={(theme) => ({
          ...shellPageSx(theme),
          display: "flex",
          height: "100vh",
          overflow: "hidden",
        })}
      >
        <BusinessSidebar
          open={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          width={sidebarWidth}
          collapsedWidth={sidebarCollapsedWidth}
        />
        <AppShellMainColumn
          sidebarOffset={sidebarOffset}
          topBar={<BusinessTopBar user={user} onMenuClick={() => setSidebarOpen(!sidebarOpen)} />}
        >
          <ServiceEnterTransition serviceSlug="business">
            <BusinessWorkspace />
          </ServiceEnterTransition>
        </AppShellMainColumn>
      </Box>
    </BusinessNavigationProvider>
  );
}
