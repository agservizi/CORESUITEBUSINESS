"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Drawer, Box, Typography, IconButton, Button, TextField, MenuItem, Divider,
  CircularProgress, Stack, Chip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { shellDrawerPaperSx } from "@/theme/shell-tokens";
import { jsonMutationHeaders } from "@/lib/csrf-client";
import EntityDocumentsPanel from "./EntityDocumentsPanel";
import type { ModuleDefinition } from "@/config/platform-modules";

type StatusOption = { value: string; label: string };

function statusOptionsFromModule(module: ModuleDefinition): StatusOption[] {
  const field = module.createFields?.find((f) => f.key === "status");
  if (field?.options?.length) return field.options;
  return [
    { value: "In attesa", label: "In attesa" },
    { value: "In lavorazione", label: "In lavorazione" },
    { value: "Completato", label: "Completato" },
    { value: "Annullato", label: "Annullato" },
  ];
}

function recordTitle(record: Record<string, unknown>): string {
  return String(
    record.code ??
      record.caseType ??
      record.serviceName ??
      record.practiceType ??
      record.recipient ??
      record.trackingCode ??
      record.id
  );
}

interface Props {
  open: boolean;
  onClose: () => void;
  recordId: string | null;
  moduleKey: string;
  module: ModuleDefinition;
  docEntityType: string;
  serviceColor?: string;
  onUpdated?: () => void;
}

export default function RecordDetailDrawer({
  open,
  onClose,
  recordId,
  moduleKey,
  module,
  docEntityType,
  serviceColor = "#6366f1",
  onUpdated,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [record, setRecord] = useState<Record<string, unknown> | null>(null);
  const [status, setStatus] = useState("");
  const [notes, setNotes] = useState("");
  const statusOptions = statusOptionsFromModule(module);
  const apiBase = `/api/platform/${moduleKey}`;

  const load = useCallback(async () => {
    if (!recordId) return;
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/${recordId}`);
      const data = await res.json();
      const item = data.item ?? null;
      setRecord(item);
      setStatus(String(item?.status ?? ""));
      setNotes(String(item?.notes ?? ""));
    } finally {
      setLoading(false);
    }
  }, [recordId, apiBase]);

  useEffect(() => {
    if (open && recordId) load();
  }, [open, recordId, load]);

  async function save() {
    if (!recordId) return;
    await fetch(`${apiBase}/${recordId}`, {
      method: "PATCH",
      headers: jsonMutationHeaders(),
      body: JSON.stringify({ status, notes }),
    });
    onUpdated?.();
    window.dispatchEvent(new CustomEvent("coresuite:data-mutated", { detail: { moduleKey } }));
    await load();
  }

  return (
    <Drawer anchor="right" open={open} onClose={onClose} slotProps={{ paper: { sx: shellDrawerPaperSx } }}>
      <Box sx={{ width: { xs: "100vw", sm: 420 }, p: 2.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
          <Typography sx={{ fontWeight: 800, flex: 1 }}>{module.entityLabel}</Typography>
          <IconButton onClick={onClose}><CloseIcon /></IconButton>
        </Box>

        {loading && !record ? (
          <CircularProgress size={24} />
        ) : record ? (
          <Stack spacing={2}>
            <Box>
              <Typography variant="caption" color="text.secondary">Dettaglio</Typography>
              <Typography sx={{ fontWeight: 700 }}>{recordTitle(record)}</Typography>
              {record.status != null && (
                <Chip size="small" label={String(record.status).replace(/_/g, " ")} sx={{ mt: 0.5 }} />
              )}
            </Box>

            {record.slotAt != null && (
              <Typography variant="body2">
                Slot: {new Date(String(record.slotAt)).toLocaleString("it-IT")}
              </Typography>
            )}
            {record.registry != null && (
              <Typography variant="body2">Registro: {String(record.registry)}</Typography>
            )}
            {record.plate != null && (
              <Typography variant="body2">Targa: {String(record.plate)}</Typography>
            )}
            {record.body != null && (
              <TextField fullWidth size="small" multiline rows={4} label="Testo telegramma" value={String(record.body)} slotProps={{ input: { readOnly: true } }} />
            )}

            <TextField select fullWidth size="small" label="Stato" value={status} onChange={(e) => setStatus(e.target.value)}>
              {statusOptions.map((o) => (
                <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
              ))}
            </TextField>

            <TextField fullWidth size="small" multiline rows={3} label="Note" value={notes} onChange={(e) => setNotes(e.target.value)} />

            <Button variant="contained" onClick={save} sx={{ bgcolor: serviceColor }}>Salva</Button>

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
