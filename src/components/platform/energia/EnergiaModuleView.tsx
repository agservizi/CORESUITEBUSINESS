"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Box, Typography, Paper, Button, TextField, Stack, List, ListItem, ListItemText, CircularProgress, alpha,
} from "@mui/material";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import { usePlatformNavigation } from "@/context/PlatformNavigationProvider";
import { getModuleDefinition } from "@/config/platform-modules";
import { getPlatformService } from "@/config/platform-services";
import GenericModuleView from "../GenericModuleView";
import ModuleDashboard from "../service-shell/ModuleDashboard";
import ServicePremiumSubView from "../service-shell/ServicePremiumSubView";
import EntityDocumentsPanel from "../shared/EntityDocumentsPanel";
import { shellPaperSx } from "@/theme/shell-tokens";
import { jsonMutationHeaders } from "@/lib/csrf-client";

export default function EnergiaModuleView({ viewId, serviceColor = "#eab308" }: { viewId: string; serviceColor?: string }) {
  const { navigate, serviceSlug } = usePlatformNavigation();
  const service = getPlatformService(serviceSlug);
  const module = getModuleDefinition("energia")!;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [logs, setLogs] = useState<Record<string, unknown>[]>([]);
  const [subject, setSubject] = useState("Promemoria attivazione contratto");
  const [loading, setLoading] = useState(false);

  const loadLogs = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/platform/energia/${id}/reminder`);
      const data = await res.json();
      setLogs(data.logs ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedId && viewId === "promemoria") loadLogs(selectedId);
  }, [selectedId, loadLogs, viewId]);

  async function sendReminder() {
    if (!selectedId) return;
    await fetch(`/api/platform/energia/${selectedId}/reminder`, {
      method: "POST",
      headers: jsonMutationHeaders(),
      body: JSON.stringify({ subject }),
    });
    await loadLogs(selectedId);
  }

  if (viewId === "dashboard") {
    return (
      <ModuleDashboard
        moduleKey="energia"
        serviceColor={serviceColor}
        serviceName="Energia"
        listViewId="elenco"
        onNavigate={navigate}
        serviceSlug={serviceSlug}
      />
    );
  }

  if (viewId === "elenco") {
    return (
      <GenericModuleView
        module={module}
        viewId="elenco"
        serviceColor={serviceColor}
        showToolbar
        moduleKeyOverride="energia"
        serviceNameOverride="Energia"
      />
    );
  }

  const reminderPanel = selectedId ? (
    <Paper
      sx={[
        shellPaperSx,
        {
          p: 2.5,
          mt: 2,
          borderTop: `3px solid ${serviceColor}`,
          background: `linear-gradient(145deg, ${alpha(serviceColor, 0.06)} 0%, transparent 70%)`,
        },
      ]}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 2 }}>
        <EmailOutlinedIcon sx={{ color: serviceColor }} />
        <Typography sx={{ fontWeight: 700 }}>Promemoria contratto</Typography>
      </Stack>
      <EntityDocumentsPanel entityType="energy-contract" entityId={selectedId} serviceColor={serviceColor} />
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 2, mb: 2 }}>
        <TextField size="small" fullWidth label="Oggetto email" value={subject} onChange={(e) => setSubject(e.target.value)} />
        <Button variant="contained" sx={{ bgcolor: serviceColor, fontWeight: 700, whiteSpace: "nowrap" }} onClick={sendReminder}>
          Invia promemoria
        </Button>
      </Stack>
      {loading ? (
        <CircularProgress size={20} />
      ) : (
        <List dense>
          {logs.map((l) => (
            <ListItem key={String(l.id)} disablePadding sx={{ py: 0.5 }}>
              <ListItemText
                primary={String(l.subject)}
                secondary={`${String(l.recipient)} · ${new Date(String(l.sentAt)).toLocaleString("it-IT")}`}
              />
            </ListItem>
          ))}
          {!logs.length && (
            <Typography variant="body2" color="text.secondary">
              Nessun promemoria inviato per questo contratto.
            </Typography>
          )}
        </List>
      )}
    </Paper>
  ) : (
    <Paper sx={[shellPaperSx, { p: 3, mt: 2, textAlign: "center" }]}>
      <Typography color="text.secondary">Seleziona un contratto dall&apos;elenco per inviare promemoria.</Typography>
    </Paper>
  );

  return (
    <ServicePremiumSubView
      moduleKey="energia"
      viewId="promemoria"
      serviceName="Energia"
      serviceColor={serviceColor}
      serviceGradient={service?.gradient}
      badge={selectedId ? "Contratto selezionato" : "Seleziona contratto"}
    >
      <GenericModuleView
        module={module}
        viewId="elenco"
        serviceColor={serviceColor}
        hideHeader
        moduleKeyOverride="energia"
        serviceNameOverride="Energia"
        onRowClick={setSelectedId}
      />
      {reminderPanel}
    </ServicePremiumSubView>
  );
}
