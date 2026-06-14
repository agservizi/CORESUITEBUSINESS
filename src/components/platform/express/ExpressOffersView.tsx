"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Button,
  alpha,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import { apiFetch, readJsonResponse } from "@/lib/fetch-client";
import { AppDateField } from "@/components/layout/app-shell";
import { money, type OfferRow } from "./express-utils";

interface OperatorOption {
  id: string;
  name: string;
}

interface Props {
  serviceColor: string;
}

const emptyOffer = (): Partial<OfferRow> & { validFrom?: string; validTo?: string; cost?: number } => ({
  title: "",
  description: "",
  price: 0,
  cost: 0,
  status: "Active",
  operatorId: "",
  validFrom: "",
  validTo: "",
});

function toDateInput(iso?: string | null) {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export default function ExpressOffersView({ serviceColor }: Props) {
  const [offers, setOffers] = useState<OfferRow[]>([]);
  const [operators, setOperators] = useState<OperatorOption[]>([]);
  const [dialog, setDialog] = useState<ReturnType<typeof emptyOffer> | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [offersRes, opsRes] = await Promise.all([
      fetch("/api/platform/express?view=offerte", { credentials: "include" }),
      fetch("/api/platform/express?view=operatori", { credentials: "include" }),
    ]);
    const offersData = await readJsonResponse<{ items: OfferRow[] }>(offersRes);
    const opsData = await readJsonResponse<{ items: OperatorOption[] }>(opsRes);
    if (offersRes.ok && offersData) setOffers(offersData.items || []);
    if (opsRes.ok && opsData) setOperators(opsData.items || []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function saveOffer() {
    if (!dialog?.title?.trim()) return;
    setSaving(true);
    const isEdit = Boolean(dialog.id);
    const res = await apiFetch("/api/platform/express", {
      method: "POST",
      body: JSON.stringify({
        action: isEdit ? "updateOffer" : "createOffer",
        id: dialog.id,
        operatorId: dialog.operatorId || undefined,
        title: dialog.title,
        description: dialog.description || undefined,
        price: Number(dialog.price ?? 0),
        cost: Number(dialog.cost ?? 0),
        status: dialog.status || "Active",
        validFrom: dialog.validFrom || null,
        validTo: dialog.validTo || null,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setDialog(null);
      load();
    }
  }

  function openEdit(offer: OfferRow & { validFrom?: string | null; validTo?: string | null }) {
    setDialog({
      id: offer.id,
      title: offer.title,
      description: offer.description || "",
      price: Number(offer.price),
      cost: Number((offer as OfferRow & { cost?: number }).cost ?? 0),
      status: offer.status,
      operatorId: offer.operatorId || offer.operator?.id || "",
      validFrom: toDateInput(offer.validFrom as string | undefined),
      validTo: toDateInput(offer.validTo as string | undefined),
    });
  }

  async function deleteOffer(id: string) {
    if (!confirm("Eliminare o archiviare questa offerta?")) return;
    const res = await apiFetch("/api/platform/express", {
      method: "POST",
      body: JSON.stringify({ action: "deleteOffer", id }),
    });
    if (res.ok) load();
  }

  const grouped = offers.reduce<Record<string, OfferRow[]>>((acc, o) => {
    const key = o.operator?.name || "Generico";
    if (!acc[key]) acc[key] = [];
    acc[key].push(o);
    return acc;
  }, {});

  return (
    <Box sx={{ pb: 8 }}>
      <Typography sx={{ fontWeight: 700, fontSize: "1.25rem", mb: 0.5 }}>Listini operatori</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {offers.filter((o) => o.status === "Active").length} offerte attive su{" "}
        {Object.keys(grouped).length} operatori
      </Typography>

      {Object.entries(grouped).map(([operator, list]) => (
        <Box key={operator} sx={{ mb: 3 }}>
          <Typography sx={{ fontWeight: 700, mb: 1.5, color: serviceColor }}>{operator}</Typography>
          <Grid container spacing={2}>
            {list.map((offer) => (
              <Grid key={offer.id} size={{ xs: 12, sm: 6, md: 4 }}>
                <Card
                  variant="outlined"
                  sx={{
                    height: "100%",
                    borderColor: offer.status === "Active" ? alpha(serviceColor, 0.35) : "divider",
                    opacity: offer.status === "Active" ? 1 : 0.75,
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1, flexWrap: "wrap", gap: 0.5 }}>
                      <Chip
                        label={offer.status === "Active" ? "Attiva" : "Inattiva"}
                        size="small"
                        color={offer.status === "Active" ? "success" : "default"}
                      />
                      <Box sx={{ display: "flex", gap: 0.5 }}>
                        <Button
                          size="small"
                          startIcon={<EditIcon />}
                          onClick={() => openEdit(offer as OfferRow & { validFrom?: string; validTo?: string })}
                        >
                          Modifica
                        </Button>
                        <Button size="small" color="error" onClick={() => deleteOffer(offer.id)}>
                          Elimina
                        </Button>
                      </Box>
                    </Box>
                    <Typography sx={{ fontWeight: 700, mb: 0.5 }}>{offer.title}</Typography>
                    {(offer as OfferRow & { validFrom?: string; validTo?: string }).validFrom && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                        Valida{" "}
                        {new Date((offer as OfferRow & { validFrom: string }).validFrom).toLocaleDateString("it-IT")}
                        {(offer as OfferRow & { validTo?: string }).validTo
                          ? ` → ${new Date((offer as OfferRow & { validTo: string }).validTo).toLocaleDateString("it-IT")}`
                          : ""}
                      </Typography>
                    )}
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 2, minHeight: 48, lineHeight: 1.5 }}
                    >
                      {offer.description || "—"}
                    </Typography>
                    <Typography sx={{ fontWeight: 800, fontSize: "1.25rem", color: serviceColor }}>
                      {money(offer.price)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      ))}

      <Fab
        color="primary"
        onClick={() => setDialog(emptyOffer())}
        sx={{ position: "fixed", bottom: 24, right: 24, background: serviceColor }}
        aria-label="Nuova offerta"
      >
        <AddIcon />
      </Fab>

      <Dialog open={Boolean(dialog)} onClose={() => setDialog(null)} maxWidth="sm" fullWidth>
        {dialog && (
          <>
            <DialogTitle>{dialog.id ? "Modifica offerta" : "Nuova offerta"}</DialogTitle>
            <DialogContent>
              <TextField
                fullWidth
                size="small"
                label="Titolo"
                value={dialog.title || ""}
                onChange={(e) => setDialog({ ...dialog, title: e.target.value })}
                sx={{ mt: 1, mb: 2 }}
              />
              <TextField
                fullWidth
                size="small"
                multiline
                minRows={2}
                label="Descrizione"
                value={dialog.description || ""}
                onChange={(e) => setDialog({ ...dialog, description: e.target.value })}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                size="small"
                select
                label="Operatore"
                value={dialog.operatorId || ""}
                onChange={(e) => setDialog({ ...dialog, operatorId: e.target.value })}
                sx={{ mb: 2 }}
              >
                <MenuItem value="">Generico</MenuItem>
                {operators.map((op) => (
                  <MenuItem key={op.id} value={op.id}>
                    {op.name}
                  </MenuItem>
                ))}
              </TextField>
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
                label="Costo operatore €"
                value={dialog.cost ?? 0}
                onChange={(e) => setDialog({ ...dialog, cost: Number(e.target.value) })}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                size="small"
                select
                label="Stato"
                value={dialog.status || "Active"}
                onChange={(e) => setDialog({ ...dialog, status: e.target.value })}
                sx={{ mb: 2 }}
              >
                <MenuItem value="Active">Attiva</MenuItem>
                <MenuItem value="Inactive">Inattiva</MenuItem>
              </TextField>
              <AppDateField
                fullWidth
                label="Valida da"
                value={dialog.validFrom || ""}
                onChange={(validFrom) => setDialog({ ...dialog, validFrom })}
                sx={{ mb: 2 }}
              />
              <AppDateField
                fullWidth
                label="Valida fino a"
                value={dialog.validTo || ""}
                onChange={(validTo) => setDialog({ ...dialog, validTo })}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDialog(null)}>Annulla</Button>
              <Button variant="contained" onClick={saveOffer} disabled={saving} sx={{ background: serviceColor }}>
                {saving ? "Salvataggio…" : "Salva"}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
