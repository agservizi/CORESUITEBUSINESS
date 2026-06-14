"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
  MenuItem, Stack, Typography, Box, Divider, CircularProgress, Chip,
} from "@mui/material";
import { jsonMutationHeaders } from "@/lib/csrf-client";
import { shellPanelSx } from "@/theme/shell-tokens";
import { CATEGORY_LABELS, type OpportunityRow } from "./opportunities-utils";
import type { OpportunityCategory } from "@/generated/prisma";

interface CatalogProvider {
  id: string;
  name: string;
  defaultCommission?: unknown;
  offers: { id: string; name: string; commission?: unknown }[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  initial?: Partial<OpportunityRow> | null;
  serviceColor?: string;
  variant?: "dialog" | "page";
}

const EMPTY_FORM = {
  category: "TELEFONIA" as OpportunityCategory,
  providerId: "",
  offerId: "",
  customerFirstName: "",
  customerLastName: "",
  customerTaxCode: "",
  customerPhone: "",
  customerEmail: "",
  customerAddress: "",
  customerCity: "",
  customerPostalCode: "",
  customerProvince: "",
  telefoniaContractType: "migrazione",
  telefoniaCurrentOperator: "",
  telefoniaLineNumber: "",
  lucePod: "",
  gasPdr: "",
  paymentIban: "",
  additionalNotes: "",
};

export default function OpportunityDialog({
  open,
  onClose,
  onSaved,
  initial,
  serviceColor = "#8b5cf6",
  variant = "dialog",
}: Props) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [catalog, setCatalog] = useState<Record<OpportunityCategory, CatalogProvider[]>>({
    TELEFONIA: [],
    LUCE: [],
    GAS: [],
  });
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [draftSavedAt, setDraftSavedAt] = useState<Date | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipDraftSave = useRef(false);
  const isCreateOnly = !initial?.id;

  useEffect(() => {
    if (!open) return;
    setError("");
    setDraftSavedAt(null);
    setDraftRestored(false);
    skipDraftSave.current = false;
    setLoadingCatalog(true);

    Promise.all([
      fetch("/api/platform/opportunities/catalog").then((r) => r.json()),
      fetch("/api/platform/opportunities/draft").then((r) => r.json()),
    ])
      .then(([catalogData, draftData]) => {
        if (catalogData.catalog) setCatalog(catalogData.catalog);
        const payload = draftData.draft as typeof EMPTY_FORM | null;
        if (payload && typeof payload === "object" && Object.keys(payload).length > 0) {
          setForm({ ...EMPTY_FORM, ...payload });
          setDraftRestored(true);
          if (draftData.updatedAt) setDraftSavedAt(new Date(draftData.updatedAt));
        } else {
          setForm(EMPTY_FORM);
        }
      })
      .finally(() => setLoadingCatalog(false));
  }, [open]);

