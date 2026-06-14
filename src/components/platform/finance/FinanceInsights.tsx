"use client";

import { Box, Typography, Paper, Stack, Button, alpha } from "@mui/material";
import LightbulbIcon from "@mui/icons-material/Lightbulb";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { motion } from "framer-motion";
import { shellPanelSx } from "@/theme/shell-tokens";
import { useRouter } from "next/navigation";

interface Suggestion {
  id: string;
  severity: "info" | "warning" | "success";
  title: string;
  body: string;
  link?: string;
}

interface Props {
  suggestions: Suggestion[];
}

const CONFIG = {
  info: { color: "#0ea5e9", icon: InfoOutlinedIcon },
  warning: { color: "#f59e0b", icon: WarningAmberIcon },
  success: { color: "#22c55e", icon: CheckCircleIcon },
};

export default function FinanceInsights({ suggestions }: Props) {
  const router = useRouter();

  return (
    <Paper sx={[shellPanelSx, { p: 0, height: "100%", overflow: "hidden" }]}>
      <Box
        sx={{
          px: 2,
          py: 1.75,
          borderBottom: 1,
          borderColor: "divider",
          display: "flex",
          alignItems: "center",
          gap: 1,
          background: "linear-gradient(90deg, rgba(245,158,11,0.08) 0%, transparent 100%)",
        }}
      >
        <LightbulbIcon sx={{ fontSize: 18, color: "#f59e0b" }} />
        <Typography sx={{ fontWeight: 700 }}>Insights intelligenti</Typography>
      </Box>
      <Stack spacing={1.25} sx={{ p: 2 }}>
        {suggestions.length === 0 ? (
          <Typography variant="caption" color="text.secondary">Tutto in ordine — nessun alert</Typography>
        ) : (
          suggestions.map((s, i) => {
            const cfg = CONFIG[s.severity];
            const Icon = cfg.icon;
            return (
              <Box
                key={s.id}
                component={motion.div}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                sx={{
                  p: 1.75,
                  borderRadius: 2.5,
                  border: `1px solid ${alpha(cfg.color, 0.25)}`,
                  bgcolor: alpha(cfg.color, 0.06),
                }}
              >
                <Box sx={{ display: "flex", gap: 1.25, alignItems: "flex-start" }}>
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: 1.5,
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      bgcolor: alpha(cfg.color, 0.15),
                    }}
                  >
                    <Icon sx={{ fontSize: 18, color: cfg.color }} />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontSize: "0.85rem", fontWeight: 700, color: cfg.color }}>
                      {s.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.35, lineHeight: 1.45 }}>
                      {s.body}
                    </Typography>
                    {s.link && (
                      <Button
                        size="small"
                        onClick={() => router.push(s.link!)}
                        sx={{ p: 0, minWidth: 0, mt: 0.75, fontSize: "0.75rem", fontWeight: 700, color: cfg.color }}
                      >
                        Vai →
                      </Button>
                    )}
                  </Box>
                </Box>
              </Box>
            );
          })
        )}
      </Stack>
    </Paper>
  );
}
