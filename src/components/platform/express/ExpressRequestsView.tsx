"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
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
  MenuItem,
  Fab,
  alpha,
} from "@mui/material";
import AssignmentIcon from "@mui/icons-material/Assignment";
import AddIcon from "@mui/icons-material/Add";
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";
import { apiFetch, readJsonResponse } from "@/lib/fetch-client";
import { AppDateField } from "@/components/layout/app-shell";
import ClientPicker from "../ClientPicker";
import { money } from "./express-utils";

interface RequestRow {
  id: string;
  title: string;
  requestType: string;
  status: string;
  createdAt: string;
  depositAmount?: number | string | null;
  installments?: number | null;
  paymentMethod?: string | null;
  desiredDate?: string | null;
  clientNotes?: string | null;
  internalNotes?: string | null;
  client?: { id: string; name: string; email?: string | null } | null;
  product?: { id: string; name: string; price?: number | string } | null;
  handledBy?: { name: string } | null;
}

interface ProductOption {
  id: string;
  name: string;
}

interface Props {
  serviceColor: string;
}

const REQUEST_TYPES = [
  { value: "Purchase", label: "Acquisto" },
  { value: "Reservation", label: "Prenotazione" },
  { value: "Deposit", label: "Acconto" },
  { value: "Installment", label: "Rateale" },
  { value: "Support", label: "Supporto" },
  { value: "Preorder", label: "Preordine" },
  { value: "Repair", label: "Riparazione" },
  { value: "Info", label: "Informazioni" },
];

const STATUS_OPTIONS = [
  { value: "Pending", label: "In attesa" },
  { value: "InProgress", label: "In lavorazione" },
  { value: "Completed", label: "Completata" },
  { value: "Cancelled", label: "Annullata" },
];

function statusChipColor(status: string): "success" | "error" | "warning" | "default" {
  if (status === "Completed") return "success";
  if (status === "Cancelled") return "error";
  if (status === "InProgress") return "warning";
  return "default";
}

const emptyRequest = () => ({
  title: "",
  clientId: "",
  productId: "",
  requestType: "Purchase",
  status: "Pending",
  depositAmount: "",
  installments: "",
  paymentMethod: "",
  desiredDate: "",
  clientNotes: "",
  internalNotes: "",
});

