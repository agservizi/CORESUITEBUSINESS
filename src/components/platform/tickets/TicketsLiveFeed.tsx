"use client";

import { useEffect, useRef, useState } from "react";
import { Box, Typography } from "@mui/material";
import { AnimatePresence, motion } from "framer-motion";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import { shellPanelSx } from "@/theme/shell-tokens";
import { PRIORITY_COLORS, STATUS_LABELS, customerLabel } from "./tickets-utils";
import { ticketTickerItem } from "./tickets-motion";
import type { TicketRow } from "@/lib/platform/tickets-service";

interface FeedItem {
  id: string;
  code: string;
  subject: string;
  customer: string;
  status: string;
  priority: string;
  at: string;
}

interface Props {
  onRefresh?: () => void;
}

export default function TicketsLiveFeed({ onRefresh }: Props) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource("/api/platform/tickets/stream");
    esRef.current = es;

    es.addEventListener("tickets", (e) => {
      try {
        const data = JSON.parse(e.data);
        const incoming: FeedItem[] = (data.items || []).map((r: TicketRow & { messageCount?: number }) => ({
          id: `${r.id}-${Date.now()}`,
          code: r.code,
          subject: r.subject,
          customer: customerLabel(r),
          status: r.status,
          priority: r.priority,
          at: r.updatedAt,
        }));
        if (incoming.length) {
          setItems((prev) => [...incoming, ...prev].slice(0, 8));
          onRefresh?.();
        }
      } catch {
        /* ignore */
      }
    });

    return () => es.close();
  }, [onRefresh]);

  if (items.length === 0) return null;

  return (
    <Box sx={[shellPanelSx, { mb: 3, p: 2, overflow: "hidden" }]}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
        <FiberManualRecordIcon sx={{ fontSize: 10, color: "#22c55e" }} />
        <Typography sx={{ fontWeight: 700, fontSize: "0.85rem" }}>Feed live ticket</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ ml: "auto" }}>
          Aggiornamenti in tempo reale
        </Typography>
      </Box>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75, maxHeight: 160, overflowY: "auto" }}>
        <AnimatePresence initial={false}>
          {items.map((item) => (
            <Box
              key={item.id}
              component={motion.div}
              variants={ticketTickerItem}
              initial="hidden"
              animate="show"
              exit="exit"
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                py: 0.75,
                px: 1,
                borderRadius: 1.5,
                bgcolor: "action.hover",
              }}
            >
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  bgcolor: PRIORITY_COLORS[item.priority] || "#64748b",
                  flexShrink: 0,
                }}
              />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: "0.8rem", fontWeight: 600 }} noWrap>
                  {item.code} · {item.subject}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {item.customer} · {STATUS_LABELS[item.status] || item.status}
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                {new Date(item.at).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
              </Typography>
            </Box>
          ))}
        </AnimatePresence>
      </Box>
    </Box>
  );
}
