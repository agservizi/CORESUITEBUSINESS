"use client";

import { useEffect, useState } from "react";
import { Box, useMediaQuery, useTheme } from "@mui/material";
import BusinessSidebar from "@/components/business/BusinessSidebar";
import BusinessTopBar from "@/components/business/BusinessTopBar";
import BusinessWorkspace from "@/components/business/BusinessWorkspace";
import ServiceEnterTransition from "@/components/hub/ServiceEnterTransition";
import { BusinessNavigationProvider } from "@/context/BusinessNavigationProvider";
import { APP_SHELL, shellPageSx } from "@/components/layout/app-shell";

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
        <Box
          component="main"
          sx={{
            flex: 1,
            minWidth: 0,
            ml: { xs: 0, md: `${sidebarOpen ? sidebarWidth : sidebarCollapsedWidth}px` },
            transition: "margin-left 0.25s ease",
            height: "100vh",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <BusinessTopBar user={user} onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              minHeight: 0,
              p: { xs: 2, md: 3 },
              overflow: "auto",
              display: "flex",
              flexDirection: "column",
            }}
          >
              <ServiceEnterTransition serviceSlug="business">
                <BusinessWorkspace />
              </ServiceEnterTransition>
            </Box>
        </Box>
      </Box>
    </BusinessNavigationProvider>
  );
}
