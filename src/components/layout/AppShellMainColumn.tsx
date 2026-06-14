"use client";

import { Box, type SxProps, Theme } from "@mui/material";
import AppShellFooter from "./AppShellFooter";

type AppShellMainColumnProps = {
  topBar: React.ReactNode;
  children: React.ReactNode;
  sidebarOffset: string | number | object;
  contentSx?: SxProps<Theme>;
  mainSx?: SxProps<Theme>;
  showFooter?: boolean;
};

/** Colonna principale shell: topbar fissa, contenuto scrollabile, footer in fondo al flusso (non sticky). */
export default function AppShellMainColumn({
  topBar,
  children,
  sidebarOffset,
  contentSx,
  mainSx,
  showFooter = true,
}: AppShellMainColumnProps) {
  return (
    <Box
      component="main"
      sx={[
        {
          flex: 1,
          minWidth: 0,
          ml: sidebarOffset,
          transition: "margin-left 0.25s ease",
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        },
        ...(mainSx ? (Array.isArray(mainSx) ? mainSx : [mainSx]) : []),
      ]}
    >
      {topBar}
      <Box
        sx={[
          {
            flex: 1,
            minWidth: 0,
            minHeight: 0,
            overflow: "auto",
          },
          ...(contentSx ? (Array.isArray(contentSx) ? contentSx : [contentSx]) : []),
        ]}
      >
        <Box
          sx={{
            minHeight: "100%",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              p: { xs: 2, md: 3 },
            }}
          >
            {children}
          </Box>
          {showFooter && <AppShellFooter />}
        </Box>
      </Box>
    </Box>
  );
}
