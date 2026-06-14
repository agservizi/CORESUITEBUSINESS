"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  TextField,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  InputAdornment,
  Typography,
  Box,
  Chip,
  Divider,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import PeopleIcon from "@mui/icons-material/People";
import ConfirmationNumberIcon from "@mui/icons-material/ConfirmationNumber";
import PaymentsIcon from "@mui/icons-material/Payments";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import BoltIcon from "@mui/icons-material/Bolt";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { getServiceIcon } from "@/lib/service-icons";
import { useServiceLaunch } from "@/context/ServiceLaunchProvider";
import type { PlatformServiceConfig } from "@/config/platform-services";
import { getServiceLaunchUrl, resolveNavigationTarget } from "@/lib/platform-hosts";
import { getShellTokens, shellDialogPaperSx } from "@/theme/shell-tokens";
import { useAiAssistantOptional } from "@/context/AiAssistantProvider";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import {
  hubPaletteItem,
  hubPaletteOverlay,
  hubPalettePanel,
  hubSpring,
} from "@/lib/hub-motion";

interface HubCommandPaletteProps {
  open: boolean;
  onClose: () => void;
  services: PlatformServiceConfig[];
  onOpen?: () => void;
}

type PaletteItem = {
  id: string;
  section: string;
  label: string;
  subtitle?: string;
  icon: ReactNode;
  shortcut?: string;
  onSelect: () => void;
};

interface SearchResults {
  clients: { id: string; name: string; companyName: string | null; email: string | null }[];
  leads: { id: string; title: string; status: string }[];
  tickets: { id: string; subject: string; code: string; status: string }[];
  sales: { id: string; receiptNumber: number | null; total: unknown; client: { name: string } | null }[];
  actions: { id: string; label: string; href: string; shortcut?: string }[];
}

const QUICK_ACTIONS: PaletteItem[] = [
  {
    id: "qa-sale",
    section: "Azioni rapide",
    label: "Nuova vendita Express",
    subtitle: "Apri POS",
    icon: <PaymentsIcon sx={{ color: "#6366f1" }} />,
    shortcut: "V",
    onSelect: () => {},
  },
  {
    id: "qa-ticket",
    section: "Azioni rapide",
    label: "Nuovo ticket",
    subtitle: "Assistenza clienti",
    icon: <ConfirmationNumberIcon sx={{ color: "#0ea5e9" }} />,
    shortcut: "T",
    onSelect: () => {},
  },
  {
    id: "qa-lead",
    section: "Azioni rapide",
    label: "Nuovo lead Business",
    subtitle: "CRM pipeline",
    icon: <TrendingUpIcon sx={{ color: "#8b5cf6" }} />,
    shortcut: "L",
    onSelect: () => {},
  },
];

