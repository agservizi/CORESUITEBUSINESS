"use client";

import { useMemo, useState } from "react";
import {
  Paper,
  Stack,
  TextField,
  Button,
  Alert,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  Grid,
  Box,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  alpha,
} from "@mui/material";
import EmailOutlined from "@mui/icons-material/EmailOutlined";
import MarkEmailReadOutlined from "@mui/icons-material/MarkEmailReadOutlined";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import ClientPicker, { type ClientOption } from "../ClientPicker";
import PostaConfigBanner from "./PostaConfigBanner";
import PostaOnBehalfPreview from "./PostaOnBehalfPreview";
import ServicePremiumSubView from "../service-shell/ServicePremiumSubView";
import { shellPaperSx } from "@/theme/shell-tokens";
import { jsonMutationHeaders } from "@/lib/csrf-client";
import type { PecStatus, PostaChannel } from "./posta-utils";
import { channelMailStatus } from "./posta-utils";
import { fetchPostaJson } from "./posta-fetch";

interface Props {
  serviceColor: string;
  serviceGradient?: string;
  pecStatus: PecStatus | null;
  onSent: () => void;
}

export default function PostaSendComposer({ serviceColor, serviceGradient, pecStatus, onSent }: Props) {
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(null);
  const [form, setForm] = useState({
    clientId: "",
    channel: "email" as PostaChannel,
    recipientEmail: "",
    subject: "",
    body: "",
  });

  const activeMail = useMemo(
    () => channelMailStatus(pecStatus, form.channel),
    [pecStatus, form.channel]
  );

  const canSend =
    Boolean(form.clientId && form.recipientEmail.trim() && form.subject.trim() && form.body.trim()) &&
    Boolean(activeMail?.configured);

  function handleClientChange(clientId: string, client?: ClientOption) {
    setSelectedClient(client ?? null);
    setForm((f) => ({
      ...f,
      clientId,
      recipientEmail: f.recipientEmail || client?.email || "",
    }));
  }

  async function sendMessage() {
    setSendError(null);
    setSending(true);
    try {
      await fetchPostaJson("/api/platform/posta-telematica/messages", {
        method: "POST",
        headers: jsonMutationHeaders(),
        body: JSON.stringify(form),
      });
      onSent();
    } catch (e) {
      setSendError(e instanceof Error ? e.message : "Invio non riuscito");
    } finally {
      setSending(false);
    }
  }

  return (
    <ServicePremiumSubView
      moduleKey="posta-telematica"
      viewId="invio"
      serviceName="Posta Telematica"
      serviceColor={serviceColor}
      serviceGradient={serviceGradient}
      showKpiStrip={false}
    >
      <Grid container spacing={2.5} sx={{ alignItems: "flex-start" }}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <Stack spacing={2.5}>
            <Paper sx={[shellPaperSx, { p: 2.5 }]}>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                Canale di invio
              </Typography>
              <ToggleButtonGroup
                exclusive
                fullWidth
                size="small"
                value={form.channel}
                onChange={(_, v) => v && setForm((f) => ({ ...f, channel: v as PostaChannel }))}
                sx={{
                  mb: 1.5,
                  "& .MuiToggleButton-root": {
                    py: 1.25,
                    fontWeight: 700,
                    border: `1px solid ${alpha(serviceColor, 0.3)}`,
                  },
                  "& .Mui-selected": {
                    bgcolor: `${serviceColor}18 !important`,
                    color: `${serviceColor} !important`,
                  },
                }}
              >
                <ToggleButton value="email">
                  <EmailOutlined sx={{ mr: 0.75, fontSize: 18 }} /> Email
                </ToggleButton>
                <ToggleButton value="pec">
                  <MarkEmailReadOutlined sx={{ mr: 0.75, fontSize: 18 }} /> PEC
                </ToggleButton>
              </ToggleButtonGroup>
              <Typography variant="caption" color="text.secondary">
                {form.channel === "pec"
                  ? "Invio certificato con ricevute di accettazione e consegna."
                  : `Email ordinaria${activeMail?.fromAddress ? ` da ${activeMail.fromAddress}` : ""}.`}
              </Typography>
            </Paper>

            <Paper sx={[shellPaperSx, { p: 2.5 }]}>
              <Typography sx={{ fontWeight: 700, mb: 2 }}>Componi messaggio</Typography>
              <Stack spacing={2.5}>
                <ClientPicker
                  value={form.clientId}
                  onChange={handleClientChange}
                  required
                  allowQuickCreate
                />
                <TextField
                  size="small"
                  label="Destinatario"
                  value={form.recipientEmail}
                  onChange={(e) => setForm((f) => ({ ...f, recipientEmail: e.target.value }))}
                  helperText={
                    form.channel === "pec"
                      ? "Indirizzo PEC del destinatario"
                      : "Indirizzo email del destinatario"
                  }
                  required
                  fullWidth
                />
                <TextField
                  size="small"
                  label="Oggetto"
                  value={form.subject}
                  onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                  required
                  fullWidth
                />
                <TextField
                  size="small"
                  multiline
                  rows={12}
                  label="Messaggio"
                  value={form.body}
                  onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                  required
                  fullWidth
                />
              </Stack>
            </Paper>
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, lg: 5 }}>
          <Paper
            sx={[
              shellPaperSx,
              {
                p: 2.5,
                position: { lg: "sticky" },
                top: { lg: 16 },
              },
            ]}
          >
            <Typography sx={{ fontWeight: 700, mb: 1.5 }}>Riepilogo invio</Typography>

            <PostaConfigBanner status={pecStatus} channel={form.channel} />

            {selectedClient ? (
              <PostaOnBehalfPreview
                client={selectedClient}
                orgFromName={activeMail?.fromName}
                orgFromAddress={activeMail?.fromAddress}
                subject={form.subject}
                channel={form.channel}
              />
            ) : (
              <Alert severity="info" sx={{ mb: 2, py: 0.75 }}>
                Seleziona un cliente per vedere mittente e Reply-To personalizzati.
              </Alert>
            )}

            <Divider sx={{ my: 2 }} />

            <List dense disablePadding sx={{ mb: 2 }}>
              {[
                form.channel === "pec" ? "Ricevute PEC tracciate automaticamente" : "Conferma invio email",
                "Nominativo cliente in mittente visibile",
                "Prefisso oggetto e nota nel testo",
                "PDF ricevuta salvato sul cliente",
              ].map((line) => (
                <ListItem key={line} disablePadding sx={{ py: 0.35 }}>
                  <ListItemIcon sx={{ minWidth: 28 }}>
                    <CheckCircleOutlinedIcon sx={{ fontSize: 16, color: serviceColor }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={line}
                    slotProps={{ primary: { variant: "caption", color: "text.secondary" } }}
                  />
                </ListItem>
              ))}
            </List>

            {form.recipientEmail && (
              <Box sx={{ mb: 2, p: 1.5, borderRadius: 2, bgcolor: "action.hover" }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                  Destinatario
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, wordBreak: "break-all" }}>
                  {form.recipientEmail}
                </Typography>
                {form.subject && (
                  <>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                      Oggetto
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {form.subject}
                    </Typography>
                  </>
                )}
              </Box>
            )}

            {sendError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {sendError}
              </Alert>
            )}

            <Button
              variant="contained"
              fullWidth
              size="large"
              sx={{ bgcolor: serviceColor, fontWeight: 700, py: 1.25 }}
              onClick={sendMessage}
              disabled={sending || !canSend}
            >
              {sending
                ? "Invio in corso…"
                : form.channel === "pec"
                  ? "Invia PEC e genera ricevuta PDF"
                  : "Invia email e genera ricevuta PDF"}
            </Button>

            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
              {form.channel === "pec"
                ? "Invio dalla casella PEC dello studio, per conto del cliente."
                : "Invio dalla casella email dello studio, per conto del cliente."}
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </ServicePremiumSubView>
  );
}
