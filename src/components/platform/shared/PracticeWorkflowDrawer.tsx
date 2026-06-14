"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Drawer, Box, Typography, IconButton, Button, TextField, MenuItem, Divider,
  CircularProgress, Stack, Chip, List, ListItem, ListItemText,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { getShellTokens, shellDrawerPaperSx } from "@/theme/shell-tokens";
import { jsonMutationHeaders } from "@/lib/csrf-client";
import EntityDocumentsPanel from "./EntityDocumentsPanel";

const PRACTICE_STATUSES = [
  { value: "BOZZA", label: "Bozza" },
  { value: "IN_LAVORAZIONE", label: "In lavorazione" },
  { value: "INVIATA", label: "Inviata" },
  { value: "COMPLETATA", label: "Completata" },
  { value: "ANNULLATA", label: "Annullata" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  recordId: string | null;
  entityType: "caf-patronato" | "anpr";
  serviceColor?: string;
  onUpdated?: () => void;
}

export default function PracticeWorkflowDrawer({
  open,
  onClose,
  recordId,
  entityType,
  serviceColor = "#f59e0b",
  onUpdated,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [record, setRecord] = useState<Record<string, unknown> | null>(null);
  const [events, setEvents] = useState<{ id: string; eventType: string; note?: string; createdAt: string }[]>([]);
  const [status, setStatus] = useState("");
  const [notes, setNotes] = useState("");
  const [delegaRecipient, setDelegaRecipient] = useState("");

  const apiBase = `/api/platform/${entityType}`;

  const load = useCallback(async () => {
    if (!recordId) return;
    setLoading(true);
    try {
      const [recRes, evRes] = await Promise.all([
        fetch(`${apiBase}/${recordId}`),
        entityType === "caf-patronato" ? fetch(`${apiBase}/${recordId}/events`) : Promise.resolve(null),
      ]);
      const recData = await recRes.json();
      setRecord(recData.item ?? null);
      setStatus(String(recData.item?.status ?? ""));
      setNotes(String(recData.item?.notes ?? ""));
      if (evRes) {
        const evData = await evRes.json();
        setEvents(evData.events ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [recordId, apiBase, entityType]);

  useEffect(() => {
    if (open && recordId) load();
  }, [open, recordId, load]);

  async function saveWorkflow() {
    if (!recordId) return;
    if (entityType === "caf-patronato") {
      await fetch(`${apiBase}/${recordId}/events`, {
        method: "POST",
        headers: jsonMutationHeaders(),
        body: JSON.stringify({ action: "workflow", data: { status, notes } }),
      });
    } else {
      await fetch(`${apiBase}/${recordId}`, {
        method: "PATCH",
        headers: jsonMutationHeaders(),
        body: JSON.stringify({ status, notes }),
      });
    }
    onUpdated?.();
    await load();
  }

  async function sendDelega() {
    if (!recordId || !delegaRecipient) return;
    const res = await fetch(`${apiBase}/${recordId}/delega`, {
      method: "POST",
      headers: jsonMutationHeaders(),
      body: JSON.stringify({ recipient: delegaRecipient }),
    });
    await res.json();
    await load();
  }

  const docEntityType = entityType === "caf-patronato" ? "practice" : "anpr-request";

  return (
    <Drawer anchor="right" open={open} onClose={onClose} slotProps={{ paper: { sx: shellDrawerPaperSx } }}>
      <Box sx={{ width: { xs: "100vw", sm: 420 }, p: 2.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
          <Typography sx={{ fontWeight: 800, flex: 1 }}>Dettaglio pratica</Typography>
          <IconButton onClick={onClose}><CloseIcon /></IconButton>
        </Box>

        {loading && !record ? (
          <CircularProgress size={24} />
        ) : record ? (
          <Stack spacing={2}>
            <Box>
              <Typography variant="caption" color="text.secondary">Codice / Tipo</Typography>
              <Typography sx={{ fontWeight: 700 }}>
                {String(record.code ?? record.requestType ?? record.id)}
              </Typography>
              {record.status != null && (
                <Chip size="small" label={String(record.status).replace(/_/g, " ")} sx={{ mt: 0.5 }} />
              )}
            </Box>

            <TextField select fullWidth size="small" label="Stato" value={status} onChange={(e) => setStatus(e.target.value)}>
              {(entityType === "caf-patronato"
                ? PRACTICE_STATUSES
                : [
                    { value: "In attesa", label: "In attesa" },
                    { value: "In lavorazione", label: "In lavorazione" },
                    { value: "Completato", label: "Completato" },
                    { value: "Annullato", label: "Annullato" },
                  ]
              ).map((o) => (
                <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
              ))}
            </TextField>

            <TextField fullWidth size="small" multiline rows={3} label="Note" value={notes} onChange={(e) => setNotes(e.target.value)} />

            <Button variant="contained" onClick={saveWorkflow} sx={{ bgcolor: serviceColor }}>
              Salva
            </Button>

            {entityType === "anpr" && (
              <>
                <Divider />
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Delega OTP</Typography>
                <Typography variant="caption" color="text.secondary">
                  Stato: {String(record.delegaFirmaStatus ?? "non_inviata")}
                </Typography>
                <TextField size="small" label="Email destinatario" value={delegaRecipient} onChange={(e) => setDelegaRecipient(e.target.value)} />
                <Button variant="outlined" onClick={sendDelega}>Invia OTP delega</Button>
              </>
            )}

            {entityType === "caf-patronato" && events.length > 0 && (
              <>
                <Divider />
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Cronologia</Typography>
                <List dense disablePadding>
                  {events.map((ev) => (
                    <ListItem key={ev.id} disablePadding>
                      <ListItemText
                        primary={ev.eventType}
                        secondary={`${ev.note ?? ""} · ${new Date(ev.createdAt).toLocaleString("it-IT")}`}
                      />
                    </ListItem>
                  ))}
                </List>
              </>
            )}

            <Divider />
            {recordId && (
              <EntityDocumentsPanel entityType={docEntityType} entityId={recordId} serviceColor={serviceColor} />
            )}
          </Stack>
        ) : null}
      </Box>
    </Drawer>
  );
}