  useEffect(() => {
    if (!open || !isCreateOnly || skipDraftSave.current) return;
    const hasContent = form.providerId || form.customerFirstName || form.customerLastName
      || form.customerTaxCode || form.customerPhone;
    if (!hasContent) return;

    if (draftTimer.current) clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/platform/opportunities/draft", {
          method: "PUT",
          headers: jsonMutationHeaders(),
          body: JSON.stringify(form),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.updatedAt) setDraftSavedAt(new Date(data.updatedAt));
        }
      } catch {
        /* ignore autosave errors */
      }
    }, 1500);

    return () => {
      if (draftTimer.current) clearTimeout(draftTimer.current);
    };
  }, [form, open, isCreateOnly]);

  const providers = catalog[form.category] || [];
  const selectedProvider = providers.find((p) => p.id === form.providerId);
  const offers = selectedProvider?.offers || [];

  const estimatedCommission = useMemo(() => {
    if (form.offerId) {
      const offer = offers.find((o) => o.id === form.offerId);
      if (offer?.commission != null) return Number(offer.commission);
    }
    if (selectedProvider?.defaultCommission != null) return Number(selectedProvider.defaultCommission);
    return null;
  }, [form.offerId, offers, selectedProvider]);

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const payload: Record<string, unknown> = {
        category: form.category,
        providerId: form.providerId,
        offerId: form.offerId || undefined,
        customerFirstName: form.customerFirstName.trim(),
        customerLastName: form.customerLastName.trim(),
        customerTaxCode: form.customerTaxCode.trim(),
        customerPhone: form.customerPhone.trim(),
        customerEmail: form.customerEmail.trim(),
        customerAddress: form.customerAddress.trim() || undefined,
        customerCity: form.customerCity.trim() || undefined,
        customerPostalCode: form.customerPostalCode.trim() || undefined,
        customerProvince: form.customerProvince.trim() || undefined,
        paymentMethod: "IBAN",
        paymentIban: form.paymentIban.replace(/\s/g, "") || undefined,
        additionalNotes: form.additionalNotes.trim() || undefined,
      };

      if (form.category === "TELEFONIA") {
        payload.telefoniaContractType = form.telefoniaContractType;
        if (form.telefoniaContractType === "migrazione") {
          payload.telefoniaCurrentOperator = form.telefoniaCurrentOperator.trim();
          payload.telefoniaLineNumber = form.telefoniaLineNumber.trim();
        }
      }
      if (form.category === "LUCE") payload.lucePod = form.lucePod.trim().toUpperCase();
      if (form.category === "GAS") payload.gasPdr = form.gasPdr.trim().toUpperCase();

      const res = await fetch("/api/platform/opportunities", {
        method: "POST",
        headers: jsonMutationHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Errore salvataggio");
        return;
      }
      skipDraftSave.current = true;
      await fetch("/api/platform/opportunities/draft", {
        method: "DELETE",
        headers: jsonMutationHeaders(),
      });
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  if (!open && variant === "dialog") return null;

  const draftChip = isCreateOnly && draftSavedAt ? (
    <Chip
      size="small"
      label={draftRestored
        ? `Bozza ripristinata · ${draftSavedAt.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}`
        : `Bozza salvata · ${draftSavedAt.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}`}
      sx={{ mt: 1, bgcolor: `${serviceColor}18`, color: serviceColor, fontWeight: 600 }}
    />
  ) : null;

  const contractSection = (
    <Box>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>Contratto</Typography>
      <Stack spacing={2}>
        <TextField
          select
          label="Categoria"
          fullWidth
          size="small"
          value={form.category}
          onChange={(e) => setForm((f) => ({
            ...f,
            category: e.target.value as OpportunityCategory,
            providerId: "",
            offerId: "",
          }))}
        >
          {(Object.keys(CATEGORY_LABELS) as OpportunityCategory[]).map((c) => (
            <MenuItem key={c} value={c}>{CATEGORY_LABELS[c]}</MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Gestore"
          required
          fullWidth
          size="small"
          value={form.providerId}
          onChange={(e) => setForm((f) => ({ ...f, providerId: e.target.value, offerId: "" }))}
        >
          <MenuItem value="">Seleziona gestore</MenuItem>
          {providers.map((p) => (
            <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Offerta"
          fullWidth
          size="small"
          value={form.offerId}
          onChange={(e) => setForm((f) => ({ ...f, offerId: e.target.value }))}
          disabled={!form.providerId}
        >
          <MenuItem value="">Nessuna offerta specifica</MenuItem>
          {offers.map((o) => (
            <MenuItem key={o.id} value={o.id}>{o.name}</MenuItem>
          ))}
        </TextField>
        {estimatedCommission != null && (
          <Typography variant="caption" color="text.secondary">
            Commissione stimata: €{estimatedCommission.toLocaleString("it-IT", { minimumFractionDigits: 2 })}
          </Typography>
        )}
      </Stack>
    </Box>
  );

  const customerSection = (
    <Box>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>Cliente</Typography>
      <Stack spacing={2}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ alignItems: "stretch" }}>
          <TextField
            label="Nome"
            required
            fullWidth
            size="small"
            value={form.customerFirstName}
            onChange={(e) => setForm((f) => ({ ...f, customerFirstName: e.target.value }))}
          />
          <TextField
            label="Cognome"
            required
            fullWidth
            size="small"
            value={form.customerLastName}
            onChange={(e) => setForm((f) => ({ ...f, customerLastName: e.target.value }))}
          />
        </Stack>
        <TextField
          label="Codice fiscale"
          required
          fullWidth
          size="small"
          value={form.customerTaxCode}
          onChange={(e) => setForm((f) => ({ ...f, customerTaxCode: e.target.value.toUpperCase() }))}
        />
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ alignItems: "stretch" }}>
          <TextField
            label="Telefono"
            required
            fullWidth
            size="small"
            value={form.customerPhone}
            onChange={(e) => setForm((f) => ({ ...f, customerPhone: e.target.value }))}
          />
          <TextField
            label="Email"
            required
            fullWidth
            size="small"
            type="email"
            value={form.customerEmail}
            onChange={(e) => setForm((f) => ({ ...f, customerEmail: e.target.value }))}
          />
        </Stack>
        <TextField
          label="Indirizzo"
          fullWidth
          size="small"
          value={form.customerAddress}
          onChange={(e) => setForm((f) => ({ ...f, customerAddress: e.target.value }))}
        />
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ alignItems: "stretch" }}>
          <TextField
            label="Città"
            fullWidth
            size="small"
            value={form.customerCity}
            onChange={(e) => setForm((f) => ({ ...f, customerCity: e.target.value }))}
          />
          <TextField
            label="CAP"
            fullWidth
            size="small"
            value={form.customerPostalCode}
            onChange={(e) => setForm((f) => ({ ...f, customerPostalCode: e.target.value }))}
          />
          <TextField
            label="Provincia"
            fullWidth
            size="small"
            value={form.customerProvince}
            onChange={(e) => setForm((f) => ({ ...f, customerProvince: e.target.value.toUpperCase() }))}
          />
        </Stack>
      </Stack>
    </Box>
  );

  const serviceSection = (
    <Box>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>Dettagli servizio</Typography>
      <Stack spacing={2}>
        {form.category === "TELEFONIA" && (
          <>
            <TextField
              select
              label="Tipo contratto"
              fullWidth
              size="small"
              value={form.telefoniaContractType}
              onChange={(e) => setForm((f) => ({ ...f, telefoniaContractType: e.target.value }))}
            >
              <MenuItem value="migrazione">Migrazione</MenuItem>
              <MenuItem value="nuova_attivazione">Nuova attivazione</MenuItem>
            </TextField>
            {form.telefoniaContractType === "migrazione" && (
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ alignItems: "stretch" }}>
                <TextField
                  label="Operatore attuale"
                  required
                  fullWidth
                  size="small"
                  value={form.telefoniaCurrentOperator}
                  onChange={(e) => setForm((f) => ({ ...f, telefoniaCurrentOperator: e.target.value }))}
                />
                <TextField
                  label="Numero linea"
                  required
                  fullWidth
                  size="small"
                  value={form.telefoniaLineNumber}
                  onChange={(e) => setForm((f) => ({ ...f, telefoniaLineNumber: e.target.value }))}
                />
              </Stack>
            )}
          </>
        )}
        {form.category === "LUCE" && (
          <TextField
            label="POD"
            required
            fullWidth
            size="small"
            value={form.lucePod}
            onChange={(e) => setForm((f) => ({ ...f, lucePod: e.target.value.toUpperCase() }))}
          />
        )}
        {form.category === "GAS" && (
          <TextField
            label="PDR"
            required
            fullWidth
            size="small"
            value={form.gasPdr}
            onChange={(e) => setForm((f) => ({ ...f, gasPdr: e.target.value.toUpperCase() }))}
          />
        )}
      </Stack>
    </Box>
  );

  const paymentSection = (
    <Box>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>Pagamento e note</Typography>
      <Stack spacing={2}>
        <TextField
          label="IBAN"
          fullWidth
          size="small"
          value={form.paymentIban}
          onChange={(e) => setForm((f) => ({ ...f, paymentIban: e.target.value.toUpperCase() }))}
          placeholder="IT00 X000 0000 0000 0000 0000 000"
        />
        <TextField
          label="Note aggiuntive"
          multiline
          minRows={3}
          fullWidth
          size="small"
          value={form.additionalNotes}
          onChange={(e) => setForm((f) => ({ ...f, additionalNotes: e.target.value }))}
        />
      </Stack>
    </Box>
  );

  const formBody = loadingCatalog ? (
    <Box sx={{ py: 6, display: "flex", justifyContent: "center" }}>
      <CircularProgress size={28} sx={{ color: serviceColor }} />
    </Box>
  ) : variant === "page" ? (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1fr) minmax(0, 1.2fr)" },
        gap: 3,
        alignItems: "start",
      }}
    >
      <Stack spacing={3}>
        {contractSection}
        {serviceSection}
      </Stack>
      <Stack spacing={3}>
        {customerSection}
        {paymentSection}
      </Stack>
      {error && (
        <Typography color="error" sx={{ fontSize: "0.875rem", gridColumn: "1 / -1" }}>
          {error}
        </Typography>
      )}
    </Box>
  ) : (
    <Stack spacing={3}>
      {contractSection}
      <Divider />
      {customerSection}
      <Divider />
      {serviceSection}
      <Divider />
      {paymentSection}
      {error && (
        <Typography color="error" sx={{ fontSize: "0.875rem" }}>{error}</Typography>
      )}
    </Stack>
  );

  const actions = (
    <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end" }}>
      <Button onClick={onClose}>Annulla</Button>
      <Button
        variant="contained"
        onClick={handleSave}
        disabled={saving || loadingCatalog || !isCreateOnly}
        sx={{ background: serviceColor }}
      >
        {saving ? "Salvataggio..." : "Crea contratto"}
      </Button>
    </Stack>
  );

  if (variant === "page") {
    return (
      <Box sx={{ width: "100%", minWidth: 0 }}>
        <Box sx={{ mb: 3 }}>
          <Typography sx={{ fontWeight: 700, fontSize: "1.5rem" }}>Nuovo contratto</Typography>
          <Typography color="text.secondary" sx={{ fontSize: "0.875rem" }}>
            Compila il modulo per inviare una nuova opportunity
          </Typography>
          {draftChip}
        </Box>
        <Box sx={[shellPanelSx, { p: { xs: 2, md: 3 } }]}>
          {formBody}
          <Box sx={{ mt: 3, pt: 3, borderTop: 1, borderColor: "divider" }}>{actions}</Box>
        </Box>
      </Box>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth scroll="paper">
      <DialogTitle>{isCreateOnly ? "Nuovo contratto" : "Dettaglio contratto"}</DialogTitle>
      <DialogContent dividers>{formBody}</DialogContent>
      <DialogActions>{actions}</DialogActions>
    </Dialog>
  );
}
