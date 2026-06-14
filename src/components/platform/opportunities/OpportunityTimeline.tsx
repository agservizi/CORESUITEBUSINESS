"use client";

import { Box, Typography } from "@mui/material";
import { motion } from "framer-motion";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/platform/opportunities-constants";
import { parseStatusTimeline } from "./opportunities-health";
import type { OpportunityRow } from "./opportunities-utils";

interface Props {
  row: OpportunityRow;
  serviceColor?: string;
}

export default function OpportunityTimeline({ row, serviceColor = "#8b5cf6" }: Props) {
  const entries = parseStatusTimeline(row);

  if (!entries.length) return null;

  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5, fontWeight: 600, textTransform: "uppercase" }}>
        Timeline stato
      </Typography>
      <Box sx={{ position: "relative", pl: 2.5 }}>
        <Box sx={{ position: "absolute", left: 7, top: 4, bottom: 4, width: 2, bgcolor: `${serviceColor}22`, borderRadius: 1 }} />
        {entries.map((entry, i) => {
          const color = STATUS_COLORS[entry.statusCode] || serviceColor;
          const label = entry.label || STATUS_LABELS[entry.statusCode] || entry.statusCode;
          const when = new Date(entry.at).toLocaleString("it-IT", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          });
          return (
            <Box
              key={`${entry.statusCode}-${entry.at}-${i}`}
              component={motion.div}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              sx={{ position: "relative", pb: i < entries.length - 1 ? 2 : 0 }}
            >
              <Box
                sx={{
                  position: "absolute",
                  left: -18,
                  top: 2,
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  bgcolor: color,
                  boxShadow: `0 0 0 3px ${color}33`,
                }}
              />
              <Typography sx={{ fontWeight: 600, fontSize: "0.85rem", color }}>{label}</Typography>
              <Typography variant="caption" color="text.secondary">{when}</Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