export default function HubCommandPalette({ open, onClose, services, onOpen }: HubCommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [remote, setRemote] = useState<SearchResults | null>(null);
  const [loadingRemote, setLoadingRemote] = useState(false);
  const [mounted, setMounted] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);
  const router = useRouter();
  const { launchService } = useServiceLaunch();
  const ai = useAiAssistantOptional();

  const aiMode = query.trim().toLowerCase().startsWith("ai:") || query.trim().toLowerCase().startsWith("ai ");

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (open) onOpen?.();
  }, [open, onOpen]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setActiveIndex(0);
      setRemote(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2 || aiMode) {
      setRemote(null);
      return;
    }

    const timer = setTimeout(async () => {
      setLoadingRemote(true);
      try {
        const res = await fetch(`/api/hub/search?q=${encodeURIComponent(q)}`, { credentials: "include" });
        if (res.ok) setRemote(await res.json());
      } catch {
        setRemote(null);
      } finally {
        setLoadingRemote(false);
      }
    }, 220);

    return () => clearTimeout(timer);
  }, [query, aiMode]);

  const navigate = useCallback(
    (href: string) => {
      onClose();
      const dest = resolveNavigationTarget(href);
      if (dest.startsWith("http")) window.location.href = dest;
      else router.push(dest);
    },
    [onClose, router]
  );

  const filteredServices = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || aiMode) return services.slice(0, 8);
    return services.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.slug.includes(q)
    );
  }, [query, services, aiMode]);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list: PaletteItem[] = [];

    if (!q) {
      QUICK_ACTIONS.forEach((a) => {
        list.push({
          ...a,
          onSelect: () => {
            if (a.id === "qa-sale") navigate("/services/express?view=pos");
            if (a.id === "qa-ticket") navigate("/services/tickets");
            if (a.id === "qa-lead") navigate("/business");
          },
        });
      });
    } else if (remote?.actions.length) {
      remote.actions.forEach((a) => {
        list.push({
          id: a.id,
          section: "Azioni rapide",
          label: a.label,
          icon: <BoltIcon sx={{ color: "#6366f1" }} />,
          shortcut: a.shortcut,
          onSelect: () => navigate(a.href),
        });
      });
    }

    filteredServices.forEach((s) => {
      const Icon = getServiceIcon(s.icon);
      list.push({
        id: `svc-${s.slug}`,
        section: "Servizi",
        label: s.name,
        subtitle: s.description,
        icon: (
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: "8px",
              background: s.gradient,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon sx={{ fontSize: 16, color: "#fff" }} />
          </Box>
        ),
        onSelect: () => {
          onClose();
          launchService({
            slug: s.slug,
            name: s.name,
            color: s.color,
            gradient: s.gradient,
            icon: s.icon,
            url: getServiceLaunchUrl(s.slug),
          });
        },
      });
    });

    remote?.clients.forEach((c) => {
      list.push({
        id: `cli-${c.id}`,
        section: "Clienti",
        label: c.companyName || c.name,
        subtitle: c.email ?? undefined,
        icon: <PeopleIcon sx={{ color: "#8b5cf6" }} />,
        onSelect: () => navigate(`/business?client=${c.id}`),
      });
    });

    remote?.tickets.forEach((t) => {
      list.push({
        id: `tkt-${t.id}`,
        section: "Ticket",
        label: t.subject,
        subtitle: t.code,
        icon: <ConfirmationNumberIcon sx={{ color: "#0ea5e9" }} />,
        onSelect: () => navigate(`/services/tickets?id=${t.id}`),
      });
    });

    remote?.sales.forEach((s) => {
      list.push({
        id: `sale-${s.id}`,
        section: "Vendite Express",
        label: s.client?.name ?? `Vendita #${s.receiptNumber ?? s.id.slice(-6)}`,
        subtitle: `€${Number(s.total).toFixed(2)}`,
        icon: <PaymentsIcon sx={{ color: "#6366f1" }} />,
        onSelect: () => navigate(`/services/express?view=sales&id=${s.id}`),
      });
    });

    remote?.leads.forEach((l) => {
      list.push({
        id: `lead-${l.id}`,
        section: "Lead Business",
        label: l.title,
        subtitle: l.status,
        icon: <TrendingUpIcon sx={{ color: "#10b981" }} />,
        onSelect: () => navigate(`/business?lead=${l.id}`),
      });
    });

    return list;
  }, [query, filteredServices, remote, launchService, navigate, onClose]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, items.length]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, items.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && items[activeIndex]) {
        e.preventDefault();
        items[activeIndex].onSelect();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, items, activeIndex]);

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  if (!mounted) return null;

  let lastSection = "";
  let itemIndex = 0;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <Box
            component={motion.div}
            key="palette-backdrop"
            variants={hubPaletteOverlay}
            initial="hidden"
            animate="show"
            exit="exit"
            onClick={onClose}
            sx={{
              position: "fixed",
              inset: 0,
              zIndex: 1400,
              bgcolor: "rgba(0,0,0,0.55)",
              backdropFilter: "blur(4px)",
            }}
          />
          <Box
            sx={{
              position: "fixed",
              inset: 0,
              zIndex: 1401,
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "center",
              pt: { xs: "12vh", md: "15vh" },
              px: 2,
              pointerEvents: "none",
            }}
          >
            <Box
              component={motion.div}
              key="palette-panel"
              variants={hubPalettePanel}
              initial="hidden"
              animate="show"
              exit="exit"
              sx={(theme) => ({
                ...shellDialogPaperSx(theme),
                pointerEvents: "auto",
                width: "100%",
                maxWidth: 520,
                overflow: "hidden",
                backdropFilter: "blur(24px)",
                boxShadow: "0 24px 80px rgba(0,0,0,0.55)",
                borderRadius: 3,
              })}
            >
              <Box sx={(theme) => ({ p: 2, borderBottom: getShellTokens(theme).border })}>
                <TextField
                  autoFocus
                  fullWidth
                  placeholder="Cerca servizi, clienti, ticket, vendite… (ai: assistente)"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon sx={{ color: "text.secondary", fontSize: 20 }} />
                        </InputAdornment>
                      ),
                    },
                  }}
                  sx={(theme) => ({
                    "& .MuiOutlinedInput-root": {
                      background: getShellTokens(theme).hover,
                      borderRadius: 2,
                    },
                  })}
                />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                  ↑↓ naviga · Invio seleziona · Ctrl+K · Esc chiude
                  {loadingRemote ? " · Ricerca…" : ""}
                </Typography>
              </Box>

              {aiMode && ai && (
                <ListItemButton
                  onClick={() => {
                    onClose();
                    ai.openAssistant({
                      scope: "hub",
                      title: "Coresuite Hub",
                      initialAction: "chat",
                      initialMessage: query.replace(/^ai:?\s*/i, "").trim(),
                    });
                  }}
                  sx={{ mx: 1, borderRadius: 2, mb: 1, mt: 1, bgcolor: "action.hover" }}
                >
                  <ListItemIcon>
                    <AutoAwesomeIcon sx={{ color: "#6366f1" }} />
                  </ListItemIcon>
                  <ListItemText
                    primary="Chiedi all'assistente AI"
                    secondary={query.replace(/^ai:?\s*/i, "").trim() || "Apri copilot"}
                  />
                </ListItemButton>
              )}

              <List ref={listRef} sx={{ maxHeight: 420, overflow: "auto", py: 1 }}>
                {items.length === 0 ? (
                  <Typography sx={{ py: 4, textAlign: "center", color: "text.secondary" }}>
                    Nessun risultato
                  </Typography>
                ) : (
                  items.map((item, i) => {
                    const showHeader = item.section !== lastSection;
                    lastSection = item.section;
                    const staggerIndex = itemIndex++;
                    return (
                      <Box key={item.id}>
                        {showHeader && (
                          <>
                            {i > 0 && <Divider sx={{ my: 0.5, mx: 2 }} />}
                            <Typography
                              variant="overline"
                              sx={{
                                px: 2.5,
                                py: 0.75,
                                display: "block",
                                color: "text.secondary",
                                fontSize: "0.65rem",
                              }}
                            >
                              {item.section}
                            </Typography>
                          </>
                        )}
                        <Box
                          component={motion.div}
                          variants={hubPaletteItem}
                          initial="hidden"
                          animate="show"
                          custom={staggerIndex}
                        >
                          <ListItemButton
                            data-index={i}
                            onClick={item.onSelect}
                            sx={{
                              mx: 1,
                              borderRadius: 2,
                              mb: 0.25,
                              position: "relative",
                              overflow: "hidden",
                            }}
                          >
                            {i === activeIndex && (
                              <Box
                                component={motion.div}
                                layoutId="hub-palette-active"
                                transition={hubSpring}
                                sx={{
                                  position: "absolute",
                                  inset: 0,
                                  borderRadius: 2,
                                  bgcolor: "action.selected",
                                  border: "1px solid",
                                  borderColor: "rgba(99,102,241,0.25)",
                                }}
                              />
                            )}
                            <ListItemIcon sx={{ minWidth: 40, position: "relative", zIndex: 1 }}>
                              {item.icon}
                            </ListItemIcon>
                            <ListItemText
                              primary={item.label}
                              secondary={item.subtitle}
                              slotProps={{
                                primary: { sx: { fontWeight: 600, fontSize: "0.875rem" } },
                                secondary: { sx: { fontSize: "0.75rem" } },
                              }}
                              sx={{ position: "relative", zIndex: 1 }}
                            />
                            {item.shortcut && (
                              <Chip
                                label={item.shortcut}
                                size="small"
                                sx={{ height: 20, fontSize: "0.65rem", position: "relative", zIndex: 1 }}
                              />
                            )}
                          </ListItemButton>
                        </Box>
                      </Box>
                    );
                  })
                )}
              </List>
            </Box>
          </Box>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
