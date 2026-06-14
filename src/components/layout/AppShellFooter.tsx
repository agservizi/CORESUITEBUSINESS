"use client";

import { Box, Typography } from "@mui/material";
import { getShellTokens } from "@/theme/shell-tokens";

export type AppShellFooterProps = {
  /** Meno padding verticale (login, ricevute pubbliche). */
  compact?: boolean;
  /** Etichetta a destra accanto all'anno. */
  tagline?: string;
};

export default function AppShellFooter({
  compact = false,
  tagline = "Service Hub",
}: AppShellFooterProps) {
  const year = new Date().getFullYear();

  return (
    <Box
      component="footer"
      sx={(theme) => {
        const t = getShellTokens(theme);
        return {
          flexShrink: 0,
          borderTop: t.border,
          bgcolor: t.chrome,
          px: { xs: 2, md: 3 },
          py: compact ? 1.25 : 1.75,
        };
      }}
    >
      <Box
        sx={{
          maxWidth: 1400,
          mx: "auto",
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: "center",
          justifyContent: { xs: "center", sm: "space-between" },
          gap: 0.75,
          textAlign: { xs: "center", sm: "left" },
        }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: "0.02em" }}>
          <Box component="span" sx={{ fontWeight: 700, color: "text.primary" }}>
            Coresuite
          </Box>
          {" · AG Servizi"}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ opacity: 0.85 }}>
          © {year} · {tagline}
        </Typography>
      </Box>
    </Box>
  );
}
