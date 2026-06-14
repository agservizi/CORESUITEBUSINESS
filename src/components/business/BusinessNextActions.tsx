"use client";

import { useEffect, useState } from "react";
import { Box, Typography, Button, Chip } from "@mui/material";
import LightbulbIcon from "@mui/icons-material/Lightbulb";
import { useRouter } from "next/navigation";
import { getShellTokens, shellPanelSx } from "@/theme/shell-tokens";

interface Action {
  id: string;
  kind: string;
  title: string;
  reason: string;
  priority: "high" | "medium" | "low";
  link?: string;
}

const PRIORITY_COLOR = { high: "#ef4444", medium: "#f59e0b", low: "#64748b" };

export default function BusinessNextActions() {
  const router = useRouter();
  const [items, setItems] = useState<Action[]>([]);

  useEffect(() => {
    fetch("/api/business/suggestions")
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => setItems(d.items || []));
  }, []);

  return (
    <Box sx={[shellPanelSx, { p: 2.5 }]}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <LightbulbIcon sx={{ color: "#f59e0b", fontSize: 20 }} />
        <Typography sx={{ fontWeight: 600, fontSize: "0.9rem" }}>Next Best Action</Typography>
      </Box>

      {items.length === 0 ? (
        <Typography color="text.secondary" sx={{ fontSize: "0.875rem" }}>
          Nessun suggerimento al momento — ottimo lavoro!
        </Typography>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {items.slice(0, 6).map((a) => (
            <Box
              key={a.id}
              sx={(theme) => {
                const t = getShellTokens(theme);
                return {
                  p: 1.5,
                  borderRadius: 2,
                  background: t.rowHover,
                  border: t.border,
                };
              }}
            >
              <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, mb: 0.5 }}>
                <Chip
                  label={a.priority}
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: "0.6rem",
                    background: `${PRIORITY_COLOR[a.priority]}22`,
                    color: PRIORITY_COLOR[a.priority],
                  }}
                />
                <Typography sx={{ fontWeight: 600, fontSize: "0.825rem", flex: 1 }}>{a.title}</Typography>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                {a.reason}
              </Typography>
              {a.link && (
                <Button size="small" onClick={() => router.push(a.link!)}>
                  Agisci
                </Button>
              )}
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
