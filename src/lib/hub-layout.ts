import type { SxProps, Theme } from "@mui/material";

export type HubLayoutDensity = "compact" | "comfortable";

export const HUB_CARD_HEIGHT = {
  compact: 148,
  comfortable: 168,
} as const;

export const HUB_GRID_COLUMNS = {
  xs: "1fr",
  sm: "repeat(2, 1fr)",
  lg: "repeat(3, 1fr)",
} as const;

export function hubGridSx(gap = 2): SxProps<Theme> {
  return {
    display: "grid",
    gridTemplateColumns: HUB_GRID_COLUMNS,
    gap,
    alignItems: "stretch",
  };
}

export function hubCardHeightSx(density: HubLayoutDensity = "comfortable"): SxProps<Theme> {
  return {
    height: "100%",
    minHeight: HUB_CARD_HEIGHT[density],
  };
}

export function hubKpiFontSx(): SxProps<Theme> {
  return {
    fontWeight: 800,
    fontSize: "1.35rem",
    letterSpacing: "-0.02em",
    fontFamily: '"JetBrains Mono", "Roboto Mono", ui-monospace, monospace',
    fontVariantNumeric: "tabular-nums",
  };
}
