import { createTheme, type ThemeOptions } from "@mui/material/styles";
import type {} from "@mui/x-date-pickers/themeAugmentation";

export type ThemeMode = "light" | "dark";

export {
  getShellTokens,
  shellPageSx,
  shellPanelSx,
  shellPaperSx,
  shellDialogPaperSx,
  shellDrawerPaperSx,
  shellMenuPaperSx,
  shellSearchBoxSx,
  chartTooltipStyle,
  chartAxisTick,
  mergeShellSx,
  hubSurface,
  hubBorder,
  hubGlass,
} from "./shell-tokens";
export type { ShellTokens } from "./shell-tokens";

const sharedTypography = {
  fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  h1: { fontWeight: 700, letterSpacing: "-0.02em" },
  h2: { fontWeight: 700, letterSpacing: "-0.02em" },
  h3: { fontWeight: 600, letterSpacing: "-0.01em" },
  h4: { fontWeight: 600 },
  h5: { fontWeight: 600 },
  h6: { fontWeight: 600 },
};

function shellComponentOverrides(isDark: boolean): ThemeOptions["components"] {
  return {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
          borderRadius: 10,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            borderRadius: 10,
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          border: isDark
            ? "1px solid rgba(148, 163, 184, 0.08)"
            : "1px solid rgba(15, 23, 42, 0.08)",
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: ({ theme }) => ({
          backgroundImage: "none",
          backgroundColor: theme.palette.background.paper,
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 12,
        }),
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: ({ theme }) => ({
          backgroundImage: "none",
          backgroundColor: theme.palette.background.paper,
          border: `1px solid ${theme.palette.divider}`,
        }),
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: ({ theme }) => ({
          backgroundImage: "none",
          backgroundColor: theme.palette.background.default,
        }),
      },
    },
    MuiPopover: {
      styleOverrides: {
        paper: ({ theme }) => ({
          backgroundImage: "none",
          backgroundColor: theme.palette.background.paper,
          border: `1px solid ${theme.palette.divider}`,
        }),
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: ({ theme }) => ({
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.text.primary,
          border: `1px solid ${theme.palette.divider}`,
          boxShadow: theme.shadows[4],
        }),
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarColor: isDark
            ? "rgba(148,163,184,0.3) transparent"
            : "rgba(15,23,42,0.2) transparent",
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: ({ theme }) => ({
          "&:hover": {
            backgroundColor:
              theme.palette.mode === "dark"
                ? "rgba(148,163,184,0.04)"
                : "rgba(15,23,42,0.03)",
          },
        }),
      },
    },
    MuiPickerPopper: {
      styleOverrides: {
        paper: ({ theme }) => ({
          backgroundImage: "none",
          backgroundColor: theme.palette.background.paper,
          border: `1px solid ${theme.palette.divider}`,
          boxShadow: theme.shadows[8],
        }),
      },
    },
    MuiPickersLayout: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.text.primary,
        }),
      },
    },
    MuiDateCalendar: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.text.primary,
        }),
      },
    },
    MuiPickerDay: {
      styleOverrides: {
        root: ({ theme }) => ({
          color: theme.palette.text.primary,
        }),
      },
    },
  };
}

export function createAppTheme(mode: ThemeMode) {
  const isDark = mode === "dark";

  return createTheme({
    palette: {
      mode,
      primary: {
        main: "#6366f1",
        light: "#818cf8",
        dark: "#4f46e5",
      },
      secondary: {
        main: "#8b5cf6",
      },
      background: isDark
        ? { default: "#080c14", paper: "#0d1117" }
        : { default: "#f1f5f9", paper: "#ffffff" },
      text: isDark
        ? { primary: "#f1f5f9", secondary: "#94a3b8" }
        : { primary: "#0f172a", secondary: "#64748b" },
      divider: isDark ? "rgba(148, 163, 184, 0.08)" : "rgba(15, 23, 42, 0.08)",
    },
    typography: sharedTypography,
    shape: { borderRadius: 12 },
    components: shellComponentOverrides(isDark),
  });
}

/** @deprecated Use createAppTheme('dark') */
export const theme = createAppTheme("dark");
