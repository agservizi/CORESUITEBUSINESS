import type { SxProps, Theme } from "@mui/material";
import type { SystemStyleObject } from "@mui/system";
import { getShellTokens } from "@/theme/shell-tokens";

/** Callback `sx` del layout shell (sidebar, topbar, pagina). */
export type ShellSxFn = (theme: Theme) => SystemStyleObject<Theme>;

/** Shell condiviso: sidebar + topbar — dimensioni fisse; colori da tema. */
export const APP_SHELL = {
  headerHeight: 56,
  sidebarZIndex: 1200,
  topbarZIndex: 1100,
  sidebarWidth: 240,
  sidebarCollapsedWidth: 64,
  sidebarHeaderPaddingOpen: 2,
  sidebarHeaderPaddingCollapsed: 0.5,
  sidebarHeaderGapOpen: 1,
} as const;

export const SIDEBAR_TOGGLE_LABELS = {
  expand: "Espandi menu",
  collapse: "Comprimi menu",
} as const;

export const sidebarShellSx: ShellSxFn = (theme) => {
  const t = getShellTokens(theme);
  return {
    position: "fixed",
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: APP_SHELL.sidebarZIndex,
    background: t.chrome,
    borderRight: t.border,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  };
};

export const sidebarHeaderSx: SxProps<Theme> = (theme) => ({
  height: APP_SHELL.headerHeight,
  display: "flex",
  alignItems: "center",
  flexShrink: 0,
  borderBottom: getShellTokens(theme).border,
});

/** Header sidebar: espanso = logo + titolo + toggle; collassato = solo toggle centrato. */
export function getSidebarHeaderSx(
  open: boolean,
  options?: { gap?: number }
): SxProps<Theme> {
  return (theme) => ({
    ...((typeof sidebarHeaderSx === "function" ? sidebarHeaderSx(theme) : sidebarHeaderSx) as object),
    px: open ? APP_SHELL.sidebarHeaderPaddingOpen : APP_SHELL.sidebarHeaderPaddingCollapsed,
    justifyContent: open ? "flex-start" : "center",
    gap: open ? (options?.gap ?? APP_SHELL.sidebarHeaderGapOpen) : 0,
  });
}

export const sidebarToggleButtonSx: SxProps<Theme> = {
  flexShrink: 0,
  color: "text.secondary",
};

export const topbarShellSx: ShellSxFn = (theme) => {
  const t = getShellTokens(theme);
  return {
    position: "sticky",
    top: 0,
    zIndex: APP_SHELL.topbarZIndex,
    height: APP_SHELL.headerHeight,
    background: t.chrome,
    borderBottom: t.border,
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
  };
};

export {
  topbarActionsSx,
  topbarUserBlockSx,
  topbarAvatarSx,
} from "./AppShellTopBarActions";

/** @deprecated Usa APP_SHELL */
export const PLATFORM_SHELL = APP_SHELL;

/** Stili pagina/panel — re-export da shell-tokens per import unificato dal layout shell. */
export {
  shellPageSx,
  shellPanelSx,
  shellPaperSx,
  shellDialogPaperSx,
  shellDrawerPaperSx,
  shellMenuPaperSx,
  shellSearchBoxSx,
  dialogFormContentSx,
  dialogFormGridSx,
  dialogStaticLabelSx,
  mergeShellSx,
} from "@/theme/shell-tokens";

/** Formato visualizzato nel calendario MUI (locale IT). */
export const DATE_PICKER_DISPLAY_FORMAT = "DD/MM/YYYY" as const;

/** Formato stringa per API e state (ISO date). */
export const DATE_VALUE_FORMAT = "YYYY-MM-DD" as const;

export { AppDateField } from "./AppDateField";
export type { AppDateFieldProps } from "./AppDateField";
export { AppDateLocalizationProvider } from "./AppDateLocalizationProvider";
export { default as AppShellTopBarActions } from "./AppShellTopBarActions";
export type { AppShellTopBarUser } from "./AppShellTopBarActions";
export { getAppShellUserInitials } from "./AppShellTopBarActions";
