"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Box, Typography, Paper, Button, TextField, Stack, Chip, CircularProgress, MenuItem,
} from "@mui/material";
import { usePlatformNavigation } from "@/context/PlatformNavigationProvider";
import { getModuleDefinition } from "@/config/platform-modules";
import GenericModuleView from "../GenericModuleView";
import ModuleDashboard from "../service-shell/ModuleDashboard";
import ServicePremiumSubView from "../service-shell/ServicePremiumSubView";
import { getPlatformService } from "@/config/platform-services";
import { shellPaperSx } from "@/theme/shell-tokens";
import { jsonMutationHeaders } from "@/lib/csrf-client";

const STATUSES = ["SEGNALATO", "RICEVUTO", "PRONTO", "RITIRATO"];

export default function LogisticaModuleView({ viewId, serviceColor = "#f97316" }: { viewId: string; serviceColor?: string }) {
  const { navigate, serviceSlug } = usePlatformNavigation();
  const service = getPlatformService(serviceSlug);
  const module = getModuleDefinition("logistica")!;
  const [locations, setLocations] = useState<Record<string, unknown>[]>([]);
  const [notifications, setNotifications] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [locName, setLocName] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState("RICEVUTO");

  const loadExtras = useCallback(async (view: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/platform/logistica/extras?view=${view}`);
      const data = await res.json();
      if (view === "notifications") setNotifications(data.notifications ?? []);
      else setLocations(data.locations ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (viewId === "sedi") loadExtras("locations");
    if (viewId === "notifiche") loadExtras("notifications");
  }, [viewId, loadExtras]);

  async function addLocation() {
    await fetch("/api/platform/logistica/extras", {
      method: "POST",
      headers: jsonMutationHeaders(),
      body: JSON.stringify({ action: "createLocation", name: locName }),
    });
    setLocName("");
    await loadExtras("locations");
  }

  async function updateStatus() {
    if (!selectedId) return;
    await fetch(`/api/platform/logistica/${selectedId}/actions`, {
      method: "POST",
      headers: jsonMutationHeaders(),
      body: JSON.stringify({ status: newStatus }),
    });
    window.dispatchEvent(new CustomEvent("coresuite:data-mutated", { detail: { moduleKey: "logistica" } }));
  }

  async function notifyClient() {
    if (!selectedId) return;
    await fetch(`/api/platform/logistica/${selectedId}/actions`, {
      method: "POST",
      headers: jsonMutationHeaders(),
      body: JSON.stringify({ action: "notify" }),
    });
    window.dispatchEvent(new CustomEvent("coresuite:data-mutated", { detail: { moduleKey: "logistica" } }));
  }

  if (viewId === "dashboard") {
    return <ModuleDashboard moduleKey="logistica" serviceColor={serviceColor} serviceName="Logistica & Ritiri" listViewId="elenco" onNavigate={navigate} serviceSlug={serviceSlug} />;
  }

  if (viewId === "sedi") {
    return (
      <ServicePremiumSubView moduleKey="logistica" viewId={viewId} serviceName="Logistica & Ritiri" serviceColor={serviceColor} serviceGradient={service?.gradient} badge={`${locations.length} sedi`} showKpiStrip={false}>
        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          <TextField size="small" label="Nome sede" value={locName} onChange={(e) => setLocName(e.target.value)} />
          <Button variant="contained" sx={{ bgcolor: serviceColor }} onClick={addLocation}>Aggiungi</Button>
        </Stack>
        {loading ? <CircularProgress /> : (
          <Stack spacing={1}>
            {locations.map((l) => (
              <Paper key={String(l.id)} sx={[shellPaperSx, { p: 2 }]}><Typography sx={{ fontWeight: 600 }}>{String(l.name)}</Typography></Paper>
            ))}
          </Stack>
        )}
      </ServicePremiumSubView>
    );
  }

  if (viewId === "notifiche") {
    return (
      <ServicePremiumSubView moduleKey="logistica" viewId={viewId} serviceName="Logistica & Ritiri" serviceColor={serviceColor} serviceGradient={service?.gradient} badge={`${notifications.length} notifiche`} showKpiStrip={false}>
        {loading ? <CircularProgress /> : (
          <Stack spacing={1}>
            {notifications.map((n) => (
              <Paper key={String(n.id)} sx={[shellPaperSx, { p: 2 }]}>
                <Typography sx={{ fontWeight: 600 }}>{String(n.subject)}</Typography>
                <Typography variant="caption">{String(n.recipientEmail)} · {String(n.status)}</Typography>
              </Paper>
            ))}
            {!notifications.length && <Typography color="text.secondary">Nessuna notifica inviata.</Typography>}
          </Stack>
        )}
      </ServicePremiumSubView>
    );
  }

  return (
    <Box>
      <GenericModuleView
        module={module}
        viewId="elenco"
        serviceColor={serviceColor}
        showToolbar
        moduleKeyOverride="logistica"
        serviceNameOverride="Logistica & Ritiri"
        onRowClick={setSelectedId}
      />
      {selectedId && (
        <Paper sx={[shellPaperSx, { p: 2, mt: 2 }]}>
          <Typography sx={{ fontWeight: 700, mb: 1 }}>Azioni pacco</Typography>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
            <TextField select size="small" value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
              {STATUSES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>
            <Button size="small" variant="contained" sx={{ bgcolor: serviceColor }} onClick={updateStatus}>Aggiorna stato</Button>
            <Button size="small" variant="outlined" onClick={notifyClient}>Notifica cliente</Button>
          </Stack>
        </Paper>
      )}
    </Box>
  );
}
