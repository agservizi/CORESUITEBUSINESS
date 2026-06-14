"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Paper, Table, TableHead, TableRow, TableCell, TableBody, Chip, CircularProgress, IconButton, Tooltip, Typography, LinearProgress, Box,
} from "@mui/material";
import PictureAsPdfOutlined from "@mui/icons-material/PictureAsPdfOutlined";
import ServicePremiumSubView from "../service-shell/ServicePremiumSubView";
import { shellPaperSx } from "@/theme/shell-tokens";
import PostaPecTimeline from "./PostaPecTimeline";
import {
  clientLabel,
  pdfUrlForMessage,
  pecProgress,
  statusColor,
  statusLabel,
  type PostaMessageRow,
} from "./posta-utils";
import { fetchPostaJson } from "./posta-fetch";

interface Props {
  serviceColor: string;
  serviceGradient?: string;
  onOpenMessage: (message: PostaMessageRow) => void;
}

export default function PostaStoricoView({ serviceColor, serviceGradient, onOpenMessage }: Props) {
  const [messages, setMessages] = useState<PostaMessageRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchPostaJson<{ messages?: PostaMessageRow[] }>("/api/platform/posta-telematica/messages");
      setMessages(data.messages ?? []);
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <ServicePremiumSubView
      moduleKey="posta-telematica"
      viewId="storico"
      serviceName="Posta Telematica"
      serviceColor={serviceColor}
      serviceGradient={serviceGradient}
      badge={`${messages.length} invii`}
    >
      {loading ? (
        <CircularProgress />
      ) : (
        <Paper sx={[shellPaperSx, { overflow: "auto" }]}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Data</TableCell>
                <TableCell>Cliente</TableCell>
                <TableCell>Canale</TableCell>
                <TableCell>Destinatario</TableCell>
                <TableCell>Oggetto</TableCell>
                <TableCell>Stato / PEC</TableCell>
                <TableCell align="right">PDF</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {messages.map((m) => (
                <TableRow
                  key={m.id}
                  hover
                  sx={{ cursor: "pointer" }}
                  onClick={() => onOpenMessage(m)}
                >
                  <TableCell>
                    {m.createdAt
                      ? new Date(m.createdAt).toLocaleString("it-IT", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </TableCell>
                  <TableCell>{clientLabel(m.client)}</TableCell>
                  <TableCell>{m.channel.toUpperCase()}</TableCell>
                  <TableCell>{m.recipientEmail}</TableCell>
                  <TableCell>{m.subject}</TableCell>
                  <TableCell sx={{ minWidth: 220 }}>
                    <Chip size="small" label={statusLabel(m.status)} color={statusColor(m.status)} sx={{ mb: m.channel === "pec" && m.status === "sent" ? 1 : 0 }} />
                    {m.channel === "pec" && m.status === "sent" && (
                      <Box>
                        <LinearProgress
                          variant="determinate"
                          value={pecProgress(m)}
                          sx={{
                            height: 4,
                            borderRadius: 2,
                            mb: 0.75,
                            bgcolor: `${serviceColor}15`,
                            "& .MuiLinearProgress-bar": { bgcolor: serviceColor },
                          }}
                        />
                        <PostaPecTimeline message={m} compact />
                      </Box>
                    )}
                  </TableCell>
                  <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                    <Tooltip title="Scarica ricevuta PDF">
                      <IconButton
                        size="small"
                        href={pdfUrlForMessage(m)}
                        target="_blank"
                        aria-label="Scarica ricevuta PDF"
                      >
                        <PictureAsPdfOutlined fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {!messages.length && (
                <TableRow>
                  <TableCell colSpan={7}>
                    <Typography color="text.secondary" sx={{ py: 2 }}>
                      Nessun invio registrato.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Paper>
      )}
    </ServicePremiumSubView>
  );
}
