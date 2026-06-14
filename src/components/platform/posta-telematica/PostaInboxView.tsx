"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Paper, Stack, Chip, CircularProgress, Button, Typography, ToggleButton, ToggleButtonGroup, Box,
} from "@mui/material";
import ServicePremiumSubView from "../service-shell/ServicePremiumSubView";
import { shellPaperSx } from "@/theme/shell-tokens";
import { jsonMutationHeaders } from "@/lib/csrf-client";
import PostaConfigBanner from "./PostaConfigBanner";
import { isReceiptInboxSubject, type PecStatus } from "./posta-utils";
import { fetchPostaJson } from "./posta-fetch";

type InboxRow = {
  id: string;
  sender?: string | null;
  subject?: string | null;
  receivedAt?: string | null;
  snippet?: string | null;
  body?: string | null;
  seen?: boolean;
};

interface Props {
  serviceColor: string;
  serviceGradient?: string;
  pecStatus: PecStatus | null;
}

export default function PostaInboxView({ serviceColor, serviceGradient, pecStatus }: Props) {
  const [inbox, setInbox] = useState<InboxRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "receipts" | "messages">("all");
  const [syncInfo, setSyncInfo] = useState<{ imported?: number; mode?: string; receiptsMatched?: number } | null>(null);

  const loadInbox = useCallback(async (sync = false) => {
    setLoading(true);
    try {
      const data = await fetchPostaJson<{
        messages?: InboxRow[];
        sync?: { imported?: number; mode?: string; receiptsMatched?: number };
      }>(`/api/platform/posta-telematica/messages?view=inbox${sync ? "&sync=1" : ""}`);
      setInbox(data.messages ?? []);
      if (data.sync) setSyncInfo(data.sync);
    } catch {
      setInbox([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInbox(true);
  }, [loadInbox]);

  async function syncInboxNow() {
    setLoading(true);
    try {
      setSyncInfo(
        await fetchPostaJson<{ imported?: number; mode?: string; receiptsMatched?: number }>(
          "/api/platform/posta-telematica/messages",
          {
            method: "POST",
            headers: jsonMutationHeaders(),
            body: JSON.stringify({ action: "syncInbox" }),
          }
        )
      );
      await loadInbox(false);
    } catch {
      setSyncInfo(null);
    } finally {
      setLoading(false);
    }
  }

  const filtered = inbox.filter((m) => {
    if (filter === "receipts") return isReceiptInboxSubject(m.subject);
    if (filter === "messages") return !isReceiptInboxSubject(m.subject);
    return true;
  });

  return (
    <ServicePremiumSubView
      moduleKey="posta-telematica"
      viewId="inbox"
      serviceName="Posta Telematica"
      serviceColor={serviceColor}
      serviceGradient={serviceGradient}
      badge={`${inbox.length} messaggi`}
      actions={
        <Button
          variant="contained"
          sx={{ bgcolor: "#fff", color: serviceColor, fontWeight: 700 }}
          onClick={syncInboxNow}
          disabled={loading}
        >
          Sincronizza casella
        </Button>
      }
    >
      {loading ? (
        <CircularProgress />
      ) : (
        <>
          <PostaConfigBanner status={pecStatus} />
          <ToggleButtonGroup
            exclusive
            size="small"
            value={filter}
            onChange={(_, v) => v && setFilter(v)}
            sx={{ mb: 2 }}
          >
            <ToggleButton value="all">Tutti</ToggleButton>
            <ToggleButton value="receipts">Ricevute PEC</ToggleButton>
            <ToggleButton value="messages">Messaggi</ToggleButton>
          </ToggleButtonGroup>
          {syncInfo && (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
              Ultima sync: {syncInfo.imported ?? 0} nuovi ({syncInfo.mode ?? "—"})
              {typeof syncInfo.receiptsMatched === "number" && syncInfo.receiptsMatched > 0
                ? ` · ${syncInfo.receiptsMatched} ricevute collegate agli invii`
                : ""}
            </Typography>
          )}
          <Stack spacing={1}>
            {filtered.map((m) => (
              <Paper key={m.id} sx={[shellPaperSx, { p: 2, opacity: m.seen ? 0.85 : 1 }]}>
                <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1, flexWrap: "wrap", mb: 0.5 }}>
                  <Typography sx={{ fontWeight: 700 }}>{m.subject ?? "—"}</Typography>
                  <Stack direction="row" spacing={0.5}>
                    {isReceiptInboxSubject(m.subject) && (
                      <Chip size="small" label="Ricevuta" color="info" variant="outlined" />
                    )}
                    {!m.seen && <Chip size="small" label="Nuovo" color="primary" />}
                  </Stack>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {m.sender} · {m.receivedAt ? new Date(m.receivedAt).toLocaleString("it-IT") : ""}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {m.snippet ?? m.body ?? ""}
                </Typography>
              </Paper>
            ))}
            {!filtered.length && (
              <Typography color="text.secondary">Nessun messaggio in questa vista.</Typography>
            )}
          </Stack>
        </>
      )}
    </ServicePremiumSubView>
  );
}
