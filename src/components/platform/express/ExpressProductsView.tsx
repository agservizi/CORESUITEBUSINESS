"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Fab,
  Alert,
  alpha,
} from "@mui/material";
import InventoryIcon from "@mui/icons-material/Inventory";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import { apiFetch, readJsonResponse } from "@/lib/fetch-client";
import { money } from "./express-utils";

interface ProductRow {
  id: string;
  name: string;
  sku?: string | null;
  category?: string | null;
  price: number | string;
  cost?: number | string;
  vatRate?: number | string;
  stockQty: number;
  reorderThreshold: number;
  notes?: string | null;
  imei?: string | null;
  active: boolean;
}

interface Props {
  serviceColor: string;
}

const emptyProduct = (): Partial<ProductRow> => ({
  name: "",
  sku: "",
  category: "",
  price: 0,
  cost: 0,
  vatRate: 22,
  stockQty: 0,
  reorderThreshold: 5,
  active: true,
});

export default function ExpressProductsView({ serviceColor }: Props) {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [dialog, setDialog] = useState<Partial<ProductRow> | null>(null);
  const [restockQty, setRestockQty] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/platform/express?view=prodotti", { credentials: "include" });
    const data = await readJsonResponse<{ items: ProductRow[] }>(res);
    if (res.ok && data) setProducts(data.items || []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function saveProduct() {
    if (!dialog?.name?.trim()) return;
    setSaving(true);
    const isEdit = Boolean(dialog.id);
    const res = await apiFetch("/api/platform/express", {
      method: "POST",
      body: JSON.stringify({
        action: isEdit ? "updateProduct" : "createProduct",
        id: dialog.id,
        name: dialog.name,
        sku: dialog.sku || undefined,
        imei: dialog.imei || undefined,
        category: dialog.category || undefined,
        price: Number(dialog.price ?? 0),
        cost: Number(dialog.cost ?? 0),
        vatRate: Number(dialog.vatRate ?? 22),
        stockQty: Number(dialog.stockQty ?? 0),
        reorderThreshold: Number(dialog.reorderThreshold ?? 0),
        notes: dialog.notes || undefined,
        active: dialog.active ?? true,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setDialog(null);
      load();
    } else {
      const err = await readJsonResponse<{ error?: string }>(res);
      setFeedback(err?.error || "Errore salvataggio");
    }
  }

  async function restock(id: string) {
    const qty = Number(restockQty[id]);
    if (!qty || qty <= 0) return;
    const res = await apiFetch("/api/platform/express", {
      method: "POST",
      body: JSON.stringify({ action: "restockProduct", id, qty }),
    });
    if (res.ok) {
      setFeedback(`Rifornito +${qty} unità`);
      setRestockQty((r) => ({ ...r, [id]: "" }));
      load();
    }
  }

  async function deleteProduct(id: string) {
    if (!confirm("Eliminare o disattivare questo prodotto?")) return;
    const res = await apiFetch("/api/platform/express", {
      method: "POST",
      body: JSON.stringify({ action: "deleteProduct", id }),
    });
    if (res.ok) load();
  }

  return (
    <Box sx={{ pb: 8 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
        <InventoryIcon sx={{ color: serviceColor, fontSize: 32 }} />
        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: "1.25rem" }}>Catalogo prodotti</Typography>
          <Typography variant="body2" color="text.secondary">
            {products.length} prodotti · gestione stock e soglie
          </Typography>
        </Box>
      </Box>

      {feedback && (
        <Alert severity="info" sx={{ mb: 2 }} onClose={() => setFeedback("")}>
          {feedback}
        </Alert>
      )}

      <Grid container spacing={2}>
        {products.map((p) => {
          const lowStock = p.reorderThreshold > 0 && p.stockQty <= p.reorderThreshold;
          return (
            <Grid key={p.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card
                variant="outlined"
                sx={{
                  height: "100%",
                  borderColor: lowStock ? "warning.main" : alpha(serviceColor, 0.25),
                  bgcolor: lowStock ? alpha("#f59e0b", 0.04) : undefined,
                }}
              >
                <CardContent>
                  <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                    <Chip
                      label={p.active ? "Attivo" : "Disattivo"}
                      size="small"
                      color={p.active ? "success" : "default"}
                    />
                    {lowStock && <Chip label="Sotto soglia" size="small" color="warning" />}
                  </Box>
                  <Typography sx={{ fontWeight: 700, mb: 0.5 }}>{p.name}</Typography>
                  {p.sku && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                      SKU {p.sku}
                    </Typography>
                  )}
                  <Typography sx={{ fontWeight: 800, fontSize: "1.2rem", color: serviceColor, my: 1 }}>
                    {money(p.price)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Stock: <strong>{p.stockQty}</strong>
                    {p.reorderThreshold > 0 && ` · soglia ${p.reorderThreshold}`}
                  </Typography>
                  <Box sx={{ display: "flex", gap: 1, mt: 2, alignItems: "center" }}>
                    <TextField
                      size="small"
                      type="number"
                      placeholder="Qtà"
                      value={restockQty[p.id] ?? ""}
                      onChange={(e) => setRestockQty((r) => ({ ...r, [p.id]: e.target.value }))}
                      sx={{ width: 80 }}
                    />
                    <Button size="small" variant="outlined" onClick={() => restock(p.id)}>
                      Rifornisci
                    </Button>
                    <Button
                      size="small"
                      startIcon={<EditIcon />}
                      onClick={() => setDialog({ ...p, price: Number(p.price) })}
                    >
                      Modifica
                    </Button>
                    <Button size="small" color="error" startIcon={<DeleteOutlinedIcon />} onClick={() => deleteProduct(p.id)}>
                      Elimina
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      <Fab
        color="primary"
        onClick={() => setDialog(emptyProduct())}
        sx={{ position: "fixed", bottom: 24, right: 24, background: serviceColor }}
        aria-label="Nuovo prodotto"
      >
        <AddIcon />
      </Fab>

      <Dialog open={Boolean(dialog)} onClose={() => setDialog(null)} maxWidth="sm" fullWidth>
        {dialog && (
          <>
            <DialogTitle>{dialog.id ? "Modifica prodotto" : "Nuovo prodotto"}</DialogTitle>
            <DialogContent>
              <TextField
                fullWidth
                size="small"
                label="Nome"
                value={dialog.name || ""}
                onChange={(e) => setDialog({ ...dialog, name: e.target.value })}
                sx={{ mt: 1, mb: 2 }}
              />
              <TextField
                fullWidth
                size="small"
                label="SKU"
                value={dialog.sku || ""}
                onChange={(e) => setDialog({ ...dialog, sku: e.target.value })}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                size="small"
                label="IMEI"
                value={(dialog as { imei?: string }).imei || ""}
                onChange={(e) => setDialog({ ...dialog, imei: e.target.value })}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                size="small"
                label="Categoria"
                value={dialog.category || ""}
                onChange={(e) => setDialog({ ...dialog, category: e.target.value })}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Prezzo €"
                value={dialog.price ?? 0}
                onChange={(e) => setDialog({ ...dialog, price: Number(e.target.value) })}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Costo acquisto €"
                value={dialog.cost ?? 0}
                onChange={(e) => setDialog({ ...dialog, cost: Number(e.target.value) })}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                size="small"
                type="number"
                label="IVA %"
                value={dialog.vatRate ?? 22}
                onChange={(e) => setDialog({ ...dialog, vatRate: Number(e.target.value) })}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Stock iniziale"
                value={dialog.stockQty ?? 0}
                onChange={(e) => setDialog({ ...dialog, stockQty: Number(e.target.value) })}
                sx={{ mb: 2 }}
                disabled={Boolean(dialog.id)}
              />
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Soglia riordino"
                value={dialog.reorderThreshold ?? 0}
                onChange={(e) => setDialog({ ...dialog, reorderThreshold: Number(e.target.value) })}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                size="small"
                multiline
                minRows={2}
                label="Note"
                value={dialog.notes || ""}
                onChange={(e) => setDialog({ ...dialog, notes: e.target.value })}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                size="small"
                select
                label="Stato"
                value={dialog.active ? "active" : "inactive"}
                onChange={(e) => setDialog({ ...dialog, active: e.target.value === "active" })}
              >
                <MenuItem value="active">Attivo</MenuItem>
                <MenuItem value="inactive">Disattivo</MenuItem>
              </TextField>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDialog(null)}>Annulla</Button>
              <Button variant="contained" onClick={saveProduct} disabled={saving} sx={{ background: serviceColor }}>
                {saving ? "Salvataggio…" : "Salva"}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
