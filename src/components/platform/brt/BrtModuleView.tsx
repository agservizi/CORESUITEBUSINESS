"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Box, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody,
  Button, TextField, Stack, Chip, CircularProgress,
} from "@mui/material";
import { usePlatformNavigation } from "@/context/PlatformNavigationProvider";
import { getModuleDefinition } from "@/config/platform-modules";
import GenericModuleView from "../GenericModuleView";
import ModuleDashboard from "../service-shell/ModuleDashboard";
import ServicePremiumSubView from "../service-shell/ServicePremiumSubView";
import { getPlatformService } from "@/config/platform-services";
import { shellPaperSx } from "@/theme/shell-tokens";
import { jsonMutationHeaders } from "@/lib/csrf-client";

export default function BrtModuleView({ viewId, serviceColor = "#ef4444" }: { viewId: string; serviceColor?: string }) {
  const { navigate, serviceSlug } = usePlatformNavigation();
  const service = getPlatformService(serviceSlug);
  const module = getModuleDefinition("brt")!;
  const [recipients, setRecipients] = useState<Record<string, unknown>[]>([]);
  const [logs, setLogs] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", address: "", city: "", zip: "", email: "", phone: "" });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tracking, setTracking] = useState<Record<string, unknown> | null>(null);

  const loadExtras = useCallback(async (type: "recipients" | "logs") => {
    setLoading(true);
    try {
      const res = await fetch(`/api/platform/brt/extras?type=${type === "logs" ? "logs" : ""}`);
      const data = await res.json();
      if (type === "logs") setLogs(data.logs ?? []);
      else setRecipients(data.recipients ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (viewId === "destinatari") loadExtras("recipients");
    if (viewId === "log") loadExtras("logs");
  }, [viewId, loadExtras]);

  async function saveRecipient() {
    await fetch("/api/platform/brt/extras", {
      method: "POST",
      headers: jsonMutationHeaders(),
      body: JSON.stringify(form),
    });
    setForm({ name: "", address: "", city: "", zip: "", email: "", phone: "" });
    await loadExtras("recipients");
  }

  async function confirmShipment(id: string) {
    await fetch(`/api/platform/brt/${id}/actions`, {
      method: "POST",
      headers: jsonMutationHeaders(),
      body: JSON.stringify({ action: "confirm" }),
    });
    window.dispatchEvent(new CustomEvent("coresuite:data-mutated", { detail: { moduleKey: "brt" } }));
  }

  async function loadTracking(id: string) {
    const res = await fetch(`/api/platform/brt/${id}/actions`);
    setTracking(await res.json());
    setSelectedId(id);
  }

  if (viewId === "dashboard") {
    return <ModuleDashboard moduleKey="brt" serviceColor={serviceColor} serviceName="BRT Spedizioni" listViewId="elenco" onNavigate={navigate} serviceSlug={serviceSlug} />;
  }

  if (viewId === "destinatari") {
    return (
      <ServicePremiumSubView
        moduleKey="brt"
        viewId={viewId}
        serviceName="BRT Spedizioni"
        serviceColor={serviceColor}
        serviceGradient={service?.gradient}
        badge={`${recipients.length} destinatari`}
        showKpiStrip={false}
      >
        <Paper sx={[shellPaperSx, { p: 2, mb: 2 }]}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ flexWrap: "wrap" }}>
            <TextField size="small" label="Nome" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            <TextField size="small" label="Indirizzo" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
            <TextField size="small" label="Città" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
            <Button variant="contained" onClick={saveRecipient} sx={{ bgcolor: serviceColor }}>Salva</Button>
          </Stack>
        </Paper>
        {loading ? <CircularProgress /> : (
          <Paper sx={[shellPaperSx, { overflow: "auto" }]}>
            <Table size="small">
              <TableHead><TableRow><TableCell>Nome</TableCell><TableCell>Città</TableCell><TableCell>Email</TableCell></TableRow></TableHead>
              <TableBody>
                {recipients.map((r) => (
                  <TableRow key={String(r.id)}><TableCell>{String(r.name)}</TableCell><TableCell>{String(r.city ?? "—")}</TableCell><TableCell>{String(r.email ?? "—")}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        )}
      </ServicePremiumSubView>
    );
  }

  if (viewId === "log") {
    return (
      <ServicePremiumSubView
        moduleKey="brt"
        viewId={viewId}
        serviceName="BRT Spedizioni"
        serviceColor={serviceColor}
        serviceGradient={service?.gradient}
        badge={`${logs.length} eventi`}
        showKpiStrip={false}
      >
        {loading ? <CircularProgress /> : (
          <Paper sx={[shellPaperSx, { p: 2 }]}>
            <Stack spacing={1}>
              {logs.map((l) => (
                <Box key={String(l.id)} sx={{ p: 1, borderBottom: 1, borderColor: "divider" }}>
                  <Chip size="small" label={String(l.level)} color={l.level === "warning" ? "warning" : "default"} sx={{ mr: 1 }} />
                  <Typography component="span" sx={{ fontSize: "0.875rem" }}>{String(l.message)}</Typography>
                </Box>
              ))}
              {!logs.length && <Typography color="text.secondary">Nessun log.</Typography>}
            </Stack>
          </Paper>
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
        moduleKeyOverride="brt"
        serviceNameOverride="BRT Spedizioni"
        onRowClick={(id) => loadTracking(id)}
      />
      {tracking && (
        <Paper sx={[shellPaperSx, { p: 2, mt: 2 }]}>
          <Typography sx={{ fontWeight: 700, mb: 1 }}>Tracking {String(tracking.trackingCode)}</Typography>
          <Stack spacing={0.5} sx={{ mb: 2 }}>
            {(tracking.events as { at: string; label: string }[] | undefined)?.map((e, i) => (
              <Typography key={i} variant="body2">{new Date(e.at).toLocaleString("it-IT")} — {e.label}</Typography>
            ))}
          </Stack>
          {selectedId && (
            <Button size="small" variant="contained" sx={{ bgcolor: serviceColor }} onClick={() => confirmShipment(selectedId)}>
              Conferma spedizione
            </Button>
          )}
        </Paper>
      )}
    </Box>
  );
}
