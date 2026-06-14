"use client";

import { useEffect, useState } from "react";
import { Box, Typography, IconButton, Tooltip, Chip } from "@mui/material";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import SearchIcon from "@mui/icons-material/Search";
import GridViewRoundedIcon from "@mui/icons-material/GridViewRounded";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import TopBar from "@/components/hub/TopBar";
import HubAmbientBackground from "@/components/hub/HubAmbientBackground";
import HubKpiStrip from "@/components/hub/HubKpiStrip";
import HubSpotlight from "@/components/hub/HubSpotlight";
import HubQuickAccess from "@/components/hub/HubQuickAccess";
import HubServiceExplorer from "@/components/hub/HubServiceExplorer";
import HubActivityPanel from "@/components/hub/HubActivityPanel";
import HubCommandPalette from "@/components/hub/HubCommandPalette";
import HubSectionReveal from "@/components/hub/HubSectionReveal";
import { getActivePlatformServices } from "@/lib/services";
import { getRoleLabel } from "@/lib/roles";
import { setHubUserId } from "@/lib/hub-preferences";
import { useHubPreferences } from "@/hooks/useHubPreferences";
import type { HubCategory } from "@/lib/hub-categories";
import {
  hubFadeUp,
  hubHeroWord,
  hubSlideInRight,
  hubStaggerContainer,
  hubStaggerFast,
} from "@/lib/hub-motion";

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  avatar: string | null;
  lastLoginAt: Date | null;
}

