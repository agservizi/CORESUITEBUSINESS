"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Tabs,
  Tab,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Stack,
} from "@mui/material";
import StorefrontIcon from "@mui/icons-material/Storefront";
import FlashOnIcon from "@mui/icons-material/FlashOn";
import { apiFetch, readJsonResponse } from "@/lib/fetch-client";
import { money } from "@/components/platform/express/express-utils";

interface CatalogItem {
  id: string;
  name: string;
  price: number;
  category?: string | null;
  inStock: boolean;
}

interface OrderItem {
  id: string;
  title: string;
  status: string;
  requestType: string;
  createdAt: string;
  product?: { name: string; price?: number | string } | null;
}

interface ReceiptItem {
  id: string;
  total: number;
  soldAt: string;
  paymentMethod: string;
  receiptNumber?: number | null;
  receiptToken?: string | null;
}

export default function ExpressPortaleView() {
  const [tab, setTab] = useState(0);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [receipts, setReceipts] = useState<ReceiptItem[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [requestProduct, setRequestProduct] = useState<CatalogItem | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [quickSavingId, setQuickSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError("");
    const views = ["catalog", "orders", "receipts"] as const;
    const results = await Promise.all(
      views.map((v) =>
        fetch(`/api/portale/express?view=${v}`, { credentials: "include" }).then(async (r) => ({
          ok: r.ok,
          data: await r.json(),
        }))
      )
    );
    if (!results[0].ok) {
      setError(results[0].data.error || "Portale Express non disponibile");
      return;
    }
    setCatalog(results[0].data.items || []);
    setOrders(results[1].data.items || []);
    setReceipts(results[2].data.items || []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function submitRequest() {
    if (!requestProduct) return;
    setSaving(true);
    const res = await apiFetch("/api/portale/express", {
      method: "POST",
      body: JSON.stringify({
        action: "createRequest",
        productId: requestProduct.id,
        title: `Acquisto ${requestProduct.name}`,
        clientNotes: notes || undefined,
      }),
    });
    const data = await readJsonResponse<{ message?: string }>(res);
    setSaving(false);
    if (res.ok) {
      setRequestProduct(null);
      setNotes("");
      setSuccess(data?.message || "Richiesta inviata — il negozio ti contatterà a breve.");
      setTab(1);
      load();
    }
  }

  async function quickPurchase(product: CatalogItem) {
    setQuickSavingId(product.id);
    const res = await apiFetch("/api/portale/express", {
      method: "POST",
      body: JSON.stringify({
        action: "quickPurchase",
        productId: product.id,
      }),
    });
    const data = await readJsonResponse<{ message?: string }>(res);
    setQuickSavingId(null);
    if (res.ok) {
      setSuccess(data?.message || "Richiesta inviata al negozio con un tap!");
      setTab(1);
      load();
    }
  }

  if (error) {
    return (
      <Alert severity="warning" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
        <StorefrontIcon color="primary" sx={{ fontSize: 36 }} />
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: "1.35rem" }}>Express — Area clienti</Typography>
          <Typography variant="body2" color="text.secondary">
            Catalogo, ordini e ricevute del negozio telefonia
          </Typography>
        </Box>
      </Box>

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess("")}>
          {success}
        </Alert>
      )}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="Catalogo" />
        <Tab label="I miei ordini" />
        <Tab label="Ricevute" />
      </Tabs>

      {tab === 0 && (
        <Grid container spacing={2}>
          {catalog.map((p) => (
            <Grid key={p.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card variant="outlined">
                <CardContent>
                  <Typography sx={{ fontWeight: 700 }}>{p.name}</Typography>
                  {p.category && (
                    <Typography variant="caption" color="text.secondary">
                      {p.category}
                    </Typography>
                  )}
                  <Typography sx={{ fontWeight: 800, fontSize: "1.2rem", my: 1 }}>{money(p.price)}</Typography>
                  <Chip label={p.inStock ? "Disponibile" : "Esaurito"} size="small" color={p.inStock ? "success" : "default"} />
                  <Stack spacing={1} sx={{ mt: 2 }}>
                    <Button
                      fullWidth
                      variant="contained"
                      color="success"
                      startIcon={<FlashOnIcon />}
                      disabled={!p.inStock || quickSavingId === p.id}
                      onClick={() => quickPurchase(p)}
                    >
                      {quickSavingId === p.id ? "Invio…" : "Acquista con 1 tap"}
                    </Button>
                    <Button
                      fullWidth
                      variant="outlined"
                      disabled={!p.inStock}
                      onClick={() => setRequestProduct(p)}
                    >
                      Richiedi con note
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {tab === 1 && (
        <Card variant="outlined">
          <CardContent>
            {orders.length === 0 ? (
              <Typography color="text.secondary">Nessun ordine ancora.</Typography>
            ) : (
              orders.map((o) => (
                <Box key={o.id} sx={{ py: 1.5, borderBottom: "1px solid", borderColor: "divider" }}>
                  <Typography sx={{ fontWeight: 600 }}>{o.title}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {new Date(o.createdAt).toLocaleString("it-IT")} · {o.requestType}
                  </Typography>
                  <Chip label={o.status} size="small" sx={{ mt: 0.5 }} />
                </Box>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {tab === 2 && (
        <Card variant="outlined">
          <CardContent>
            {receipts.length === 0 ? (
              <Typography color="text.secondary">Nessuna ricevuta disponibile.</Typography>
            ) : (
              receipts.map((r) => (
                <Box
                  key={r.id}
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    py: 1.5,
                    borderBottom: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Box>
                    <Typography sx={{ fontWeight: 600 }}>
                      Ricevuta #{r.receiptNumber ?? r.id.slice(-6)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {new Date(r.soldAt).toLocaleString("it-IT")} · {r.paymentMethod}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: "right" }}>
                    <Typography sx={{ fontWeight: 700 }}>{money(r.total)}</Typography>
                    <Stack direction="row" spacing={0.5} sx={{ justifyContent: "flex-end" }}>
                      {r.receiptToken && (
                        <Button size="small" href={`/express/receipt/${r.id}?t=${r.receiptToken}`} target="_blank">
                          Digitale
                        </Button>
                      )}
                      <Button
                        size="small"
                        href={`/api/platform/express?id=${r.id}&format=pdf`}
                        target="_blank"
                      >
                        PDF
                      </Button>
                    </Stack>
                  </Box>
                </Box>
              ))
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={Boolean(requestProduct)} onClose={() => setRequestProduct(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Richiesta acquisto</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            {requestProduct?.name} — {requestProduct ? money(requestProduct.price) : ""}
          </Typography>
          <TextField
            fullWidth
            multiline
            minRows={2}
            label="Note (opzionale)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRequestProduct(null)}>Annulla</Button>
          <Button variant="contained" onClick={submitRequest} disabled={saving}>
            {saving ? "Invio…" : "Invia richiesta"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
