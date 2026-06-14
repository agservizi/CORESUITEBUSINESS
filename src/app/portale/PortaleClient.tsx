"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Chip,
  CircularProgress,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  Divider,
  FormControlLabel,
  Checkbox,
  Alert,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { navigateResolved } from "@/lib/navigate-resolved";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AddIcon from "@mui/icons-material/Add";
import PaymentIcon from "@mui/icons-material/Payment";
import DescriptionIcon from "@mui/icons-material/Description";
import { jsonMutationHeaders } from "@/lib/csrf-client";
import { getShellTokens, shellPaperSx } from "@/theme/shell-tokens";
import ThemeModeToggle from "@/components/layout/ThemeModeToggle";
import AiContextTopBarButton from "@/components/ai/AiContextTopBarButton";
import { AppShellFooter } from "@/components/layout/app-shell";

interface PortaleClientProps {
  user: { id: string; email: string; name: string | null; role: string };
  children: React.ReactNode;
}

export default function PortaleClient({ user, children }: PortaleClientProps) {
  const router = useRouter();
  const [tickets, setTickets] = useState<Record<string, unknown>[]>([]);
  const [practices, setPractices] = useState<Record<string, unknown>[]>([]);
  const [documents, setDocuments] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [ticketOpen, setTicketOpen] = useState(false);
  const [leadOpen, setLeadOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [ticketForm, setTicketForm] = useState({ subject: "", message: "", type: "SUPPORT", priority: "MEDIUM", createLead: false });
  const [leadForm, setLeadForm] = useState({ title: "", message: "" });
  const [payAmount, setPayAmount] = useState("50");
  const [payDesc, setPayDesc] = useState("Pagamento servizi AG");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function loadAll() {
    setLoading(true);
    const [t, p, d] = await Promise.all([
      fetch("/api/portale/tickets").then((r) => r.json()),
      fetch("/api/portale/practices").then((r) => r.json()),
      fetch("/api/portale/documents").then((r) => r.json()),
    ]);
    setTickets(t.items || []);
    setPractices(p.items || []);
    setDocuments(d.items || []);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function createTicket() {
    if (!ticketForm.subject.trim()) return;
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/portale/tickets", {
        method: "POST",
        headers: jsonMutationHeaders(),
        body: JSON.stringify(ticketForm),
      });
      if (res.ok) {
        setTicketOpen(false);
        setTicketForm({ subject: "", message: "", type: "SUPPORT", priority: "MEDIUM", createLead: false });
        await loadAll();
        setMessage("Ticket creato con successo.");
      } else {
        const err = await res.json();
        setMessage(err.error || "Errore nella creazione del ticket");
      }
    } finally {
      setSaving(false);
    }
  }

  async function createLeadRequest() {
    if (!leadForm.title.trim()) return;
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/portale/leads", {
        method: "POST",
        headers: jsonMutationHeaders(),
        body: JSON.stringify(leadForm),
      });
      if (res.ok) {
        setLeadOpen(false);
        setLeadForm({ title: "", message: "" });
        setMessage("Richiesta inviata — il team commerciale ti contatterà a breve.");
      } else {
        const err = await res.json();
        setMessage(err.error || "Errore invio richiesta");
      }
    } finally {
      setSaving(false);
    }
  }

  async function startPayment() {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/portale/payments", {
        method: "POST",
        headers: jsonMutationHeaders(),
        body: JSON.stringify({ amount: payAmount, description: payDesc }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setMessage(data.error || "Pagamento non disponibile");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Box
      sx={(theme) => ({
        minHeight: "100vh",
        background: getShellTokens(theme).overlay,
        display: "flex",
        flexDirection: "column",
      })}
    >
      <Box sx={{ flex: 1, p: { xs: 2, md: 4 } }}>
      <Box sx={{ maxWidth: 960, mx: "auto" }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, flexWrap: "wrap", gap: 2 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Portale Cliente
            </Typography>
            <Typography color="text.secondary">
              Benvenuto, {user.name || user.email}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
            <AiContextTopBarButton />
            <ThemeModeToggle />
            <Button startIcon={<AddIcon />} variant="contained" size="small" onClick={() => setTicketOpen(true)}>
              Nuovo ticket
            </Button>
            <Button variant="outlined" size="small" onClick={() => setLeadOpen(true)}>
              Richiedi preventivo
            </Button>
            <Button startIcon={<PaymentIcon />} variant="outlined" size="small" onClick={() => setPayOpen(true)}>
              Paga online
            </Button>
            {user.role !== "CLIENTE" && (
              <Button startIcon={<ArrowBackIcon />} onClick={() => navigateResolved(router, "/dashboard")} variant="outlined" size="small">
                Service Hub
              </Button>
            )}
          </Box>
        </Box>

        {message && (
          <Alert severity={message.includes("successo") ? "success" : "info"} sx={{ mb: 2 }} onClose={() => setMessage("")}>
            {message}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper sx={[shellPaperSx, { p: 3, height: "100%" }]}>
                <Typography sx={{ fontWeight: 600, mb: 2 }}>I tuoi ticket</Typography>
                {tickets.length === 0 ? (
                  <Typography color="text.secondary" variant="body2">
                    Nessun ticket. Apri una richiesta con il pulsante Nuovo ticket.
                  </Typography>
                ) : (
                  tickets.map((t) => (
                    <Box key={String(t.id)} sx={(theme) => ({ mb: 1.5, pb: 1.5, borderBottom: getShellTokens(theme).border })}>
                      <Typography sx={{ fontWeight: 600, fontSize: "0.875rem" }}>
                        {String(t.subject)}
                      </Typography>
                      <Box sx={{ display: "flex", gap: 1, mt: 0.5 }}>
                        <Chip label={String(t.status).replace(/_/g, " ")} size="small" />
                        {t.code != null && (
                          <Chip label={String(t.code)} size="small" variant="outlined" />
                        )}
                      </Box>
                    </Box>
                  ))
                )}
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Paper sx={[shellPaperSx, { p: 3, height: "100%" }]}>
                <Typography sx={{ fontWeight: 600, mb: 2 }}>Le tue pratiche</Typography>
                {practices.length === 0 ? (
                  <Typography color="text.secondary" variant="body2">
                    Nessuna pratica in corso per il tuo profilo.
                  </Typography>
                ) : (
                  practices.map((p) => (
                    <Box key={String(p.id)} sx={(theme) => ({ mb: 1.5, pb: 1.5, borderBottom: getShellTokens(theme).border })}>
                      <Typography sx={{ fontWeight: 600, fontSize: "0.875rem" }}>
                        {String(p.practiceType)}
                      </Typography>
                      <Box sx={{ display: "flex", gap: 1, mt: 0.5 }}>
                        <Chip label={String(p.category || "—")} size="small" />
                        <Chip label={String(p.status)} size="small" variant="outlined" />
                      </Box>
                    </Box>
                  ))
                )}
              </Paper>
            </Grid>

            <Grid size={12}>
              <Paper sx={[shellPaperSx, { p: 3 }]}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                  <DescriptionIcon sx={{ color: "primary.light" }} />
                  <Typography sx={{ fontWeight: 600 }}>Documenti</Typography>
                </Box>
                {documents.length === 0 ? (
                  <Typography color="text.secondary" variant="body2">
                    Nessun documento disponibile al momento.
                  </Typography>
                ) : (
                  <List dense disablePadding>
                    {documents.map((doc, i) => (
                      <Box key={String(doc.id)}>
                        {i > 0 && <Divider sx={(theme) => ({ borderColor: getShellTokens(theme).borderColor })} />}
                        <ListItem
                          component="a"
                          href={String(doc.fileUrl)}
                          target="_blank"
                          rel="noopener"
                          sx={(theme) => ({ px: 0, "&:hover": { background: getShellTokens(theme).rowHover } })}
                        >
                          <ListItemText
                            primary={String(doc.fileName)}
                            secondary={new Date(String(doc.createdAt)).toLocaleDateString("it-IT")}
                            slotProps={{
                              primary: { sx: { fontSize: "0.875rem", fontWeight: 500 } },
                              secondary: { sx: { fontSize: "0.75rem" } },
                            }}
                          />
                        </ListItem>
                      </Box>
                    ))}
                  </List>
                )}
              </Paper>
            </Grid>
          </Grid>
        )}

        {children}
      </Box>

      <Dialog open={ticketOpen} onClose={() => setTicketOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nuovo ticket</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField
              fullWidth
              size="small"
              label="Oggetto *"
              value={ticketForm.subject}
              onChange={(e) => setTicketForm((p) => ({ ...p, subject: e.target.value }))}
            />
            <TextField
              select
              fullWidth
              size="small"
              label="Tipo"
              value={ticketForm.type}
              onChange={(e) => setTicketForm((p) => ({ ...p, type: e.target.value }))}
            >
              <MenuItem value="SUPPORT">Supporto</MenuItem>
              <MenuItem value="TECH">Tecnico</MenuItem>
              <MenuItem value="ADMIN">Amministrativo</MenuItem>
            </TextField>
            <TextField
              select
              fullWidth
              size="small"
              label="Priorità"
              value={ticketForm.priority}
              onChange={(e) => setTicketForm((p) => ({ ...p, priority: e.target.value }))}
            >
              <MenuItem value="LOW">Bassa</MenuItem>
              <MenuItem value="MEDIUM">Media</MenuItem>
              <MenuItem value="HIGH">Alta</MenuItem>
              <MenuItem value="URGENT">Urgente</MenuItem>
            </TextField>
            <TextField
              fullWidth
              multiline
              rows={4}
              size="small"
              label="Messaggio"
              value={ticketForm.message}
              onChange={(e) => setTicketForm((p) => ({ ...p, message: e.target.value }))}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={ticketForm.createLead}
                  onChange={(e) => setTicketForm((p) => ({ ...p, createLead: e.target.checked }))}
                />
              }
              label="Crea anche un lead commerciale per follow-up"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTicketOpen(false)}>Annulla</Button>
          <Button variant="contained" onClick={createTicket} disabled={saving}>
            {saving ? "Invio…" : "Invia ticket"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={leadOpen} onClose={() => setLeadOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Richiedi preventivo / recall</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField
              fullWidth
              size="small"
              label="Oggetto richiesta *"
              value={leadForm.title}
              onChange={(e) => setLeadForm((p) => ({ ...p, title: e.target.value }))}
            />
            <TextField
              fullWidth
              multiline
              rows={4}
              size="small"
              label="Dettagli"
              value={leadForm.message}
              onChange={(e) => setLeadForm((p) => ({ ...p, message: e.target.value }))}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLeadOpen(false)}>Annulla</Button>
          <Button variant="contained" onClick={createLeadRequest} disabled={saving}>
            {saving ? "Invio…" : "Invia richiesta"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={payOpen} onClose={() => setPayOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Paga con Stripe</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField
              fullWidth
              size="small"
              label="Importo €"
              type="number"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
            />
            <TextField
              fullWidth
              size="small"
              label="Descrizione"
              value={payDesc}
              onChange={(e) => setPayDesc(e.target.value)}
            />
            <Typography variant="caption" color="text.secondary">
              Verrai reindirizzato al checkout Stripe sicuro.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPayOpen(false)}>Annulla</Button>
          <Button variant="contained" startIcon={<PaymentIcon />} onClick={startPayment} disabled={saving}>
            {saving ? "Reindirizzamento…" : "Procedi al pagamento"}
          </Button>
        </DialogActions>
      </Dialog>
      </Box>
      <AppShellFooter tagline="Portale Cliente" />
    </Box>
  );
}
