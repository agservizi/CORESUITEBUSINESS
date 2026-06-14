"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  Avatar,
} from "@mui/material";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import { getShellTokens, shellPanelSx } from "@/theme/shell-tokens";

interface Row {
  userId: string;
  name: string;
  dealsWon: number;
  revenueWon: number;
  activitiesDone: number;
  leadsConverted: number;
  score: number;
}

export default function BusinessLeaderboard() {
  const [period, setPeriod] = useState<"day" | "month">("month");
  const [items, setItems] = useState<Row[]>([]);

  useEffect(() => {
    fetch(`/api/business/leaderboard?period=${period}`)
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => setItems(d.items || []));
  }, [period]);

  return (
    <Box sx={[shellPanelSx, { p: 2.5 }]}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <EmojiEventsIcon sx={{ color: "#eab308", fontSize: 20 }} />
          <Typography sx={{ fontWeight: 600, fontSize: "0.9rem" }}>Classifica operatori</Typography>
        </Box>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={period}
          onChange={(_, v) => v && setPeriod(v)}
        >
          <ToggleButton value="day">Oggi</ToggleButton>
          <ToggleButton value="month">Mese</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {items.length === 0 ? (
        <Typography color="text.secondary" sx={{ fontSize: "0.875rem" }}>
          Nessun dato per il periodo selezionato
        </Typography>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {items.map((row, i) => (
            <Box
              key={row.userId}
              sx={(theme) => {
                const t = getShellTokens(theme);
                return {
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  p: 1.25,
                  borderRadius: 2,
                  background: i === 0 ? "rgba(234,179,8,0.08)" : t.rowHover,
                  border: t.border,
                };
              }}
            >
              <Typography sx={{ fontWeight: 800, width: 20, color: i === 0 ? "#eab308" : "text.secondary" }}>
                {i + 1}
              </Typography>
              <Avatar sx={{ width: 28, height: 28, fontSize: "0.7rem" }}>
                {row.name.slice(0, 2).toUpperCase()}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontWeight: 600, fontSize: "0.825rem" }} noWrap>
                  {row.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {row.dealsWon} deal · €{row.revenueWon.toLocaleString("it-IT")} · {row.activitiesDone} attività
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