function HeroGreeting({ greeting, name }: { greeting: string; name: string }) {
  const reduce = useReducedMotion();
  const words = [`${greeting},`, name];

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
        <Box
          component="span"
          sx={{
            background: "linear-gradient(135deg, #6366f1 0%, #a78bfa 50%, #06b6d4 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
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
              background: "linear-gradient(135deg, #6366f1 0%, #a78bfa 50%, #06b6d4 100%)",
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

function LiveClock({ now }: { now: Date }) {
  const reduce = useReducedMotion();
  const time = now.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
      <motion.div
        animate={reduce ? {} : { scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <AccessTimeIcon sx={{ fontSize: 14, color: "primary.light" }} />
      </motion.div>
      <Typography variant="caption" sx={{ fontWeight: 600, color: "primary.light", fontVariantNumeric: "tabular-nums" }}>
        {time}
      </Typography>
    </Box>
  );
}

export default function DashboardClient({ user }: { user: User }) {
  const [category, setCategory] = useState<HubCategory>("all");
  const [commandOpen, setCommandOpen] = useState(false);
  const [now, setNow] = useState(new Date());
  const { prefs, togglePin } = useHubPreferences(user.id);
  const reduce = useReducedMotion();

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
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const hour = now.getHours();
  const greeting =
    hour < 12 ? "Buongiorno" : hour < 18 ? "Buon pomeriggio" : "Buonasera";
  const displayName = user.name?.split(" ")[0] || user.email;

  const hubServices = getActivePlatformServices(user.role).filter(
    (s) => s.slug !== "portale"
  );

  const dateLabel = now.toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", position: "relative" }}>
      <TopBar user={user} onSearchClick={() => setCommandOpen(true)} />

      <HubCommandPalette
        open={commandOpen}
        onClose={() => setCommandOpen(false)}
        services={hubServices}
      />

      {/* Hero */}
      <Box
        sx={{
          position: "relative",
          overflow: "hidden",
          px: { xs: 2, md: 4 },
          pt: { xs: 4, md: 6 },
          pb: { xs: 3, md: 4 },
        }}
      >
        <HubAmbientBackground />

        <Box
          component={motion.div}
          style={reduce ? undefined : { y: heroY, opacity: heroOpacity, scale: heroScale }}
          sx={{ maxWidth: 1400, mx: "auto", position: "relative" }}
        >
          <motion.div
            variants={hubStaggerContainer}
            initial="hidden"
            animate="show"
          >
            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", md: "row" },
                justifyContent: "space-between",
                alignItems: { xs: "flex-start", md: "flex-end" },
                gap: 2,
                mb: 1,
              }}
            >
              <Box component={motion.div} variants={hubFadeUp}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
                  <motion.div
                    animate={reduce ? {} : { rotate: [0, 8, -8, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <GridViewRoundedIcon sx={{ color: "primary.main", fontSize: 18 }} />
                  </motion.div>
                  <Typography
                    variant="overline"
                    sx={{ color: "primary.main", letterSpacing: "0.14em", fontSize: "0.68rem" }}
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
                      background: "rgba(99,102,241,0.12)",
                      color: "primary.light",
                      border: "1px solid rgba(99,102,241,0.2)",
                    }}
                  />
                </Box>

                <HeroGreeting greeting={greeting} name={displayName} />

                <Typography color="text.secondary" sx={{ maxWidth: 560, fontSize: "0.95rem" }}>
                  Il tuo hub operativo unificato. Monitora, lancia e coordina tutti i servizi AG Servizi da un unico punto.
                </Typography>
              </Box>

              <Box
                component={motion.div}
                variants={hubSlideInRight}
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: { xs: "flex-start", md: "flex-end" },
                  gap: 1,
                }}
              >
                <LiveClock now={now} />
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                  <CalendarTodayIcon sx={{ fontSize: 14, color: "text.secondary" }} />
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: "capitalize" }}>
                    {dateLabel}
                  </Typography>
                </Box>
                {user.lastLoginAt && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                    <AccessTimeIcon sx={{ fontSize: 14, color: "text.secondary" }} />
                    <Typography variant="caption" color="text.secondary">
                      Ultimo accesso{" "}
                      {new Date(user.lastLoginAt).toLocaleString("it-IT", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Typography>
                  </Box>
                )}
                <Tooltip title="Ctrl+K">
                  <IconButton
                    component={motion.button}
                    whileHover={reduce ? {} : { scale: 1.04, borderColor: "rgba(99,102,241,0.5)" }}
                    whileTap={reduce ? {} : { scale: 0.97 }}
                    onClick={() => setCommandOpen(true)}
                    sx={{
                      mt: 0.5,
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 2,
                      px: 2,
                      gap: 1,
                      color: "text.secondary",
                      fontSize: "0.8rem",
                      "&:hover": { borderColor: "rgba(99,102,241,0.4)", color: "primary.light" },
                    }}
                  >
                    <SearchIcon fontSize="small" />
                    <Typography component="span" sx={{ fontSize: "0.75rem", display: { xs: "none", sm: "inline" } }}>
                      Cerca servizio
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
              </Box>
            </Box>

            <motion.div variants={hubFadeUp}>
              <HubKpiStrip />
            </motion.div>
          </motion.div>
        </Box>
      </Box>

      {/* Body sections */}
      <Box
        component={motion.div}
        variants={hubStaggerFast}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        sx={{ px: { xs: 2, md: 4 }, pb: 8, maxWidth: 1400, mx: "auto" }}
      >
        <motion.div variants={hubFadeUp}>
          <HubQuickAccess
            services={hubServices}
            pinned={prefs.pinned}
            recent={prefs.recent}
            onTogglePin={togglePin}
          />
        </motion.div>

        <HubSectionReveal variant="fadeUpSoft">
          <HubSpotlight />
        </HubSectionReveal>

        <Box
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
            />
          </HubSectionReveal>

          <Box sx={{ display: { xs: "none", lg: "block" } }}>
            <HubActivityPanel />
          </Box>
        </Box>

        <Box sx={{ display: { xs: "block", lg: "none" }, mt: 3 }}>
          <HubActivityPanel />
        </Box>
      </Box>

      {/* Scroll progress bar */}
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
            bgcolor: "primary.main",
            zIndex: 1100,
            opacity: 0.85,
            pointerEvents: "none",
          }}
        />
      )}
    </Box>
  );
}
