"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { HubExpressSnapshot, HubKpiSnapshot } from "@/lib/hub-spotlight";

export interface HubOperationsState {
  kpi: HubKpiSnapshot | null;
  express: HubExpressSnapshot | null;
  activeServicesCount: number;
  lastSyncMs: number | null;
  criticalAlerts: number;
  loading: boolean;
  refresh: () => void;
}

const HubOperationsContext = createContext<HubOperationsState | null>(null);

const POLL_MS = 30_000;

export function HubOperationsProvider({
  children,
  activeServicesCount,
}: {
  children: ReactNode;
  activeServicesCount: number;
}) {
  const [kpi, setKpi] = useState<HubKpiSnapshot | null>(null);
  const [express, setExpress] = useState<HubExpressSnapshot | null>(null);
  const [lastSyncMs, setLastSyncMs] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [opsRes, expressRes] = await Promise.all([
          fetch("/api/platform/operations", { credentials: "include" }),
          fetch("/api/platform/express?view=dashboard", { credentials: "include" }),
        ]);

        if (cancelled) return;

        if (opsRes.ok) {
          const ops = await opsRes.json();
          setKpi(ops.kpi ?? null);
        }

        if (expressRes.ok) {
          const data = await expressRes.json();
          const operatorAlerts = Array.isArray(data.operatorAlerts) ? data.operatorAlerts.length : 0;
          setExpress({
            salesToday: data.kpis?.salesToday ?? data.salesToday ?? 0,
            lowStockOperators: operatorAlerts,
            iccidInStock: data.kpis?.iccidInStock ?? data.iccidInStock ?? 0,
          });
        }

        setLastSyncMs(Date.now());
      } catch {
        if (!cancelled) {
          setKpi(null);
          setExpress(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [tick]);

  const criticalAlerts = useMemo(() => {
    let count = 0;
    if (kpi && kpi.openTickets >= 5) count += 1;
    if (express && express.lowStockOperators > 0) count += 1;
    if (express && express.iccidInStock === 0) count += 1;
    return count;
  }, [kpi, express]);

  const value = useMemo<HubOperationsState>(
    () => ({
      kpi,
      express,
      activeServicesCount,
      lastSyncMs,
      criticalAlerts,
      loading,
      refresh: () => setTick((t) => t + 1),
    }),
    [kpi, express, activeServicesCount, lastSyncMs, criticalAlerts, loading]
  );

  return <HubOperationsContext.Provider value={value}>{children}</HubOperationsContext.Provider>;
}

export function useHubOperations() {
  const ctx = useContext(HubOperationsContext);
  if (!ctx) {
    throw new Error("useHubOperations must be used within HubOperationsProvider");
  }
  return ctx;
}

export function useHubOperationsOptional() {
  return useContext(HubOperationsContext);
}
