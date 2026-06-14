"use client";

import Link from "next/link";
import { Box } from "@mui/material";
import { useThemeMode } from "@/context/ThemeModeProvider";
import { CORESUITE_LOGO_TOPBAR } from "@/lib/brand";

type CoresuiteTopBarLogoProps = {
  href?: string;
};

const LOGO_HEIGHT = 40;

/** Lockup orizzontale topbar — SVG con trasparenza reale e crop stretto. */
export default function CoresuiteTopBarLogo({ href = "/dashboard" }: CoresuiteTopBarLogoProps) {
  const { mode } = useThemeMode();
  const src = mode === "dark" ? CORESUITE_LOGO_TOPBAR.onDark : CORESUITE_LOGO_TOPBAR.onLight;

  return (
    <Box
      component={Link}
      href={href}
      sx={{
        display: "inline-flex",
        alignItems: "center",
        textDecoration: "none",
        flexShrink: 0,
        lineHeight: 0,
        transition: "opacity 0.2s ease",
        "&:hover": { opacity: 0.88 },
      }}
      aria-label="Coresuite — torna alla dashboard"
    >
      <Box
        component="img"
        src={src}
        alt="Coresuite"
        sx={{
          height: LOGO_HEIGHT,
          width: "auto",
          display: "block",
        }}
      />
    </Box>
  );
}
