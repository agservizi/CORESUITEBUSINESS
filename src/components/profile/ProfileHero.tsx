"use client";

import { Box, Typography, Chip, Avatar, Button, alpha } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import { motion, useReducedMotion } from "framer-motion";
import { hubFadeUp } from "@/lib/hub-motion";
import ThemeModeToggle from "@/components/layout/ThemeModeToggle";
import SecurityScoreRing from "./SecurityScoreRing";
import SecurityChecklistPanel from "./SecurityChecklistPanel";
import { getSecurityInsight } from "./security-checklist";
import {
  type ProfileUser,
  type ProfileTab,
  getProfileTheme,
  getInitials,
  profileDisplayName,
  profileRoleLabel,
  formatMemberSince,
} from "./profile-utils";
import type { SecurityCheckItem } from "./security-checklist";

interface Props {
  user: ProfileUser;
  onBack: () => void;
  onSecurityAction?: (action: SecurityCheckItem["action"], tab: ProfileTab) => void;
}

export default function ProfileHero({ user, onBack, onSecurityAction }: Props) {
  const reduce = useReducedMotion();
  const theme = getProfileTheme(user.role);
  const security = getSecurityInsight(user);
  const displayName = profileDisplayName(user);

  return (
    <Box
      component={motion.div}
      variants={hubFadeUp}
      initial="hidden"
      animate="show"
      sx={{
        position: "relative",
        borderRadius: 3,
        overflow: "hidden",
        mb: 3,
        p: { xs: 2.5, md: 3.5 },
        background: theme.gradient,
        color: "#fff",
        boxShadow: `0 16px 48px ${alpha(theme.color, 0.35)}`,
      }}
    >
      {!reduce && (
        <>
          <Box
            component={motion.div}
            animate={{ scale: [1, 1.15, 1], opacity: [0.1, 0.22, 0.1] }}
            transition={{ duration: 8, repeat: Infinity }}
            sx={{
              position: "absolute",
              top: -80,
              right: -50,
              width: 280,
              height: 280,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(255,255,255,0.4) 0%, transparent 70%)",
              pointerEvents: "none",
            }}
          />
          <Box
            component={motion.div}
            animate={{ x: [0, 12, 0], y: [0, -8, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            sx={{
              position: "absolute",
              bottom: -40,
              left: -30,
              width: 160,
              height: 160,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)",
              pointerEvents: "none",
            }}
          />
        </>
      )}
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(circle at 20% 90%, rgba(255,255,255,0.14) 0%, transparent 50%)",
          pointerEvents: "none",
        }}
      />

      <Box sx={{ position: "relative", zIndex: 1 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={onBack}
            sx={{
              color: "#fff",
              bgcolor: "rgba(255,255,255,0.12)",
              fontWeight: 600,
              "&:hover": { bgcolor: "rgba(255,255,255,0.2)" },
            }}
          >
            Hub
          </Button>
          <Box sx={{ "& .MuiIconButton-root": { color: "#fff" } }}>
            <ThemeModeToggle />
          </Box>
        </Box>

        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", lg: "row" },
            alignItems: { xs: "flex-start", lg: "flex-start" },
            justifyContent: "space-between",
            gap: 3,
          }}
        >
          <Box sx={{ display: "flex", gap: 2.5, alignItems: "center", flex: 1 }}>
            <Avatar
              src={user.avatar ?? undefined}
              sx={{
                width: { xs: 72, md: 88 },
                height: { xs: 72, md: 88 },
                fontSize: "1.75rem",
                fontWeight: 800,
                bgcolor: "rgba(255,255,255,0.22)",
                border: "3px solid rgba(255,255,255,0.45)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
              }}
            >
              {getInitials(user.name, user.email)}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="overline" sx={{ letterSpacing: "0.14em", opacity: 0.88, fontSize: "0.62rem" }}>
                Il tuo spazio
              </Typography>
              <Typography sx={{ fontWeight: 800, fontSize: { xs: "1.5rem", md: "1.85rem" }, lineHeight: 1.15 }}>
                {displayName}
              </Typography>
              <Typography sx={{ opacity: 0.9, fontSize: "0.9rem", mt: 0.5 }}>
                {user.email}
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1.5 }}>
                <Chip
                  size="small"
                  label={profileRoleLabel(user.role)}
                  sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "#fff", fontWeight: 700 }}
                />
                <Chip
                  size="small"
                  icon={<VerifiedUserIcon sx={{ color: "#fff !important", fontSize: 16 }} />}
                  label={`Membro da ${formatMemberSince(user.createdAt)}`}
                  sx={{ bgcolor: "rgba(255,255,255,0.12)", color: "#fff", fontWeight: 600 }}
                />
                {user.mfaEnabled && (
                  <Chip
                    size="small"
                    label="MFA attivo"
                    sx={{ bgcolor: "rgba(16,185,129,0.35)", color: "#fff", fontWeight: 700 }}
                  />
                )}
              </Box>
            </Box>
          </Box>

          <Box sx={{ display: "flex", flexDirection: { xs: "row", lg: "column" }, gap: 2, alignItems: { xs: "center", lg: "flex-end" }, width: { xs: "100%", lg: "auto" } }}>
            <SecurityScoreRing score={security.score} label={security.label} color={security.color} size={104} />
            {security.score < 85 && onSecurityAction && (
              <Box sx={{ flex: 1, minWidth: { xs: 0, lg: 280 }, maxWidth: 360 }}>
                <SecurityChecklistPanel
                  compact
                  items={security.items}
                  score={security.score}
                  accent={theme.color}
                  onAction={onSecurityAction}
                />
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
