import type { Theme } from "@mui/material/styles";
import type { SystemStyleObject } from "@mui/system";

export interface ShellTokens {
  pageBg: string;
  chrome: string;
  panel: string;
  panelElevated: string;
  border: string;
  borderColor: string;
  hover: string;
  hoverStrong: string;
  rowHover: string;
  inputBg: string;
  inputBorder: string;
  inputBorderHover: string;
  dialog: string;
  drawer: string;
  menu: string;
  skeleton: string;
  skeletonTrack: string;
  overlay: string;
  gridLine: string;
  progressTrack: string;
  chartTooltip: { background: string; border: string; borderRadius: number };
  chartAxis: string;
  backdrop: string;
}

export function getShellTokens(theme: Theme): ShellTokens {
  const isDark = theme.palette.mode === "dark";
  const divider = theme.palette.divider;

  return {
    pageBg: theme.palette.background.default,
    chrome: isDark ? "#0a0f18" : "#ffffff",
    panel: isDark ? "rgba(13,17,23,0.7)" : "rgba(255,255,255,0.92)",
    panelElevated: theme.palette.background.paper,
    border: `1px solid ${divider}`,
    borderColor: divider,
    hover: isDark ? "rgba(148,163,184,0.06)" : "rgba(15,23,42,0.04)",
    hoverStrong: isDark ? "rgba(148,163,184,0.08)" : "rgba(15,23,42,0.06)",
    rowHover: isDark ? "rgba(148,163,184,0.04)" : "rgba(15,23,42,0.03)",
    inputBg: isDark ? "rgba(148,163,184,0.06)" : "rgba(15,23,42,0.04)",
    inputBorder: isDark ? "rgba(148,163,184,0.1)" : "rgba(15,23,42,0.08)",
    inputBorderHover: isDark ? "rgba(148,163,184,0.2)" : "rgba(15,23,42,0.14)",
    dialog: theme.palette.background.paper,
    drawer: theme.palette.background.default,
    menu: theme.palette.background.paper,
    skeleton: isDark ? "rgba(148,163,184,0.1)" : "rgba(15,23,42,0.06)",
    skeletonTrack: isDark ? "rgba(148,163,184,0.06)" : "rgba(15,23,42,0.04)",
    overlay: theme.palette.background.default,
    gridLine: isDark ? "rgba(148,163,184,0.04)" : "rgba(15,23,42,0.06)",
    progressTrack: isDark ? "rgba(148,163,184,0.12)" : "rgba(15,23,42,0.08)",
    chartTooltip: {
      background: theme.palette.background.paper,
      border: `1px solid ${isDark ? "rgba(148,163,184,0.15)" : "rgba(15,23,42,0.1)"}`,
      borderRadius: 8,
    },
    chartAxis: theme.palette.text.secondary,
    backdrop: isDark ? "rgba(0,0,0,0.55)" : "rgba(15,23,42,0.35)",
  };
}

export function shellPageSx(theme: Theme): SystemStyleObject<Theme> {
  return {
    background: getShellTokens(theme).pageBg,
    color: theme.palette.text.primary,
  };
}

export function shellPanelSx(theme: Theme): SystemStyleObject<Theme> {
  const t = getShellTokens(theme);
  return {
    background: t.panel,
    border: t.border,
    borderRadius: 3,
  };
}

export function shellPaperSx(theme: Theme): SystemStyleObject<Theme> {
  const t = getShellTokens(theme);
  return {
    background: t.panelElevated,
    border: t.border,
  };
}

export function shellDialogPaperSx(theme: Theme): SystemStyleObject<Theme> {
  const t = getShellTokens(theme);
  return {
    background: t.dialog,
    backgroundImage: "none",
    border: t.border,
    borderRadius: 3,
  };
}

export function shellDrawerPaperSx(theme: Theme): SystemStyleObject<Theme> {
  const t = getShellTokens(theme);
  return {
    background: t.drawer,
    backgroundImage: "none",
    borderLeft: t.border,
  };
}

export function shellMenuPaperSx(theme: Theme): SystemStyleObject<Theme> {
  const t = getShellTokens(theme);
  return {
    background: t.menu,
    backgroundImage: "none",
    border: t.border,
  };
}

export function shellSearchBoxSx(theme: Theme): SystemStyleObject<Theme> {
  const t = getShellTokens(theme);
  return {
    display: "flex",
    alignItems: "center",
    gap: 1,
    background: t.inputBg,
    border: `1px solid ${t.inputBorder}`,
    borderRadius: 2,
    px: 1.5,
    py: 0.5,
    cursor: "pointer",
    "&:hover": { borderColor: t.inputBorderHover },
  };
}

export function chartTooltipStyle(theme: Theme) {
  return getShellTokens(theme).chartTooltip;
}

export function chartAxisTick(theme: Theme, fontSize = 11) {
  return { fill: getShellTokens(theme).chartAxis, fontSize };
}

/** Unisce stili shell in un callback per `sx` senza errori TS sugli array. */
export function mergeShellSx(
  ...parts: Array<SystemStyleObject<Theme> | ((theme: Theme) => SystemStyleObject<Theme>)>
) {
  return (theme: Theme): SystemStyleObject<Theme> =>
    Object.assign(
      {},
      ...parts.map((part) => (typeof part === "function" ? part(theme) : part))
    );
}

/** Evita il taglio delle label sul primo campo (margine negativo del Grid). */
export const dialogFormContentSx: SystemStyleObject<Theme> = { pt: 3 };

export const dialogFormGridSx: SystemStyleObject<Theme> = { pt: 1.5, width: "100%" };

export const dialogStaticLabelSx: SystemStyleObject<Theme> = {
  display: "block",
  mb: 0.75,
  fontWeight: 600,
  fontSize: "0.8rem",
  color: "text.secondary",
};

/** @deprecated Usa getShellTokens(theme).panel */
export function hubSurface(isDark: boolean) {
  return isDark ? "rgba(13,17,23,0.7)" : "rgba(255,255,255,0.85)";
}

/** @deprecated Usa getShellTokens(theme).borderColor */
export function hubBorder(isDark: boolean) {
  return isDark ? "rgba(148,163,184,0.08)" : "rgba(15,23,42,0.08)";
}

/** @deprecated Usa getShellTokens(theme).chrome */
export function hubGlass(isDark: boolean) {
  return isDark ? "rgba(8,12,20,0.85)" : "rgba(255,255,255,0.92)";
}
