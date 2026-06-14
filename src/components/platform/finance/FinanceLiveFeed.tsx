"use client";

import { Box, Typography, Paper, Stack, Chip, alpha } from "@mui/material";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";
import { motion, AnimatePresence } from "framer-motion";
import { shellPanelSx } from "@/theme/shell-tokens";
import { money, typeColor } from "./finance-utils";

interface Event {
  id: string;
  type: string;
  description: string;
  amount: number;
  method: string;
  createdAt: string;
  expressSaleId?: string | null;
}

interface Props {
  events: Event[];
  serviceColor: string;
}

export default function FinanceLiveFeed({ events, serviceColor }: Props) {
  return (
    <Paper
      sx={[
        shellPanelSx,
        {
          p: 0,
          height: "100%",
          overflow: "hidden",
          border: `1px solid ${alpha(serviceColor, 0.15)}`,
        },
      ]}
    >
      <Box
        sx={{
          px: 2,
          py: 1.75,
          borderBottom: 1,
          borderColor: "divider",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: `linear-gradient(90deg, ${alpha(serviceColor, 0.06)} 0%, transparent 100%)`,
        }}
      >
        <Typography sx={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 1 }}>
          <Box
            component={motion.span}
            animate={{ opacity: [1, 0.35, 1], scale: [1, 1.2, 1] }}
            transition={{ duration: 1.8, repeat: Infinity }}
            sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: serviceColor, display: "inline-block" }}
          />
          Live movimenti
        </Typography>
        <Chip label={`${events.length} recenti`} size="small" sx={{ height: 22, fontSize: "0.65rem", fontWeight: 600 }} />
      </Box>

      <Box sx={{ p: 2 }}>
        {events.length === 0 ? (
          <Box sx={{ py: 4, textAlign: "center" }}>
            <Typography variant="caption" color="text.secondary">Nessun movimento recente</Typography>
          </Box>
        ) : (
          <Stack spacing={1.25} sx={{ maxHeight: 320, overflow: "auto", pr: 0.5 }}>
            <AnimatePresence initial={false}>
              {events.map((ev, i) => {
                const c = typeColor(ev.type);
                return (
                  <Box
                    key={ev.id}
                    component={motion.div}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    whileHover={{ x: 4, transition: { duration: 0.15 } }}
                    sx={{
                      p: 1.5,
                      borderRadius: 2.5,
                      border: "1px solid",
                      borderColor: alpha(c, 0.2),
                      bgcolor: alpha(c, 0.04),
                      display: "flex",
                      gap: 1.25,
                      alignItems: "flex-start",
                      cursor: "default",
                    }}
                  >
                    <Box
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: 2,
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        bgcolor: alpha(c, 0.15),
                      }}
                    >
                      {ev.type === "ENTRATA" ? (
                        <TrendingUpIcon sx={{ fontSize: 18, color: c }} />
                      ) : (
                        <TrendingDownIcon sx={{ fontSize: 18, color: c }} />
                      )}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontSize: "0.85rem", fontWeight: 700 }} noWrap>
                        {ev.description}
                      </Typography>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mt: 0.35, flexWrap: "wrap" }}>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(ev.createdAt).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
                          {" · "}{ev.method}
                        </Typography>
                        {ev.expressSaleId && (
                          <Chip
                            icon={<PointOfSaleIcon sx={{ fontSize: "12px !important" }} />}
                            label="Express"
                            size="small"
                            sx={{ height: 18, fontSize: "0.58rem", bgcolor: alpha("#6366f1", 0.12), color: "#6366f1" }}
                          />
                        )}
                      </Box>
                    </Box>
                    <Typography sx={{ fontWeight: 800, fontSize: "0.9rem", color: c, whiteSpace: "nowrap" }}>
                      {ev.type === "ENTRATA" ? "+" : "-"}{money(ev.amount)}
                    </Typography>
                  </Box>
                );
              })}
            </AnimatePresence>
          </Stack>
        )}
      </Box>
    </Paper>
  );
}
