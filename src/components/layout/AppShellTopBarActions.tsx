"use client";

import { Box, Typography, Avatar } from "@mui/material";
import { getRoleLabel } from "@/lib/roles";
import ThemeModeToggle from "@/components/layout/ThemeModeToggle";

export interface AppShellTopBarUser {
  name?: string | null;
  email: string;
  role: string;
  avatar?: string | null;
}

export function getAppShellUserInitials(name?: string | null, email?: string) {
  if (name) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  return email?.[0]?.toUpperCase() || "U";
}

const DEFAULT_AVATAR_GRADIENT = "linear-gradient(135deg, #6366f1, #8b5cf6)";

/** Contenitore azioni destra topbar (tema, notifiche, utente). */
export const topbarActionsSx = {
  display: "flex",
  alignItems: "center",
  gap: 1.5,
  ml: "auto",
  flexShrink: 0,
} as const;

/** Nome + ruolo utente in topbar. */
export const topbarUserBlockSx = {
  textAlign: "right",
  display: { xs: "none", sm: "block" },
} as const;

/** Avatar utente in topbar. */
export function topbarAvatarSx(gradient: string) {
  return {
    width: 32,
    height: 32,
    fontSize: "0.75rem",
    fontWeight: 600,
    background: gradient,
  } as const;
}

interface Props {
  user: AppShellTopBarUser;
  /** Gradiente avatar — es. colore servizio Express */
  avatarGradient?: string;
  /** Elementi tra toggle tema e blocco utente (es. notifiche) */
  children?: React.ReactNode;
}

/** Sezione destra topbar condivisa: tema + testo utente + avatar. */
export default function AppShellTopBarActions({
  user,
  avatarGradient = DEFAULT_AVATAR_GRADIENT,
  children,
}: Props) {
  const initials = getAppShellUserInitials(user.name, user.email);

  return (
    <Box sx={topbarActionsSx}>
      <ThemeModeToggle />
      {children}
      <Box sx={topbarUserBlockSx}>
        <Typography sx={{ fontWeight: 600, fontSize: "0.825rem", lineHeight: 1.2 }}>
          {user.name || user.email}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.2 }}>
          {getRoleLabel(user.role)}
        </Typography>
      </Box>
      <Avatar
        src={user.avatar || undefined}
        sx={topbarAvatarSx(avatarGradient)}
      >
        {initials}
      </Avatar>
    </Box>
  );
}
