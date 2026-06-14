"use client";

import { useEffect, useRef, useState } from "react";
import { Box, Typography, IconButton, Tooltip, Chip } from "@mui/material";
import {
  motion,
  LayoutGroup,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import SearchIcon from "@mui/icons-material/Search";
import GridViewRoundedIcon from "@mui/icons-material/GridViewRounded";
import TopBar from "@/components/hub/TopBar";
import HubDateTimeWidget from "@/components/hub/HubDateTimeWidget";
import HubAmbientBackground from "@/components/hub/HubAmbientBackground";
import HubKpiStrip from "@/components/hub/HubKpiStrip";
import HubSpotlight from "@/components/hub/HubSpotlight";
import HubQuickAccess from "@/components/hub/HubQuickAccess";
import HubServiceExplorer from "@/components/hub/HubServiceExplorer";
import HubActivityPanel from "@/components/hub/HubActivityPanel";
import HubCommandPalette from "@/components/hub/HubCommandPalette";
import HubSectionReveal from "@/components/hub/HubSectionReveal";
import HubLayoutToolbar from "@/components/hub/HubLayoutToolbar";
import HubOnboardingTour from "@/components/hub/HubOnboardingTour";
import { HubOperationsProvider } from "@/context/HubOperationsProvider";
import { getActivePlatformServices } from "@/lib/services";
import { getRoleLabel } from "@/lib/roles";
import { getHubRoleAccent } from "@/lib/hub-role-accent";
import { setHubUserId } from "@/lib/hub-preferences";
import { useHubPreferences } from "@/hooks/useHubPreferences";
import { useServiceLaunch } from "@/context/ServiceLaunchProvider";
import { getServiceLaunchUrl } from "@/lib/platform-hosts";
import type { HubCategory } from "@/lib/hub-categories";
import {
  hubFadeUp,
  hubHeroWord,
  hubHeroLine,
  hubSlideInRight,
  hubStaggerContainer,
  hubStaggerFast,
} from "@/lib/hub-motion";
import { AppShellFooter } from "@/components/layout/app-shell";

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  avatar: string | null;
  lastLoginAt: Date | null;
}

