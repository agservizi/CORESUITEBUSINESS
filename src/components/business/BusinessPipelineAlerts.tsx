"use client";

import { useEffect, useState } from "react";
import { Box, Typography, Chip, Button } from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { useRouter } from "next/navigation";
import { getShellTokens, shellPanelSx } from "@/theme/shell-tokens";

interface Alert {
  id: string;
  kind: string;
  title: string;
  detail: string;
  severity: "warning" | "error" | "info";
  link?: string;
}

const SEV_COLOR = { error: "#ef4444", warning: "#f59e0b", info: "#0ea5e9" };

export default function BusinessPipelineAlerts() {
  const router = useRouter();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [forecast, setForecast] = useState(0);

  useEffect(() => {
    fetch("/api/business/intelligence")
      .then((r) => (r.ok ? r.json() : { alerts: [], forecast: { weighted: 0 } }))
      .then((d) => {
        setAlerts(d.alerts || []);
        setForecast(Math.round(d.forecast?.weighted ?? 0));
      });
  }, []);

  return (
    <Box sx={[shellPanelSx, { p: 2.5 }]}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <WarningAmberIcon sx={{ color: "#f59e0b", fontSize: 20 }} />
          <Typography sx={{ fontWeight: 600, fontSize: "0.9rem" }}>Pipeline intelligence</Typography>
        </Box>
        <Chip label={`Forecast €${forecast.toLocaleString("it-IT")}`} size="small" color="primary" />
      </Box>

      {alerts.length === 0 ? (
        <Typography color="text.secondary" sx={{ fontSize: "0.875rem" }}>
          Nessun alert — pipeline in salute
        </Typography>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {alerts.slice(0, 5).map((a) => (
            <Box
              key={a.id}
              sx={(theme) => {
                const t = getShellTokens(theme);
                return {
                  p: 1.5,
                  borderRadius: 2,
                  background: t.rowHover,
                  border: `1px solid ${SEV_COLOR[a.severity]}33`,
                };
              }}
            >
              <Typography sx={{ fontWeight: 600, fontSize: "0.825rem" }}>{a.title}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                {a.detail}
              </Typography>
              {a.link && (
                <Button size="small" onClick={() => router.push(a.link!)}>
                  Apri
                </Button>
              )}
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
