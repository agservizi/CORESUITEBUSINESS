"use client";

import { useEffect, useRef, useState } from "react";
import { Box, Typography } from "@mui/material";
import { AnimatePresence, motion } from "framer-motion";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import { shellPanelSx } from "@/theme/shell-tokens";
import { customerLabel, statusColor } from "./opportunities-utils";
import { oppTickerItem } from "./opportunities-motion";

interface FeedItem {
  id: string;
  code: string;
  customer: string;
  statusCode: string;
  statusLabel?: string;
  at: string;
}

interface Props {
  onRefresh?: () => void;
}

export default function OpportunitiesLiveFeed({ onRefresh }: Props) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource("/api/platform/opportunities/stream");
    esRef.current = es;

    es.addEventListener("opportunities", (e) => {
      try {
        const data = JSON.parse(e.data);
        const incoming: FeedItem[] = (data.items || []).map((r: {
          id: string;
          code: string;
          customerFirstName?: string;
          customerLastName?: string;
          customerName?: string;
          statusCode: string;
          statusLabel?: string;
          updatedAt: string;
        }) => ({
          id: `${r.id}-${Date.now()}`,
          code: r.code,
          customer: r.customerName || `${r.customerFirstName || ""} ${r.customerLastName || ""}`.trim(),
          statusCode: r.statusCode,
          statusLabel: r.statusLabel,
          at: r.updatedAt,
        }));
        if (incoming.length) {
          setItems((prev) => [...incoming, ...prev].slice(0, 8));
          onRefresh?.();
        }
      } catch { /* ignore */ }
    });

    return () => es.close();
  }, [onRefresh]);

  if (items.length === 0) return null;

  return (
    <Box sx={[shellPanelSx, { mb: 3, p: 2, overflow: "hidden" }]}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
        <FiberManualRecordIcon sx={{ fontSize: 10, color: "#22c55e" }} />
        <Typography sx={{ fontWeight: 700, fontSize: "0.85rem" }}>Feed live</Typography>
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
              variants={oppTickerItem}
              initial="hidden"
              animate="show"
              exit="exit"
              layout
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                px: 1.25,
                py: 0.75,
                borderRadius: 2,
                bgcolor: "action.hover",
              }}
            >
              <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: statusColor(item.statusCode), flexShrink: 0 }} />
              <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, fontFamily: "monospace", flexShrink: 0 }}>
                {item.code}
              </Typography>
              <Typography sx={{ fontSize: "0.8rem", flex: 1 }} noWrap>
                {item.customer}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                {item.statusLabel || item.statusCode}
              </Typography>
            </Box>
          ))}
        </AnimatePresence>
      </Box>
    </Box>
  );
}
