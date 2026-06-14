"use client";

import { Alert, Box, Typography } from "@mui/material";
import type { ClientOption } from "../ClientPicker";
import {
  buildOnBehalfFromName,
  buildOnBehalfSubject,
  clientReplyToEmail,
  formatFromHeader,
} from "@/lib/mail/posta-on-behalf";

import type { PostaChannel } from "./posta-utils";

interface Props {
  client?: ClientOption | null;
  orgFromName?: string;
  orgFromAddress?: string | null;
  subject: string;
  channel?: PostaChannel;
}

export default function PostaOnBehalfPreview({
  client,
  orgFromName,
  orgFromAddress,
  subject,
  channel = "email",
}: Props) {
  if (!client?.id || !orgFromName) return null;

  const onBehalfClient = {
    name: client.name,
    companyName: client.companyName,
    email: client.email,
  };
  const visibleFrom = formatFromHeader(
    buildOnBehalfFromName(orgFromName, onBehalfClient),
    orgFromAddress || "casella dello studio"
  );
  const replyTo = clientReplyToEmail(onBehalfClient);
  const previewSubject = subject.trim()
    ? buildOnBehalfSubject(subject, onBehalfClient)
    : `[Per conto di ${client.companyName || client.name}] …`;

  return (
    <Alert severity="info" sx={{ py: 1 }}>
      <Typography variant="caption" sx={{ fontWeight: 700, display: "block", mb: 0.75 }}>
        Invio {channel === "pec" ? "PEC" : "email"} per conto del cliente
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
        Mittente visibile: {visibleFrom}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
        Oggetto inviato: {previewSubject}
      </Typography>
      {replyTo ? (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
          Reply-To (risposte al cliente): {replyTo}
        </Typography>
      ) : (
        <Box sx={{ mt: 0.5 }}>
          <Typography variant="caption" color="warning.main">
            Aggiungi un&apos;email in anagrafica cliente per impostare Reply-To.
          </Typography>
        </Box>
      )}
    </Alert>
  );
}
