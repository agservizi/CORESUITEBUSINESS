"use client";

import { Stack, Chip, Typography, Alert } from "@mui/material";
import type { PecStatus, PostaChannel } from "./posta-utils";
import { channelMailStatus } from "./posta-utils";

interface Props {
  status: PecStatus | null;
  channel?: PostaChannel;
}

export default function PostaConfigBanner({ status, channel = "pec" }: Props) {
  if (!status) return null;

  const mail = channelMailStatus(status, channel);
  if (!mail) return null;

  const channelLabel = channel === "pec" ? "PEC certificata" : "Email";

  return (
    <Stack spacing={1}>
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
        <Chip size="small" label={channelLabel} color="primary" variant="outlined" />
        <Chip
          size="small"
          label={mail.configured ? "Casella operativa" : "Casella non configurata"}
          color={mail.configured ? "success" : "error"}
        />
        {channel === "pec" && (
          <Chip
            size="small"
            label={status.imapConfigured ? "Ricevute attive" : "Ricevute non attive"}
            color={status.imapConfigured ? "success" : "warning"}
          />
        )}
      </Stack>
      {mail.fromAddress && (
        <Typography variant="caption" color="text.secondary">
          Mittente {channelLabel.toLowerCase()}: {mail.fromName} &lt;{mail.fromAddress}&gt;
          {mail.smtpHost ? ` · ${mail.smtpHost}` : ""}
        </Typography>
      )}
      {!mail.configured && (
        <Alert severity="warning" sx={{ py: 0.5 }}>
          {channel === "pec"
            ? "Configura la casella PEC per abilitare gli invii certificati."
            : "Configura Resend (RESEND_API_KEY) e MAIL_FROM_ADDRESS per le email ordinarie."}
        </Alert>
      )}
    </Stack>
  );
}