export default function ExpressRequestsView({ serviceColor }: Props) {
  const searchParams = useSearchParams();
  const [items, setItems] = useState<RequestRow[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [dialog, setDialog] = useState<ReturnType<typeof emptyRequest> & { id?: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [converting, setConverting] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");

  const load = useCallback(async () => {
    const params = new URLSearchParams({ view: "richieste" });
    if (statusFilter) params.set("status", statusFilter);
    const res = await fetch(`/api/platform/express?${params}`, { credentials: "include" });
    const data = await readJsonResponse<{ items: RequestRow[] }>(res);
    if (res.ok && data) setItems(data.items || []);
  }, [statusFilter]);

  const loadProducts = useCallback(async () => {
    const res = await fetch("/api/platform/express?view=prodotti", { credentials: "include" });
    const data = await readJsonResponse<{ items: ProductOption[] }>(res);
    if (res.ok && data) setProducts(data.items || []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    const prefillId = searchParams.get("prefill");
    if (!prefillId || !items.length || dialog) return;
    const row = items.find((i) => i.id === prefillId);
    if (row) openEdit(row);
  }, [searchParams, items, dialog]);

  function openInPos(requestId: string) {
    window.location.href = `/services/express?v=pos&prefillRequest=${requestId}`;
  }

  async function saveRequest() {
    if (!dialog?.title?.trim() || !dialog.clientId) return;
    setSaving(true);
    const res = await apiFetch("/api/platform/express", {
      method: "POST",
      body: JSON.stringify({
        action: "upsertRequest",
        id: dialog.id,
        clientId: dialog.clientId,
        productId: dialog.productId || undefined,
        title: dialog.title,
        requestType: dialog.requestType,
        status: dialog.status,
        depositAmount: dialog.depositAmount ? Number(dialog.depositAmount) : undefined,
        installments: dialog.installments ? Number(dialog.installments) : undefined,
        paymentMethod: dialog.paymentMethod || undefined,
        desiredDate: dialog.desiredDate || null,
        clientNotes: dialog.clientNotes || undefined,
        internalNotes: dialog.internalNotes || undefined,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setDialog(null);
      load();
    }
  }

  async function convertToSale() {
    if (!dialog?.id) return;
    setConverting(true);
    const res = await apiFetch("/api/platform/express", {
      method: "POST",
      body: JSON.stringify({ action: "convertRequest", id: dialog.id }),
    });
    setConverting(false);
    if (res.ok) {
      setDialog(null);
      load();
    }
  }

  function openEdit(row: RequestRow) {
    setDialog({
      id: row.id,
      title: row.title,
      clientId: row.client?.id || "",
      productId: row.product?.id || "",
      requestType: row.requestType,
      status: row.status,
      depositAmount: row.depositAmount != null ? String(row.depositAmount) : "",
      installments: row.installments != null ? String(row.installments) : "",
      paymentMethod: row.paymentMethod || "",
      desiredDate: row.desiredDate ? row.desiredDate.slice(0, 10) : "",
      clientNotes: row.clientNotes || "",
      internalNotes: row.internalNotes || "",
    });
  }

  return (
    <Box sx={{ pb: 8 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3, flexWrap: "wrap", gap: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <AssignmentIcon sx={{ color: serviceColor, fontSize: 32 }} />
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: "1.25rem" }}>Richieste clienti</Typography>
            <Typography variant="body2" color="text.secondary">
              {items.length} richieste registrate
            </Typography>
          </Box>
        </Box>
        <TextField
          select
          size="small"
          label="Filtra stato"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">Tutti</MenuItem>
          {STATUS_OPTIONS.map((s) => (
            <MenuItem key={s.value} value={s.value}>
              {s.label}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      <Card variant="outlined" sx={{ borderColor: alpha(serviceColor, 0.25) }}>
        <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Data</TableCell>
                <TableCell>Cliente</TableCell>
                <TableCell>Titolo</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Acconto</TableCell>
                <TableCell>Stato</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((row) => (
                <TableRow key={row.id} hover sx={{ cursor: "pointer" }} onClick={() => openEdit(row)}>
                  <TableCell>{new Date(row.createdAt).toLocaleDateString("it-IT")}</TableCell>
                  <TableCell>{row.client?.name || "—"}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{row.title}</TableCell>
                  <TableCell>
                    {REQUEST_TYPES.find((t) => t.value === row.requestType)?.label || row.requestType}
                  </TableCell>
                  <TableCell>{row.depositAmount != null ? money(row.depositAmount) : "—"}</TableCell>
                  <TableCell>
                    <Chip
                      label={STATUS_OPTIONS.find((s) => s.value === row.status)?.label || row.status}
                      size="small"
                      color={statusChipColor(row.status)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Fab
        color="primary"
        onClick={() => setDialog(emptyRequest())}
        sx={{ position: "fixed", bottom: 24, right: 24, background: serviceColor }}
        aria-label="Nuova richiesta"
      >
        <AddIcon />
      </Fab>

      <Dialog open={Boolean(dialog)} onClose={() => setDialog(null)} maxWidth="sm" fullWidth>
        {dialog && (
          <>
            <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              {dialog.id ? "Modifica richiesta" : "Nuova richiesta"}
              {dialog.id && dialog.status !== "Completed" && dialog.status !== "Cancelled" && (
                <Box sx={{ display: "flex", gap: 1 }}>
                  <Button
                    size="small"
                    startIcon={<PointOfSaleIcon />}
                    onClick={() => openInPos(dialog.id!)}
                    variant="contained"
                    sx={{ background: serviceColor }}
                  >
                    Apri in cassa
                  </Button>
                  <Button
                    size="small"
                    startIcon={<PointOfSaleIcon />}
                    onClick={convertToSale}
                    disabled={converting}
                    variant="outlined"
                  >
                    {converting ? "Conversione…" : "Converti in vendita"}
                  </Button>
                </Box>
              )}
            </DialogTitle>
            <DialogContent>
              <Box sx={{ pt: 1, display: "flex", flexDirection: "column", gap: 2 }}>
                <ClientPicker
                  value={dialog.clientId}
                  onChange={(id) => setDialog({ ...dialog, clientId: id })}
                  label="Cliente"
                  required
                />
                <TextField fullWidth size="small" label="Titolo" value={dialog.title} onChange={(e) => setDialog({ ...dialog, title: e.target.value })} />
                <TextField fullWidth size="small" select label="Prodotto (opzionale)" value={dialog.productId} onChange={(e) => setDialog({ ...dialog, productId: e.target.value })}>
                  <MenuItem value="">Nessuno</MenuItem>
                  {products.map((p) => (
                    <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                  ))}
                </TextField>
                <TextField fullWidth size="small" select label="Tipo richiesta" value={dialog.requestType} onChange={(e) => setDialog({ ...dialog, requestType: e.target.value })}>
                  {REQUEST_TYPES.map((t) => (
                    <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
                  ))}
                </TextField>
                <TextField fullWidth size="small" select label="Stato" value={dialog.status} onChange={(e) => setDialog({ ...dialog, status: e.target.value })}>
                  {STATUS_OPTIONS.map((s) => (
                    <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
                  ))}
                </TextField>
                <TextField fullWidth size="small" type="number" label="Acconto €" value={dialog.depositAmount} onChange={(e) => setDialog({ ...dialog, depositAmount: e.target.value })} />
                <TextField fullWidth size="small" type="number" label="Numero rate" value={dialog.installments} onChange={(e) => setDialog({ ...dialog, installments: e.target.value })} />
                <TextField fullWidth size="small" label="Metodo pagamento" value={dialog.paymentMethod} onChange={(e) => setDialog({ ...dialog, paymentMethod: e.target.value })} />
                <AppDateField fullWidth label="Data desiderata" value={dialog.desiredDate} onChange={(desiredDate) => setDialog({ ...dialog, desiredDate })} />
                <TextField fullWidth size="small" multiline minRows={2} label="Note cliente" value={dialog.clientNotes} onChange={(e) => setDialog({ ...dialog, clientNotes: e.target.value })} />
                <TextField fullWidth size="small" multiline minRows={2} label="Note interne" value={dialog.internalNotes} onChange={(e) => setDialog({ ...dialog, internalNotes: e.target.value })} />
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDialog(null)}>Annulla</Button>
              <Button variant="contained" onClick={saveRequest} disabled={saving} sx={{ background: serviceColor }}>
                {saving ? "Salvataggio…" : "Salva"}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
