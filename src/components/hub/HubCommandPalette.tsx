"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  TextField,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  InputAdornment,
  Typography,
  Box,
  Chip,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { getServiceIcon } from "@/lib/service-icons";
import { useServiceLaunch } from "@/context/ServiceLaunchProvider";
import type { PlatformServiceConfig } from "@/config/platform-services";
import { getServiceLaunchUrl } from "@/lib/platform-hosts";
import { getShellTokens, shellDialogPaperSx } from "@/theme/shell-tokens";
import { useAiAssistantOptional } from "@/context/AiAssistantProvider";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";

interface HubCommandPaletteProps {
  open: boolean;
  onClose: () => void;
  services: PlatformServiceConfig[];
}

export default function HubCommandPalette({ open, onClose, services }: HubCommandPaletteProps) {
  const [query, setQuery] = useState("");
  const { launchService } = useServiceLaunch();
  const ai = useAiAssistantOptional();

  const aiMode = query.trim().toLowerCase().startsWith("ai:") || query.trim().toLowerCase().startsWith("ai ");

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return services.slice(0, 12);
    return services.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.slug.includes(q)
    );
  }, [query, services]);

  function select(service: PlatformServiceConfig) {
    onClose();
    launchService({
      slug: service.slug,
      name: service.name,
      color: service.color,
      gradient: service.gradient,
      icon: service.icon,
      url: getServiceLaunchUrl(service.slug),
    });
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: [
            shellDialogPaperSx,
            {
              backdropFilter: "blur(24px)",
              boxShadow: "0 24px 80px rgba(0,0,0,0.55)",
            },
          ],
        },
      }}
    >
      <DialogContent sx={{ p: 0 }}>
        <Box sx={(theme) => ({ p: 2, borderBottom: getShellTokens(theme).border })}>
          <TextField
            autoFocus
            fullWidth
            placeholder="Cerca un servizio… (ai: per assistente)"
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
            Digita per filtrare · <strong>ai:</strong> assistente · Esc per chiudere
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
            sx={{ mx: 1, borderRadius: 2, mb: 1, bgcolor: "action.hover" }}
          >
            <ListItemIcon><AutoAwesomeIcon sx={{ color: "#6366f1" }} /></ListItemIcon>
            <ListItemText
              primary="Chiedi all'assistente AI"
              secondary={query.replace(/^ai:?\s*/i, "").trim() || "Apri copilot"}
            />
          </ListItemButton>
        )}
        <List sx={{ maxHeight: 360, overflow: "auto", py: 1 }}>
          {filtered.length === 0 ? (
            <Typography sx={{ py: 4, textAlign: "center", color: "text.secondary" }}>
              Nessun servizio trovato
            </Typography>
          ) : (
            filtered.map((s) => {
              const Icon = getServiceIcon(s.icon);
              return (
              <ListItemButton key={s.slug} onClick={() => select(s)} sx={{ mx: 1, borderRadius: 2 }}>
                <ListItemIcon sx={{ minWidth: 40 }}>
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
                </ListItemIcon>
                <ListItemText
                  primary={s.name}
                  secondary={s.description}
                  slotProps={{
                    primary: { sx: { fontWeight: 600, fontSize: "0.875rem" } },
                    secondary: { sx: { fontSize: "0.75rem", overflow: "hidden", textOverflow: "ellipsis" } },
                  }}
                />
                {s.badge && <Chip label={s.badge} size="small" sx={{ height: 20, fontSize: "0.65rem" }} />}
              </ListItemButton>
              );
            })
          )}
        </List>
      </DialogContent>
    </Dialog>
  );
}
