"use client";

import {
  Drawer, Box, Typography, Stack, Chip, IconButton, Divider, Button,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import PictureAsPdfOutlined from "@mui/icons-material/PictureAsPdfOutlined";
import PostaPecTimeline from "./PostaPecTimeline";
import {
  clientLabel,
  pdfUrlForMessage,
  statusColor,
  statusLabel,
  type PostaMessageRow,
} from "./posta-utils";

interface Props {
  message: PostaMessageRow | null;
  open: boolean;
  onClose: () => void;
  serviceColor?: string;
}

export default function PostaMessageDrawer({ message, open, onClose, serviceColor = "#7c3aed" }: Props) {
  if (!message) return null;

  return (
    <Drawer anchor="right" open={open} onClose={onClose} slotProps={{ paper: { sx: { width: { xs: "100%", sm: 440 } } } }}>
      <Box sx={{ p: 2.5, display: "flex", flexDirection: "column", height: "100%" }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
          <Box sx={{ minWidth: 0, pr: 1 }}>
            <Typography variant="overline" color="text.secondary">
              Dettaglio invio
            </Typography>
            <Typography sx={{ fontWeight: 800, fontSize: "1.1rem" }}>{message.subject}</Typography>
          </Box>
          <IconButton onClick={onClose} aria-label="Chiudi">
            <CloseIcon />
          </IconButton>
        </Box>

        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          <Chip size="small" label={message.channel.toUpperCase()} />
          <Chip size="small" label={statusLabel(message.status)} color={statusColor(message.status)} />
        </Stack>

        <Stack spacing={1.5} sx={{ mb: 2 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Cliente
            </Typography>
            <Typography sx={{ fontWeight: 600 }}>{clientLabel(message.client)}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Destinatario
            </Typography>
            <Typography sx={{ fontWeight: 600 }}>{message.recipientEmail}</Typography>
          </Box>
          {message.messageIdHeader && (
            <Box>
              <Typography variant="caption" color="text.secondary">
                Message-ID
              </Typography>
              <Typography variant="body2" sx={{ wordBreak: "break-all" }}>
                {message.messageIdHeader}
              </Typography>
            </Box>
          )}
          {message.errorMessage && (
            <Box>
              <Typography variant="caption" color="error">
                Errore
              </Typography>
              <Typography variant="body2" color="error.main">
                {message.errorMessage}
              </Typography>
            </Box>
          )}
        </Stack>

        <Divider sx={{ mb: 2 }} />

        <Typography sx={{ fontWeight: 700, mb: 1.5 }}>
          {message.channel === "pec" ? "Tracciamento ricevute PEC" : "Stato invio"}
        </Typography>
        <PostaPecTimeline message={message} />

        <Divider sx={{ my: 2 }} />

        <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>
          Messaggio
        </Typography>
        <Typography
          variant="body2"
          sx={{
            flex: 1,
            overflow: "auto",
            whiteSpace: "pre-wrap",
            bgcolor: "action.hover",
            p: 1.5,
            borderRadius: 2,
            mb: 2,
          }}
        >
          {message.body}
        </Typography>

        <Button
          variant="contained"
          startIcon={<PictureAsPdfOutlined />}
          href={pdfUrlForMessage(message)}
          target="_blank"
          sx={{ bgcolor: serviceColor }}
        >
          Scarica ricevuta PDF
        </Button>
      </Box>
    </Drawer>
  );
}
