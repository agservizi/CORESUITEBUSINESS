"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Dialog, DialogContent, Box, Typography, TextField, IconButton, Button,
  Stack, Chip, Alert, CircularProgress, alpha,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SendIcon from "@mui/icons-material/Send";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import SummarizeIcon from "@mui/icons-material/Summarize";
import LightbulbIcon from "@mui/icons-material/Lightbulb";
import EditIcon from "@mui/icons-material/Edit";
import WbSunnyIcon from "@mui/icons-material/WbSunny";
import RecordVoiceOverIcon from "@mui/icons-material/RecordVoiceOver";
import type { AiAction, AiExecutedAction } from "@/lib/ai/types";
import { callAiAssist, fetchAiStatus } from "@/lib/ai/client";
import { shellDialogPaperSx } from "@/theme/shell-tokens";
import type { AiAssistantTarget } from "@/context/AiAssistantProvider";

interface Message {
  role: "user" | "assistant";
  text: string;
  executedActions?: AiExecutedAction[];
}

function notifyDataMutated(moduleKey?: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("coresuite:data-mutated", { detail: { moduleKey } })
  );
}

interface Props {
  open: boolean;
  target: AiAssistantTarget | null;
  onClose: () => void;
}

const QUICK_BY_SCOPE: Partial<Record<string, { action: AiAction; label: string; icon: typeof SummarizeIcon }[]>> = {
  hub: [
    { action: "briefing", label: "Briefing giornata", icon: WbSunnyIcon },
    { action: "suggest", label: "Cosa fare ora", icon: LightbulbIcon },
  ],
  operations: [
    { action: "briefing", label: "Briefing operativo", icon: WbSunnyIcon },
    { action: "suggest", label: "Priorità", icon: LightbulbIcon },
  ],
  business: [
    { action: "summarize", label: "Riassumi cliente", icon: SummarizeIcon },
    { action: "suggest", label: "Prossime azioni", icon: LightbulbIcon },
    { action: "draft", label: "Bozza email", icon: EditIcon },
  ],
  tickets: [
    { action: "summarize", label: "Riassumi ticket", icon: SummarizeIcon },
    { action: "triage", label: "Triage", icon: LightbulbIcon },
    { action: "draft", label: "Bozza risposta", icon: EditIcon },
  ],
  express: [
    { action: "script", label: "Script vendita", icon: RecordVoiceOverIcon },
    { action: "suggest", label: "Upsell", icon: LightbulbIcon },
    { action: "summarize", label: "Profilo cliente", icon: SummarizeIcon },
  ],
  finance: [
    { action: "briefing", label: "Briefing cassa", icon: WbSunnyIcon },
    { action: "summarize", label: "Riassumi movimento", icon: SummarizeIcon },
    { action: "suggest", label: "Azioni finanza", icon: LightbulbIcon },
  ],
  opportunities: [
    { action: "suggest", label: "Coach pipeline", icon: LightbulbIcon },
    { action: "draft", label: "Follow-up", icon: EditIcon },
  ],
  practices: [
    { action: "summarize", label: "Riassumi pratica", icon: SummarizeIcon },
    { action: "extract", label: "Estrai campi", icon: LightbulbIcon },
    { action: "suggest", label: "Checklist", icon: LightbulbIcon },
  ],
  marketing: [
    { action: "draft", label: "Bozza campagna", icon: EditIcon },
    { action: "improve", label: "Migliora testo", icon: EditIcon },
  ],
  curriculum: [
    { action: "improve", label: "Migliora CV", icon: EditIcon },
    { action: "draft", label: "Lettera presentazione", icon: EditIcon },
  ],
  portal: [
    { action: "chat", label: "Chiedi assistenza", icon: LightbulbIcon },
    { action: "summarize", label: "Stato pratiche", icon: SummarizeIcon },
  ],
};

