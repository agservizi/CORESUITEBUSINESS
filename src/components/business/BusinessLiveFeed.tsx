"use client";

import { useEffect, useRef, useState } from "react";
import { Box, Typography, Chip, alpha } from "@mui/material";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { getShellTokens, shellPanelSx } from "@/theme/shell-tokens";

interface FeedItem {
  id: string;
  kind: string;
  message: string;
  at: string;
  link?: string;
}

export default function BusinessLiveFeed() {
  const router = useRouter();
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [pipelineValue, setPipelineValue] = useState(0);
  const [pulse, setPulse] = useState(false);
  const [connected, setConnected] = useState(false);
  const seen = useRef(new Set<string>());

  useEffect(() => {
    const es = new EventSource("/api/business/stream");

    es.addEventListener("connected", () => setConnected(true));
    es.addEventListener("feed", (e) => {
      const data = JSON.parse(e.data) as { items: FeedItem[] };
      const fresh = data.items.filter((item) => !seen.current.has(item.id));
      fresh.forEach((item) => seen.current.add(item.id));
      if (fresh.length) {
        setFeed((prev) => [...fresh, ...prev].slice(0, 20));
      }
    });
    es.addEventListener("pulse", (e) => {
      const data = JSON.parse(e.data) as { pipelineValue: number };
      setPipelineValue(data.pipelineValue);
      setPulse(true);
      setTimeout(() => setPulse(false), 600);
    });

    return () => es.close();
  }, []);

  const kindColor: Record<string, string> = {
    lead_new: "#6366f1",
    deal_won: "#10b981",
    deal_lost: "#ef4444",
    stage_move: "#0ea5e9",
  };

  return (
    <Box sx={[shellPanelSx, { p: 2.5, height: "100%" }]}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
        <Typography sx={{ fontWeight: 600, fontSize: "0.9rem" }}>Command center live</Typography>
        <Chip
          size="small"
          icon={
            <FiberManualRecordIcon
              sx={{ fontSize: 10, color: connected ? "#22c55e !important" : "text.disabled" }}
            />
          }
          label={connected ? "Live" : "…"}
          sx={{ height: 22, fontSize: "0.65rem" }}
        />
      </Box>

      <Box
        component={motion.div}
        animate={pulse ? { boxShadow: `0 0 0 4px ${alpha("#f59e0b", 0.25)}` } : { boxShadow: "none" }}
        sx={(theme) => {
          const t = getShellTokens(theme);
          return {
            p: 1.5,
            mb: 2,
            borderRadius: 2,
            background: t.hover,
            border: t.border,
            transition: "box-shadow 0.3s",
          };
        }}
      >
        <Typography variant="caption" color="text.secondary">
          Valore pipeline
        </Typography>
        <Typography sx={{ fontWeight: 800, fontSize: "1.35rem", color: "#f59e0b" }}>
          €{pipelineValue.toLocaleString("it-IT")}
        </Typography>
      </Box>

      {feed.length === 0 ? (
        <Typography color="text.secondary" sx={{ fontSize: "0.875rem" }}>
          In attesa di eventi… (nuovi lead, deal, spostamenti stage)
        </Typography>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1, maxHeight: 280, overflow: "auto" }}>
          <AnimatePresence initial={false}>
            {feed.map((item) => (
              <Box
                key={item.id}
                component={motion.div}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => item.link && router.push(item.link)}
                sx={(theme) => {
                  const t = getShellTokens(theme);
                  return {
                    p: 1.25,
                    borderRadius: 2,
                    background: t.rowHover,
                    border: `1px solid ${alpha(kindColor[item.kind] || "#6366f1", 0.2)}`,
                    cursor: item.link ? "pointer" : "default",
                    "&:hover": item.link ? { background: t.hoverStrong } : {},
                  };
                }}
              >
                <Typography sx={{ fontSize: "0.8rem", fontWeight: 600, lineHeight: 1.3 }}>
                  {item.message}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {new Date(item.at).toLocaleTimeString("it-IT")}
                </Typography>
              </Box>
            ))}
          </AnimatePresence>
        </Box>
      )}
    </Box>
  );
}
