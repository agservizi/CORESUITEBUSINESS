"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { Box, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { AnimatePresence, motion } from "framer-motion";
import BusinessCenterIcon from "@mui/icons-material/BusinessCenter";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import PeopleIcon from "@mui/icons-material/People";
import LibraryBooksIcon from "@mui/icons-material/LibraryBooks";
import {
  persistServiceLaunch,
  type ServiceLaunchPayload,
} from "@/lib/service-launch";
import { getShellTokens } from "@/theme/shell-tokens";
import { recordRecentService } from "@/lib/hub-preferences";

const ICONS: Record<string, React.ElementType> = {
  BusinessCenter: BusinessCenterIcon,
  Analytics: AnalyticsIcon,
  AccountTree: AccountTreeIcon,
  AccountBalance: AccountBalanceIcon,
  People: PeopleIcon,
  LibraryBooks: LibraryBooksIcon,
};

type LaunchTarget = ServiceLaunchPayload & { url: string };

interface ServiceLaunchContextValue {
  launchService: (target: LaunchTarget) => void;
  isLaunching: boolean;
}

const ServiceLaunchContext = createContext<ServiceLaunchContextValue | null>(null);

const LAUNCH_DURATION_MS = 820;

export function ServiceLaunchProvider({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const t = getShellTokens(theme);
  const router = useRouter();
  const [launching, setLaunching] = useState<LaunchTarget | null>(null);

  const launchService = useCallback(
    (target: LaunchTarget) => {
      if (launching) return;
      setLaunching(target);
      recordRecentService(target.slug);

      window.setTimeout(() => {
        persistServiceLaunch({
          slug: target.slug,
          name: target.name,
          color: target.color,
          gradient: target.gradient,
          icon: target.icon,
        });
        router.push(target.url);
      }, LAUNCH_DURATION_MS - 120);

      window.setTimeout(() => {
        setLaunching(null);
      }, LAUNCH_DURATION_MS + 180);
    },
    [launching, router]
  );

  const value = useMemo(
    () => ({ launchService, isLaunching: Boolean(launching) }),
    [launchService, launching]
  );

  const Icon = launching ? ICONS[launching.icon] || BusinessCenterIcon : BusinessCenterIcon;

  return (
    <ServiceLaunchContext.Provider value={value}>
      {children}
      <AnimatePresence>
        {launching && (
          <Box
            component={motion.div}
            key="service-launch-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            sx={{
              position: "fixed",
              inset: 0,
              zIndex: 9999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "all",
              background: t.overlay,
              overflow: "hidden",
            }}
          >
            {/* Iris expand */}
            <Box
              component={motion.div}
              initial={{ scale: 0, opacity: 0.6 }}
              animate={{ scale: 3.5, opacity: 1 }}
              transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
              sx={{
                position: "absolute",
                width: "120vmax",
                height: "120vmax",
                borderRadius: "50%",
                background: launching.gradient,
                filter: "blur(40px)",
                opacity: 0.35,
              }}
            />

            {/* Grid */}
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                backgroundImage: `
                  linear-gradient(${t.gridLine} 1px, transparent 1px),
                  linear-gradient(90deg, ${t.gridLine} 1px, transparent 1px)
                `,
                backgroundSize: "48px 48px",
                maskImage: "radial-gradient(circle at center, black 20%, transparent 70%)",
              }}
            />

            <Box
              component={motion.div}
              initial={{ opacity: 0, y: 24, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 1.02 }}
              transition={{ duration: 0.45, delay: 0.12, ease: "easeOut" }}
              sx={{
                position: "relative",
                textAlign: "center",
                px: 3,
              }}
            >
              <Box
                component={motion.div}
                initial={{ rotate: -8, scale: 0.8 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.18 }}
                sx={{
                  width: 72,
                  height: 72,
                  mx: "auto",
                  mb: 2.5,
                  borderRadius: "18px",
                  background: launching.gradient,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: `0 16px 48px ${launching.color}55`,
                }}
              >
                <Icon sx={{ color: "#fff", fontSize: 34 }} />
              </Box>

              <Typography
                variant="overline"
                sx={{
                  color: launching.color,
                  letterSpacing: "0.14em",
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  display: "block",
                  mb: 0.75,
                }}
              >
                Apertura servizio
              </Typography>

              <Typography
                sx={{
                  fontWeight: 700,
                  fontSize: "1.35rem",
                  letterSpacing: "-0.02em",
                  mb: 2,
                }}
              >
                {launching.name}
              </Typography>

              <Box
                sx={{
                  width: 120,
                  height: 3,
                  mx: "auto",
                  borderRadius: 2,
                  background: t.progressTrack,
                  overflow: "hidden",
                }}
              >
                <Box
                  component={motion.div}
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 0.72, delay: 0.15, ease: "easeInOut" }}
                  sx={{
                    height: "100%",
                    background: launching.gradient,
                    borderRadius: 2,
                  }}
                />
              </Box>
            </Box>

            {/* Exit wipe */}
            <Box
              component={motion.div}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ duration: 0.35, delay: 0.72, ease: [0.4, 0, 0.2, 1] }}
              sx={{
                position: "absolute",
                inset: 0,
                background: t.overlay,
                transformOrigin: "top",
                pointerEvents: "none",
              }}
            />
          </Box>
        )}
      </AnimatePresence>
    </ServiceLaunchContext.Provider>
  );
}

export function useServiceLaunch() {
  const ctx = useContext(ServiceLaunchContext);
  if (!ctx) {
    throw new Error("useServiceLaunch must be used within ServiceLaunchProvider");
  }
  return ctx;
}