function HeroGreeting({ greeting, name, accent }: { greeting: string; name: string; accent: string }) {
  const reduce = useReducedMotion();
  const words = [`${greeting},`, name];
  const gradient = `linear-gradient(135deg, ${accent} 0%, #a78bfa 50%, #06b6d4 100%)`;

  if (reduce) {
    return (
      <Typography
        sx={{
          fontWeight: 800,
          fontSize: { xs: "2rem", md: "2.75rem" },
          lineHeight: 1.1,
          letterSpacing: "-0.03em",
          mb: 1,
        }}
      >
        {greeting},{" "}
        <Box component="span" sx={{ background: gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          {name}
        </Box>
      </Typography>
    );
  }

  return (
    <Typography
      component="h1"
      sx={{
        fontWeight: 800,
        fontSize: { xs: "2rem", md: "2.75rem" },
        lineHeight: 1.1,
        letterSpacing: "-0.03em",
        mb: 1,
        perspective: 800,
      }}
    >
      {words.map((word, i) => (
        <Box
          key={word}
          component={motion.span}
          custom={i}
          variants={hubHeroWord}
          initial="hidden"
          animate="show"
          sx={{
            display: "inline-block",
            mr: i === 0 ? 1 : 0,
            ...(i === 1 && {
              background: gradient,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }),
          }}
        >
          {word}
        </Box>
      ))}
    </Typography>
  );
}

function HeroSubtitle({ lines, reduce }: { lines: string[]; reduce: boolean | null }) {
  if (reduce) {
    return (
      <Typography color="text.secondary" sx={{ maxWidth: 560, fontSize: "0.95rem" }}>
        {lines.map((line, i) => (
          <span key={line}>
            {line}
            {i < lines.length - 1 && <br />}
          </span>
        ))}
      </Typography>
    );
  }

  return (
    <Typography color="text.secondary" sx={{ maxWidth: 560, fontSize: "0.95rem" }}>
      {lines.map((line, i) => (
        <Box
          key={line}
          component={motion.span}
          custom={i}
          variants={hubHeroLine}
          initial="hidden"
          animate="show"
          sx={{ display: "block" }}
        >
          {line}
        </Box>
      ))}
    </Typography>
  );
}

function SearchShortcutButton({
  roleAccent,
  showPulse,
  onClick,
}: {
  roleAccent: string;
  showPulse: boolean;
  onClick: () => void;
}) {
  const reduce = useReducedMotion();

  return (
    <Tooltip title="Ctrl+K">
      <IconButton
        component={motion.button}
        animate={
          showPulse && !reduce
            ? {
                boxShadow: [
                  "0 0 0 0 rgba(99,102,241,0)",
                  "0 0 0 6px rgba(99,102,241,0.2)",
                  "0 0 0 0 rgba(99,102,241,0)",
                ],
              }
            : { boxShadow: "0 0 0 0 rgba(99,102,241,0)" }
        }
        transition={showPulse ? { duration: 2.2, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }}
        whileHover={reduce ? {} : { scale: 1.04, borderColor: `${roleAccent}88` }}
        whileTap={reduce ? {} : { scale: 0.97 }}
        onClick={onClick}
        sx={{
          alignSelf: { xs: "stretch", md: "flex-end" },
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2,
          px: 2,
          gap: 1,
          color: "text.secondary",
          fontSize: "0.8rem",
          "&:hover": { borderColor: `${roleAccent}66`, color: roleAccent },
        }}
      >
        <SearchIcon fontSize="small" />
        <Typography component="span" sx={{ fontSize: "0.75rem", display: { xs: "none", sm: "inline" } }}>
          Cerca ovunque
        </Typography>
        <Box
          component="span"
          sx={{
            display: { xs: "none", md: "inline" },
            px: 0.75,
            py: 0.25,
            borderRadius: 1,
            fontSize: "0.65rem",
            bgcolor: "action.hover",
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          ⌘K
        </Box>
      </IconButton>
    </Tooltip>
  );
}

function DashboardBody({
  user,
  hubServices,
}: {
  user: User;
  hubServices: ReturnType<typeof getActivePlatformServices>;
}) {
  const [category, setCategory] = useState<HubCategory>("all");
  const [commandOpen, setCommandOpen] = useState(false);
  const [explorerHighlighted, setExplorerHighlighted] = useState(false);
  const [greetingNow, setGreetingNow] = useState(() => new Date());
  const explorerRef = useRef<HTMLDivElement>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { prefs, ready, togglePin, reorderPinned, setDensity, completeTour, markPaletteUsed } =
    useHubPreferences(user.id);
  const { launchService } = useServiceLaunch();
  const reduce = useReducedMotion();
  const roleAccent = getHubRoleAccent(user.role);

  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 320], [0, reduce ? 0 : -48]);
  const heroOpacity = useTransform(scrollY, [0, 280], [1, reduce ? 1 : 0.35]);
  const heroScale = useTransform(scrollY, [0, 400], [1, reduce ? 1 : 0.97]);
  const scrollProgress = useTransform(scrollY, [0, 1200], [0, 1]);

  useEffect(() => {
    setHubUserId(user.id);
    return () => setHubUserId(null);
  }, [user.id]);

  useEffect(() => {
    const t = setInterval(() => setGreetingNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        openCommandPalette();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const hour = greetingNow.getHours();
  const greeting =
    hour < 12 ? "Buongiorno" : hour < 18 ? "Buon pomeriggio" : "Buonasera";
  const displayName = user.name?.split(" ")[0] || user.email;

  const firstService = hubServices.find((s) => s.status === "active");

  function openFirstService() {
    if (!firstService) return;
    launchService({
      slug: firstService.slug,
      name: firstService.name,
      color: firstService.color,
      gradient: firstService.gradient,
      icon: firstService.icon,
      url: getServiceLaunchUrl(firstService.slug),
    });
  }

  function openCommandPalette() {
    setCommandOpen(true);
    if (!prefs.commandPaletteUsed) markPaletteUsed();
  }

  function scrollToExplorer() {
    explorerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setExplorerHighlighted(true);
    if (highlightTimer.current) clearTimeout(highlightTimer.current);
    highlightTimer.current = setTimeout(() => setExplorerHighlighted(false), 2000);
  }

  useEffect(() => {
    return () => {
      if (highlightTimer.current) clearTimeout(highlightTimer.current);
    };
  }, []);

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", position: "relative", display: "flex", flexDirection: "column" }}>
      <TopBar user={user} onSearchClick={openCommandPalette} />

      <HubCommandPalette
        open={commandOpen}
        onClose={() => setCommandOpen(false)}
        services={hubServices}
        onOpen={() => {
          if (!prefs.commandPaletteUsed) markPaletteUsed();
        }}
      />

      <HubOnboardingTour
        open={ready && !prefs.tourCompleted}
        onComplete={completeTour}
        onOpenFirstService={openFirstService}
        onScrollToExplorer={scrollToExplorer}
      />

      <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <Box
        sx={{
          position: "relative",
          overflow: "hidden",
          px: { xs: 2, md: 4 },
          pt: { xs: 1.5, md: 2 },
          pb: { xs: 3, md: 4 },
        }}
      >
        <HubAmbientBackground role={user.role} />

        <Box
          component={motion.div}
          style={reduce ? undefined : { y: heroY, opacity: heroOpacity, scale: heroScale }}
          sx={{ maxWidth: 1400, mx: "auto", position: "relative" }}
        >
          <motion.div variants={hubStaggerContainer} initial="hidden" animate="show">
            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", md: "row" },
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 2,
                mb: 1,
              }}
            >
              <Box component={motion.div} variants={hubFadeUp}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
                  <GridViewRoundedIcon sx={{ color: roleAccent.primary, fontSize: 18 }} />
                  <Typography
                    variant="overline"
                    sx={{ color: roleAccent.primary, letterSpacing: "0.14em", fontSize: "0.68rem" }}
                  >
                    AG Servizi · Command Center
                  </Typography>
                  <Chip
                    label={getRoleLabel(user.role)}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: "0.65rem",
                      fontWeight: 600,
                      background: `${roleAccent.primary}22`,
                      color: roleAccent.primary,
                      border: `1px solid ${roleAccent.primary}33`,
                    }}
                  />
                </Box>

                <HeroGreeting greeting={greeting} name={displayName} accent={roleAccent.primary} />

                <HeroSubtitle
                  lines={[
                    "Il tuo hub operativo unificato.",
                    "Monitora, lancia e coordina tutti i servizi AG Servizi da un unico punto.",
                  ]}
                  reduce={reduce}
                />
              </Box>

              <Box
                component={motion.div}
                variants={hubSlideInRight}
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: { xs: "stretch", md: "flex-end" },
                  gap: 1.25,
                  width: { xs: "100%", md: "auto" },
                }}
              >
                <HubDateTimeWidget />
                <SearchShortcutButton
                  roleAccent={roleAccent.primary}
                  showPulse={ready && !prefs.commandPaletteUsed}
                  onClick={openCommandPalette}
                />
              </Box>
            </Box>

            <motion.div variants={hubFadeUp}>
              <HubKpiStrip />
            </motion.div>
          </motion.div>
        </Box>
      </Box>

      <Box
        component={motion.div}
        variants={hubStaggerFast}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        sx={{ px: { xs: 2, md: 4 }, pb: 8, maxWidth: 1400, mx: "auto" }}
      >
        <LayoutGroup id="hub-workspace">
          <HubLayoutToolbar density={prefs.layoutDensity} onDensityChange={setDensity} />

          <motion.div layout variants={hubFadeUp}>
            <HubQuickAccess
              services={hubServices}
              pinned={prefs.pinned}
              recent={prefs.recent}
              density={prefs.layoutDensity}
              onTogglePin={togglePin}
              onReorderPinned={reorderPinned}
              onExplore={scrollToExplorer}
            />
          </motion.div>

          <HubSectionReveal variant="fadeUpSoft">
            <HubSpotlight
              role={user.role}
              recent={prefs.recent}
              services={hubServices}
              density={prefs.layoutDensity}
            />
          </HubSectionReveal>

          <Box
            ref={explorerRef}
            component={motion.div}
            layout
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", lg: "1fr 320px" },
              gap: 3,
              alignItems: "start",
            }}
          >
            <HubSectionReveal variant="fadeUp">
              <HubServiceExplorer
                services={hubServices}
                category={category}
                onCategoryChange={setCategory}
                pinnedSlugs={prefs.pinned}
                onTogglePin={togglePin}
                density={prefs.layoutDensity}
                highlighted={explorerHighlighted}
              />
            </HubSectionReveal>

            <Box sx={{ display: { xs: "none", lg: "block" } }}>
              <HubActivityPanel />
            </Box>
          </Box>
        </LayoutGroup>

        <Box sx={{ display: { xs: "block", lg: "none" }, mt: 3 }}>
          <HubActivityPanel />
        </Box>
      </Box>
      </Box>

      {!reduce && (
        <Box
          component={motion.div}
          style={{ scaleX: scrollProgress, transformOrigin: "0% 50%" }}
          sx={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            height: 2,
            bgcolor: roleAccent.primary,
            zIndex: 1100,
            opacity: 0.85,
            pointerEvents: "none",
          }}
        />
      )}

      <AppShellFooter />
    </Box>
  );
}

export default function DashboardClient({ user }: { user: User }) {
  const hubServices = getActivePlatformServices(user.role).filter((s) => s.slug !== "portale");
  const activeCount = hubServices.filter((s) => s.status === "active").length;

  return (
    <HubOperationsProvider activeServicesCount={activeCount}>
      <DashboardBody user={user} hubServices={hubServices} />
    </HubOperationsProvider>
  );
}
