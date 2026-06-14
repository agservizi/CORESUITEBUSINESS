"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  alpha,
} from "@mui/material";
import PeopleIcon from "@mui/icons-material/People";
import LinkIcon from "@mui/icons-material/Link";
import { apiFetch, readJsonResponse } from "@/lib/fetch-client";
import ClientPicker from "../ClientPicker";

interface PortalRow {
  id: string;
  status: string;
  pickupMysqlId?: number | null;
  createdAt: string;
  client: { id: string; name: string; email?: string | null; phone?: string | null };
}

interface Props {
  serviceColor: string;
}

export default function ExpressPortalView({ serviceColor }: Props) {
  const [items, setItems] = useState<PortalRow[]>([]);
  const [linkOpen, setLinkOpen] = useState(false);
  const [clientId, setClientId] = useState("");
  const [pickupMysqlId, setPickupMysqlId] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/platform/express?view=portale", { credentials: "include" });
    const data = await readJsonResponse<{ items: PortalRow[] }>(res);
    if (res.ok && data) setItems(data.items || []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function linkClient() {
    if (!clientId) return;
    setSaving(true);
    const res = await apiFetch("/api/platform/express", {
      method: "POST",
      body: JSON.stringify({
        action: "linkPortal",
        clientId,
        pickupMysqlId: pickupMysqlId ? Number(pickupMysqlId) : undefined,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setLinkOpen(false);
      setClientId("");
      setPickupMysqlId("");
      load();
    }
  }

  async function toggleStatus(row: PortalRow) {
    const newStatus = row.status === "active" ? "disabled" : "active";
    const res = await apiFetch("/api/platform/express", {
      method: "POST",
      body: JSON.stringify({ action: "updatePortal", id: row.id, status: newStatus }),
    });
    if (res.ok) load();
  }

  async function unlinkClient(id: string) {
    if (!confirm("Scollegare questo cliente dal portale?")) return;
    const res = await apiFetch("/api/platform/express", {
      method: "POST",
      body: JSON.stringify({ action: "unlinkPortal", id }),
    });
    if (res.ok) load();
  }

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3, flexWrap: "wrap", gap: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <PeopleIcon sx={{ color: serviceColor, fontSize: 32 }} />
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: "1.25rem" }}>Portale clienti Express</Typography>
            <Typography variant="body2" color="text.secondary">
              {items.length} clienti collegati al portale ritiro
            </Typography>
          </Box>
        </Box>
        <Button
          variant="outlined"
          href="/portale/express"
          target="_blank"
          sx={{ mr: 1 }}
        >
          Apri portale cliente
        </Button>
        <Button
          variant="contained"
          startIcon={<LinkIcon />}
          onClick={() => setLinkOpen(true)}
          sx={{ background: serviceColor }}
        >
          Collega cliente
        </Button>
      </Box>

      <Card variant="outlined" sx={{ borderColor: alpha(serviceColor, 0.25) }}>
        <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Cliente</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Telefono</TableCell>
                <TableCell>ID ritiro MySQL</TableCell>
                <TableCell>Stato</TableCell>
                <TableCell align="right">Attivo</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((row) => (
                <TableRow key={row.id}>
                  <TableCell sx={{ fontWeight: 600 }}>{row.client.name}</TableCell>
                  <TableCell>{row.client.email || "—"}</TableCell>
                  <TableCell>{row.client.phone || "—"}</TableCell>
                  <TableCell>{row.pickupMysqlId ?? "—"}</TableCell>
                  <TableCell>
                    <Chip
                      label={row.status === "active" ? "Attivo" : "Disabilitato"}
                      size="small"
                      color={row.status === "active" ? "success" : "default"}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Switch
                      checked={row.status === "active"}
                      onChange={() => toggleStatus(row)}
                      size="small"
                    />
                    <Button size="small" color="error" onClick={() => unlinkClient(row.id)}>
                      Scollega
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={linkOpen} onClose={() => setLinkOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Collega cliente al portale</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            <ClientPicker value={clientId} onChange={setClientId} label="Cliente" required />
            <TextField
              fullWidth
              size="small"
              type="number"
              label="ID ritiro MySQL (opzionale)"
              value={pickupMysqlId}
              onChange={(e) => setPickupMysqlId(e.target.value)}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLinkOpen(false)}>Annulla</Button>
          <Button
            variant="contained"
            onClick={linkClient}
            disabled={saving || !clientId}
            sx={{ background: serviceColor }}
          >
            {saving ? "Collegamento…" : "Collega"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
