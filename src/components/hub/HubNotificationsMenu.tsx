"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  Badge,
  Popover,
  MenuList,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Button,
  CircularProgress,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { motion, AnimatePresence } from "framer-motion";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import ErrorOutlinedIcon from "@mui/icons-material/ErrorOutlined";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import PaymentsIcon from "@mui/icons-material/Payments";
import ConfirmationNumberIcon from "@mui/icons-material/ConfirmationNumber";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/fetch-client";
import { getShellTokens, shellMenuPaperSx } from "@/theme/shell-tokens";
import { hubAlertItem, hubMenuDropdown } from "@/lib/hub-motion";
import { topbarIconButtonSx } from "@/components/layout/app-shell";

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  link: string | null;
  createdAt: string;
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  info: InfoOutlinedIcon,
  warning: WarningAmberIcon,
  success: CheckCircleOutlinedIcon,
  error: ErrorOutlinedIcon,
  express_sale: CheckCircleOutlinedIcon,
  express_request: WarningAmberIcon,
  finance: PaymentsIcon,
  ticket: ConfirmationNumberIcon,
  business: InfoOutlinedIcon,
};

const TYPE_COLORS: Record<string, string> = {
  info: "#6366f1",
  warning: "#f59e0b",
  success: "#10b981",
  error: "#ef4444",
  express_sale: "#10b981",
  express_request: "#f59e0b",
  finance: "#0ea5e9",
  ticket: "#6366f1",
  business: "#8b5cf6",
};

function formatRelative(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Adesso";
  if (mins < 60) return `${mins} min fa`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h fa`;
  const days = Math.floor(hours / 24);
  return `${days}g fa`;
}

export default function HubNotificationsMenu() {
  const router = useRouter();
  const theme = useTheme();
  const t = getShellTokens(theme);
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [badgeBump, setBadgeBump] = useState(false);
  const prevUnread = useRef(0);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications", { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json();
      const nextUnread = data.unreadCount ?? 0;
      setItems(data.notifications ?? []);
      setUnreadCount((prev) => {
        if (nextUnread > prev) {
          setBadgeBump(true);
          window.setTimeout(() => setBadgeBump(false), 600);
        }
        return nextUnread;
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    prevUnread.current = unreadCount;
  }, [unreadCount]);

  async function markRead(id: string) {
    await apiFetch(`/api/notifications/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ read: true }),
    });
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
  }

  async function markAllRead() {
    await apiFetch("/api/notifications/read-all", { method: "PATCH", body: "{}" });
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }

  function handleOpen(e: React.MouseEvent<HTMLElement>) {
    setAnchor(e.currentTarget);
    fetchNotifications();
  }

  function handleSelect(n: NotificationItem) {
    if (!n.read) markRead(n.id);
    setAnchor(null);
    if (n.link) router.push(n.link);
  }

  const badgePulse = badgeBump;

  return (
    <>
      <Tooltip title="Notifiche">
        <IconButton
          size="small"
          onClick={handleOpen}
          sx={topbarIconButtonSx}
          aria-label="Notifiche"
        >
          <Badge
            badgeContent={unreadCount}
            color="error"
            max={9}
            invisible={unreadCount === 0}
            overlap="circular"
            anchorOrigin={{ vertical: "top", horizontal: "right" }}
            sx={{
              display: "inline-flex",
              overflow: "visible",
              "& .MuiBadge-badge": {
                fontSize: "0.65rem",
                minWidth: 16,
                height: 16,
                top: 4,
                right: 4,
              },
            }}
          >
            <Box
              component={motion.span}
              animate={badgePulse ? { scale: [1, 1.15, 1] } : { scale: 1 }}
              transition={{ duration: 0.45 }}
              sx={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}
            >
              <NotificationsNoneIcon fontSize="small" />
            </Box>
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        slotProps={{
          paper: {
            sx: [
              shellMenuPaperSx,
              {
                mt: 1,
                width: 360,
                maxWidth: "95vw",
                overflow: "hidden",
                backdropFilter: "blur(20px)",
                boxShadow:
                  theme.palette.mode === "dark"
                    ? "0 8px 32px rgba(0,0,0,0.4)"
                    : "0 8px 32px rgba(15,23,42,0.12)",
              },
            ],
          },
        }}
      >
        <Box
          component={motion.div}
          variants={hubMenuDropdown}
          initial="hidden"
          animate="show"
        >
        <Box sx={{ px: 2, py: 1.5, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography sx={{ fontWeight: 700, fontSize: "0.9rem" }}>Notifiche</Typography>
          {unreadCount > 0 && (
            <Button
              size="small"
              startIcon={<DoneAllIcon sx={{ fontSize: 14 }} />}
              onClick={markAllRead}
              sx={{ textTransform: "none", fontSize: "0.75rem", minWidth: 0 }}
            >
              Segna tutte
            </Button>
          )}
        </Box>
        <Divider sx={{ borderColor: t.borderColor }} />

        {loading && items.length === 0 ? (
          <Box sx={{ py: 4, display: "flex", justifyContent: "center" }}>
            <CircularProgress size={24} />
          </Box>
        ) : items.length === 0 ? (
          <Typography sx={{ py: 4, textAlign: "center", color: "text.secondary", fontSize: "0.85rem" }}>
            Nessuna notifica
          </Typography>
        ) : (
          <MenuList disablePadding sx={{ maxHeight: 360, overflowY: "auto", overflowX: "hidden" }}>
            <AnimatePresence initial={false}>
              {items.map((n, i) => {
                const Icon = TYPE_ICONS[n.type] || InfoOutlinedIcon;
                const color = TYPE_COLORS[n.type] || TYPE_COLORS.info;
                return (
                  <Box
                    key={n.id}
                    component={motion.div}
                    variants={hubAlertItem}
                    initial="hidden"
                    animate="show"
                    custom={i}
                  >
                    <MenuItem
                      onClick={() => handleSelect(n)}
                      sx={{
                        py: 1.5,
                        alignItems: "flex-start",
                        gap: 1,
                        whiteSpace: "normal",
                        width: "100%",
                        maxWidth: "100%",
                        boxSizing: "border-box",
                        background: n.read ? "transparent" : `${color}08`,
                        borderLeft: n.read ? "3px solid transparent" : `3px solid ${color}`,
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 32, mt: 0.25, flexShrink: 0 }}>
                        <Icon sx={{ fontSize: 18, color }} />
                      </ListItemIcon>
                      <ListItemText
                        sx={{ minWidth: 0, flex: 1, m: 0 }}
                        primary={n.title}
                        secondary={
                          <>
                            <Typography
                              component="span"
                              variant="caption"
                              sx={{
                                display: "block",
                                lineHeight: 1.4,
                                whiteSpace: "normal",
                                wordBreak: "break-word",
                                overflowWrap: "anywhere",
                              }}
                            >
                              {n.body}
                            </Typography>
                            <Typography component="span" variant="caption" color="text.secondary">
                              {formatRelative(n.createdAt)}
                            </Typography>
                          </>
                        }
                        slotProps={{
                          primary: {
                            sx: {
                              fontWeight: n.read ? 500 : 700,
                              fontSize: "0.825rem",
                              lineHeight: 1.3,
                              whiteSpace: "normal",
                              wordBreak: "break-word",
                              overflowWrap: "anywhere",
                            },
                          },
                          secondary: { sx: { mt: 0.25 } },
                        }}
                      />
                    </MenuItem>
                  </Box>
                );
              })}
            </AnimatePresence>
          </MenuList>
        )}
        </Box>
      </Popover>
    </>
  );
}