export default function AiAssistantDialog({ open, target, onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [configured, setConfigured] = useState<boolean | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) fetchAiStatus().then((s) => setConfigured(s.configured));
  }, [open]);

  useEffect(() => {
    if (!open) {
      setMessages([]);
      setInput("");
      setError("");
      return;
    }
    if (target?.initialMessage) setInput(target.initialMessage);
    if (target?.initialAction && target.initialAction !== "chat") {
      void runAction(target.initialAction, target.initialMessage);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, target?.scope, target?.entityId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const runAction = useCallback(
    async (action: AiAction, message?: string) => {
      if (!target) return;
      setLoading(true);
      setError("");
      const userText = message || input || action;
      if (action === "chat" || message) {
        setMessages((m) => [...m, { role: "user", text: userText }]);
      }
      try {
        const res = await callAiAssist({
          scope: target.scope,
          action,
          message: message || input || undefined,
          entityId: target.entityId,
          moduleKey: target.moduleKey,
          context: target.context,
        });
        setMessages((m) => [
          ...m,
          { role: "assistant", text: res.text, executedActions: res.executedActions },
        ]);
        if (res.executedActions?.some((a) => a.success)) {
          const mk =
            res.executedActions.find((a) => a.moduleKey)?.moduleKey ?? target.moduleKey;
          notifyDataMutated(mk);
        }
        setInput("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Errore");
      } finally {
        setLoading(false);
      }
    },
    [target, input]
  );

  const quick = target ? QUICK_BY_SCOPE[target.scope] ?? QUICK_BY_SCOPE.hub! : [];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{ paper: { sx: [shellDialogPaperSx, { height: "min(640px, 85vh)", display: "flex", flexDirection: "column" }] } }}
    >
      <Box
        sx={{
          px: 2.5,
          py: 2,
          borderBottom: 1,
          borderColor: "divider",
          background: "linear-gradient(135deg, rgba(99,102,241,0.15) 0%, transparent 100%)",
          display: "flex",
          alignItems: "center",
          gap: 1.5,
        }}
      >
        <AutoAwesomeIcon sx={{ color: "#6366f1" }} />
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontWeight: 800, fontSize: "1rem" }}>
            Coresuite AI
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {target?.title || target?.scope || "Assistente"}
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose}><CloseIcon /></IconButton>
      </Box>

      <DialogContent sx={{ flex: 1, display: "flex", flexDirection: "column", p: 0, overflow: "hidden" }}>
        {configured === false && (
          <Alert severity="warning" sx={{ m: 2, borderRadius: 2 }}>
            AI non configurata. Aggiungi <strong>GROQ_API_KEY</strong> nel file <code>.env</code> e riavvia il server.
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mx: 2, mt: 2, borderRadius: 2 }} onClose={() => setError("")}>
            {error}
          </Alert>
        )}

        <Box sx={{ flex: 1, overflow: "auto", px: 2, py: 1.5 }}>
          {messages.length === 0 && !loading && (
            <Box sx={{ py: 4, textAlign: "center" }}>
              <AutoAwesomeIcon sx={{ fontSize: 40, color: alpha("#6366f1", 0.4), mb: 1 }} />
              <Typography color="text.secondary" sx={{ fontSize: "0.875rem", mb: 2 }}>
                Chiedi qualsiasi cosa o dai comandi operativi — es. &quot;completa la pratica in sospeso&quot;.
              </Typography>
              <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", justifyContent: "center", gap: 1 }}>
                {quick.map((q) => (
                  <Chip
                    key={q.label}
                    icon={<q.icon sx={{ fontSize: "16px !important" }} />}
                    label={q.label}
                    onClick={() => runAction(q.action)}
                    sx={{ fontWeight: 600 }}
                  />
                ))}
              </Stack>
            </Box>
          )}

          <Stack spacing={1.5}>
            {messages.map((m, i) => (
              <Box
                key={i}
                sx={{
                  alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "90%",
                  p: 1.5,
                  borderRadius: 2.5,
                  bgcolor: m.role === "user" ? alpha("#6366f1", 0.12) : alpha("#22c55e", 0.08),
                  border: 1,
                  borderColor: m.role === "user" ? alpha("#6366f1", 0.2) : "divider",
                }}
              >
                <Typography sx={{ fontSize: "0.875rem", whiteSpace: "pre-wrap" }}>{m.text}</Typography>
                {m.executedActions?.some((a) => a.success) && (
                  <Stack direction="row" spacing={0.5} sx={{ mt: 1, flexWrap: "wrap", gap: 0.5 }}>
                    {m.executedActions.filter((a) => a.success).map((a, j) => (
                      <Chip key={j} size="small" label={a.summary} color="success" variant="outlined" />
                    ))}
                  </Stack>
                )}
              </Box>
            ))}
            {loading && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 1 }}>
                <CircularProgress size={18} />
                <Typography variant="caption" color="text.secondary">Elaborazione…</Typography>
              </Box>
            )}
            <div ref={bottomRef} />
          </Stack>
        </Box>

        <Box sx={{ p: 2, borderTop: 1, borderColor: "divider" }}>
          <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: "wrap", gap: 0.5 }}>
            {messages.length > 0 &&
              quick.slice(0, 3).map((q) => (
                <Chip key={q.label} size="small" label={q.label} onClick={() => runAction(q.action)} />
              ))}
          </Stack>
          <Stack direction="row" spacing={1} sx={{ alignItems: "flex-end" }}>
            <TextField
              fullWidth
              size="small"
              multiline
              maxRows={4}
              placeholder="Scrivi un messaggio…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (input.trim() && !loading) runAction("chat");
                }
              }}
              disabled={loading || configured === false}
            />
            <Button
              variant="contained"
              onClick={() => runAction("chat")}
              disabled={loading || !input.trim() || configured === false}
              sx={{ minWidth: 44, bgcolor: "#6366f1" }}
            >
              <SendIcon fontSize="small" />
            </Button>
          </Stack>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
