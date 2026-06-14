"use client";

import { useCallback, useEffect, useState } from "react";
import { Grid } from "@mui/material";
import type { ModuleDashboardData } from "@/lib/platform/module-dashboard-service";
import ServiceStatCard, { kpiIconForIndex } from "./ServiceStatCard";

export function useModuleDashboardMini(moduleKey: string) {
  const [data, setData] = useState<ModuleDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/platform/${moduleKey}/dashboard`);
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [moduleKey]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, reload: load };
}

export function ServiceKpiStrip({
  moduleKey,
  serviceColor,
  max = 4,
}: {
  moduleKey: string;
  serviceColor: string;
  max?: number;
}) {
  const { data } = useModuleDashboardMini(moduleKey);
  const kpis = (data?.kpis ?? []).slice(0, max);
  if (!kpis.length) return null;

  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {kpis.map((kpi, i) => (
        <Grid key={kpi.key} size={{ xs: 6, sm: 3 }}>
          <ServiceStatCard
            label={kpi.label}
            value={kpi.value}
            sub={kpi.hint}
            icon={kpiIconForIndex(i)}
            color={serviceColor}
            delay={i * 0.05}
          />
        </Grid>
      ))}
    </Grid>
  );
}
