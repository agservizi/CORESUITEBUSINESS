"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  CircularProgress,
  IconButton,
  Tooltip,
  Stack,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import SendIcon from "@mui/icons-material/Send";
import RefreshIcon from "@mui/icons-material/Refresh";
import { usePlatformNavigation } from "@/context/PlatformNavigationProvider";
import { getPlatformService } from "@/config/platform-services";
import { shellPaperSx } from "@/theme/shell-tokens";
import { jsonMutationHeaders } from "@/lib/csrf-client";
import GenericModuleView from "../GenericModuleView";
import { getModuleDefinition } from "@/config/platform-modules";
import ModuleDashboard from "../service-shell/ModuleDashboard";
import ServicePremiumSubView from "../service-shell/ServicePremiumSubView";

interface Campaign {
  id: string;
  name: string;
  subject: string;
  status: string;
  recipientCount: number;
  sentAt?: string | null;
  createdAt: string;
}

interface Props {
  viewId: string;
  serviceColor?: string;
}

export default function MarketingModuleView({ viewId, serviceColor = "#ec4899" }: Props) {
  const { serviceSlug, navigate } = usePlatformNavigation();
  const service = getPlatformService(serviceSlug);
  const subscribersModule = getModuleDefinition("marketing")!;
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", subject: "", htmlBody: "" });

  const loadCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/platform/marketing/campaigns");
      const data = await res.json();
      setCampaigns(Array.isArray(data.campaigns) ? data.campaigns : []);
    } catch {
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (viewId === "campagne") loadCampaigns();
  }, [viewId, loadCampaigns]);

  async function handleCreate() {
    const res = await fetch("/api/platform/marketing/campaigns", {
      method: "POST",
      headers: jsonMutationHeaders(),
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setOpen(false);
      setForm({ name: "", subject: "", htmlBody: "" });
      await loadCampaigns();
    }
  }

  async function handleSend(id: string) {
    if (!confirm("Inviare questa campagna a tutti gli iscritti attivi?")) return;
    setSending(id);
    try {
      await fetch(`/api/platform/marketing/campaigns/${id}/send`, {
        method: "POST",
        headers: jsonMutationHeaders(),
      });
      await loadCampaigns();
    } finally {
      setSending(null);
    }
  }

  if (viewId === "dashboard") {
    return (
      <ModuleDashboard
        moduleKey="marketing"
        serviceColor={serviceColor}
        serviceName={service?.name ?? "Email Marketing"}
        listViewId="iscritti"
        onNavigate={navigate}
        serviceSlug={serviceSlug}
      />
    );
  }

  if (viewId === "iscritti") {
    return (
      <GenericModuleView
        module={subscribersModule}
        viewId="iscritti"
        serviceColor={serviceColor}
        showToolbar
        moduleKeyOverride="marketing"
        serviceNameOverride={service?.name ?? "Email Marketing"}
      />
    );
  }

  if (viewId === "campagne") {
    return (
      <ServicePremiumSubView
        moduleKey="marketing"
        viewId="campagne"
        serviceName={service?.name ?? "Email Marketing"}
        serviceColor={serviceColor}
        serviceGradient={service?.gradient}
        badge={`${campaigns.length} campagne`}
        actions={
          <Stack direction="row" spacing={1}>
            <Tooltip title="Aggiorna">
              <IconButton onClick={loadCampaigns} sx={{ color: "#fff" }}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)} sx={{ bgcolor: "#fff", color: serviceColor, fontWeight: 700 }}>
              Nuova campagna
            </Button>
          </Stack>
        }
      >
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Paper sx={[shellPaperSx, { overflow: "auto" }]}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Nome</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Oggetto</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Stato</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Destinatari</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">
                    Azioni
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {campaigns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4, color: "text.secondary" }}>
                      Nessuna campagna. Creane una per iniziare.
                    </TableCell>
                  </TableRow>
                ) : (
                  campaigns.map((c) => (
                    <TableRow key={c.id} hover>
                      <TableCell>{c.name}</TableCell>
                      <TableCell>{c.subject}</TableCell>
                      <TableCell>
                        <Chip size="small" label={c.status} />
                      </TableCell>
                      <TableCell>{c.recipientCount}</TableCell>
                      <TableCell align="right">
                        {c.status === "DRAFT" && (
                          <Button
                            size="small"
                            startIcon={<SendIcon />}
                            disabled={sending === c.id}
                            onClick={() => handleSend(c.id)}
                          >
                            {sending === c.id ? "Invio…" : "Invia"}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Paper>
        )}

        <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Nuova campagna</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField label="Nome campagna" fullWidth size="small" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              <TextField label="Oggetto email" fullWidth size="small" value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} />
              <TextField label="Corpo HTML" fullWidth multiline rows={6} value={form.htmlBody} onChange={(e) => setForm((f) => ({ ...f, htmlBody: e.target.value }))} placeholder="<p>Ciao {{firstName}}, ...</p>" />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Annulla</Button>
            <Button variant="contained" onClick={handleCreate} disabled={!form.name || !form.subject}>
              Crea bozza
            </Button>
          </DialogActions>
        </Dialog>
      </ServicePremiumSubView>
    );
  }

  return (
    <GenericModuleView module={subscribersModule} viewId="elenco" serviceColor={serviceColor} showToolbar moduleKeyOverride="marketing" serviceNameOverride={service?.name ?? "Email Marketing"} />
  );
}
