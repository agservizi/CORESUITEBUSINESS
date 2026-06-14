"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Typography,
  CircularProgress,
  MenuItem,
  IconButton,
  Box,
  Switch,
  FormControlLabel,
  Chip,
  Tabs,
  Tab,
  Divider,
  Alert,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import ClientPicker from "@/components/platform/ClientPicker";
import { AppDateField } from "@/components/layout/app-shell";
import { computeQuoteTotals, formatEuro } from "@/lib/business/web-quote-utils";
import {
  DEFAULT_MILESTONES,
  DEFAULT_PACKAGES,
  DEFAULT_TERMS,
  WEB_PROJECT_TYPES,
  WEB_QUOTE_CATEGORIES,
  WEB_QUOTE_TEMPLATES,
  type WebQuoteInput,
  type WebQuoteItemInput,
} from "@/lib/business/web-quote-types";
import { dialogFormContentSx, dialogFormGridSx, dialogStaticLabelSx, shellDialogPaperSx } from "@/theme/shell-tokens";
import { readJsonResponse } from "@/lib/fetch-client";

const ACCENT_PRESETS = ["#6366f1", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ec4899"];

const EMPTY_ITEM = (): WebQuoteItemInput => ({
  title: "",
  description: "",
  category: "Sviluppo",
  quantity: 1,
  unitPrice: 0,
  isOptional: false,
  isPremium: false,
});

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  quoteId?: string;
}

export default function WebQuoteDialog({ open, onClose, onSaved, quoteId }: Props) {
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<WebQuoteInput>({
    title: "",
    clientId: "",
    projectType: "website",
    validUntil: "",
    introduction: "",
    scopeNotes: "",
    terms: DEFAULT_TERMS,
    paymentPlan: "40% all'ordine · 40% a milestone design · 20% al go-live",
    discountPercent: 0,
    taxPercent: 22,
    templateStyle: "premium",
    accentColor: "#6366f1",
    showBranding: true,
    includeTimeline: true,
    includePackages: false,
    packages: DEFAULT_PACKAGES,
    milestones: DEFAULT_MILESTONES,
    items: [EMPTY_ITEM()],
  });

  const totals = useMemo(
    () => computeQuoteTotals(form.items || [], form.discountPercent ?? 0, form.taxPercent ?? 22),
    [form.items, form.discountPercent, form.taxPercent]
  );

  useEffect(() => {
    if (!open) return;
    setTab(0);
    setError("");
    if (!quoteId) {
      setForm({
        title: "",
        clientId: "",
        projectType: "website",
        validUntil: "",
        introduction: "",
        scopeNotes: "",
        terms: DEFAULT_TERMS,
        paymentPlan: "40% all'ordine · 40% a milestone design · 20% al go-live",
        discountPercent: 0,
        taxPercent: 22,
        templateStyle: "premium",
        accentColor: "#6366f1",
        showBranding: true,
        includeTimeline: true,
        includePackages: false,
        packages: DEFAULT_PACKAGES,
        milestones: DEFAULT_MILESTONES,
        items: [EMPTY_ITEM()],
      });
      return;
    }
    setLoading(true);
    fetch(`/api/business/preventivi/${quoteId}`)
      .then(async (r) => {
        const data = await readJsonResponse<{
          error?: string;
          title?: string;
          clientId?: string;
          projectType?: string;
          validUntil?: string | null;
          introduction?: string | null;
          scopeNotes?: string | null;
          terms?: string | null;
          paymentPlan?: string | null;
          discountPercent?: number;
          taxPercent?: number;
          templateStyle?: string;
          accentColor?: string;
          showBranding?: boolean;
          includeTimeline?: boolean;
          includePackages?: boolean;
          packages?: WebQuoteInput["packages"];
          milestones?: WebQuoteInput["milestones"];
          status?: string;
          items?: WebQuoteItemInput[];
        }>(r);
        if (!r.ok || !data) throw new Error(data?.error || "Errore caricamento preventivo");
        if (data.error) throw new Error(data.error);
        setForm({
          title: data.title || "",
          clientId: data.clientId || "",
          projectType: data.projectType || "website",
          validUntil: data.validUntil ? String(data.validUntil).slice(0, 10) : "",
          introduction: data.introduction || "",
          scopeNotes: data.scopeNotes || "",
          terms: data.terms || DEFAULT_TERMS,
          paymentPlan: data.paymentPlan || "",
          discountPercent: data.discountPercent ?? 0,
          taxPercent: data.taxPercent ?? 22,
          templateStyle: data.templateStyle || "premium",
          accentColor: data.accentColor || "#6366f1",
          showBranding: data.showBranding ?? true,
          includeTimeline: data.includeTimeline ?? true,
          includePackages: data.includePackages ?? false,
          packages: (data.packages as WebQuoteInput["packages"]) || DEFAULT_PACKAGES,
          milestones: (data.milestones as WebQuoteInput["milestones"]) || DEFAULT_MILESTONES,
          status: data.status,
          items: (data.items || []).map((item: WebQuoteItemInput) => ({
            title: item.title,
            description: item.description || "",
            category: item.category || "",
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            isOptional: item.isOptional,
            isPremium: item.isPremium,
          })),
        });
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Errore caricamento"))
      .finally(() => setLoading(false));
  }, [open, quoteId]);

  function setField<K extends keyof WebQuoteInput>(key: K, value: WebQuoteInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function setItem(index: number, patch: Partial<WebQuoteItemInput>) {
    setForm((f) => ({
      ...f,
      items: (f.items || []).map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }));
  }

  function addItem() {
    setForm((f) => ({ ...f, items: [...(f.items || []), EMPTY_ITEM()] }));
  }

  function removeItem(index: number) {
    setForm((f) => ({
      ...f,
      items: (f.items || []).filter((_, i) => i !== index),
    }));
  }

  function applyTemplate(projectType: string) {
    const tpl = WEB_QUOTE_TEMPLATES[projectType];
    if (!tpl) return;
    setForm((f) => ({
      ...f,
      projectType,
      title: tpl.title,
      introduction: tpl.introduction,
      scopeNotes: tpl.scopeNotes ?? "",
      paymentPlan: tpl.paymentPlan ?? f.paymentPlan,
      milestones: (tpl.milestones ?? DEFAULT_MILESTONES).map((m) => ({ ...m })),
      items: tpl.items.map((item) => ({ ...item })),
    }));
  }

  async function handleSubmit() {
    if (!form.title?.trim() || !form.clientId) {
      setError("Titolo e cliente sono obbligatori");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(
        quoteId ? `/api/business/preventivi/${quoteId}` : "/api/business/preventivi",
        {
          method: quoteId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }
      );
      const data = await readJsonResponse<{ error?: string }>(res);
      if (!res.ok || !data) throw new Error(data?.error || "Errore salvataggio");
      if (data.error) throw new Error(data.error);
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore salvataggio");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth slotProps={{ paper: { sx: shellDialogPaperSx } }}>
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pb: 0 }}>
        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: "1.1rem" }}>
            {quoteId ? "Modifica preventivo" : "Nuovo preventivo web"}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Web Agency · PDF premium · template professionale
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: "text.secondary" }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 3, borderBottom: 1, borderColor: "divider" }}>
        <Tab label="Progetto" sx={{ textTransform: "none", fontSize: "0.85rem" }} />
        <Tab label="Voci & totali" sx={{ textTransform: "none", fontSize: "0.85rem" }} />
        <Tab label="Premium PDF" sx={{ textTransform: "none", fontSize: "0.85rem" }} icon={<AutoAwesomeIcon sx={{ fontSize: 16 }} />} iconPosition="start" />
      </Tabs>

      <DialogContent sx={dialogFormContentSx}>
        {loading ? (
          <Box sx={{ py: 6, textAlign: "center" }}><CircularProgress size={28} /></Box>
        ) : (
          <>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {tab === 0 && (
              <Grid container spacing={2} sx={dialogFormGridSx}>
                <Grid size={12}>
                  <Typography sx={dialogStaticLabelSx}>Template rapido web agency</Typography>
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                    {WEB_PROJECT_TYPES.map((t) => {
                      const tpl = WEB_QUOTE_TEMPLATES[t.value];
                      const selected = form.projectType === t.value;
                      return (
                        <Chip
                          key={t.value}
                          label={t.label}
                          onClick={() => tpl && applyTemplate(t.value)}
                          disabled={!tpl}
                          color={selected ? "primary" : "default"}
                          variant={selected ? "filled" : "outlined"}
                          sx={{ cursor: tpl ? "pointer" : "default" }}
                        />
                      );
                    })}
                  </Box>
                </Grid>
                <Grid size={12}>
                  <Typography component="label" htmlFor="quote-title" sx={dialogStaticLabelSx}>Titolo preventivo *</Typography>
                  <TextField id="quote-title" fullWidth size="small" value={form.title} onChange={(e) => setField("title", e.target.value)} />
                </Grid>
                <Grid size={12}>
                  <ClientPicker value={form.clientId || ""} onChange={(id) => setField("clientId", id)} required allowQuickCreate />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField fullWidth size="small" select label="Tipologia progetto" value={form.projectType} onChange={(e) => setField("projectType", e.target.value)}>
                    {WEB_PROJECT_TYPES.map((t) => (
                      <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <AppDateField fullWidth label="Valido fino al" value={form.validUntil || ""} onChange={(v) => setField("validUntil", v)} />
                </Grid>
                <Grid size={12}>
                  <TextField fullWidth size="small" multiline rows={3} label="Introduzione commerciale" value={form.introduction} onChange={(e) => setField("introduction", e.target.value)} />
                </Grid>
                <Grid size={12}>
                  <TextField fullWidth size="small" multiline rows={2} label="Ambito / note di scope" value={form.scopeNotes} onChange={(e) => setField("scopeNotes", e.target.value)} />
                </Grid>
              </Grid>
            )}

            {tab === 1 && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {(form.items || []).map((item, index) => (
                  <Box key={index} sx={{ p: 2, borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1.5 }}>
                      <Typography sx={{ fontWeight: 600, fontSize: "0.85rem" }}>Voce {index + 1}</Typography>
                      <IconButton size="small" onClick={() => removeItem(index)} disabled={(form.items?.length || 0) <= 1}>
                        <DeleteOutlineOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Box>
                    <Grid container spacing={1.5}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField fullWidth size="small" label="Titolo" value={item.title} onChange={(e) => setItem(index, { title: e.target.value })} />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField fullWidth size="small" select label="Categoria" value={item.category || ""} onChange={(e) => setItem(index, { category: e.target.value })}>
                          {WEB_QUOTE_CATEGORIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                        </TextField>
                      </Grid>
                      <Grid size={12}>
                        <TextField fullWidth size="small" label="Descrizione" value={item.description || ""} onChange={(e) => setItem(index, { description: e.target.value })} />
                      </Grid>
                      <Grid size={4}>
                        <TextField fullWidth size="small" type="number" label="Q.tà" value={item.quantity} onChange={(e) => setItem(index, { quantity: Number(e.target.value) })} />
                      </Grid>
                      <Grid size={4}>
                        <TextField fullWidth size="small" type="number" label="Prezzo unitario €" value={item.unitPrice} onChange={(e) => setItem(index, { unitPrice: Number(e.target.value) })} />
                      </Grid>
                      <Grid size={4}>
                        <TextField fullWidth size="small" label="Totale" value={formatEuro(computeQuoteTotals([item]).subtotal)} slotProps={{ input: { readOnly: true } }} />
                      </Grid>
                      <Grid size={12}>
                        <FormControlLabel control={<Switch size="small" checked={Boolean(item.isPremium)} onChange={(e) => setItem(index, { isPremium: e.target.checked })} />} label="Voce premium" />
                        <FormControlLabel control={<Switch size="small" checked={Boolean(item.isOptional)} onChange={(e) => setItem(index, { isOptional: e.target.checked })} />} label="Opzionale" sx={{ ml: 2 }} />
                      </Grid>
                    </Grid>
                  </Box>
                ))}
                <Button startIcon={<AddIcon />} onClick={addItem} sx={{ alignSelf: "flex-start" }}>Aggiungi voce</Button>
                <Divider />
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <TextField fullWidth size="small" type="number" label="Sconto %" value={form.discountPercent} onChange={(e) => setField("discountPercent", Number(e.target.value))} />
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <TextField fullWidth size="small" type="number" label="IVA %" value={form.taxPercent} onChange={(e) => setField("taxPercent", Number(e.target.value))} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Box sx={{ p: 2, borderRadius: 2, background: "linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08))" }}>
                      <Typography variant="caption" color="text.secondary">Totale preventivo</Typography>
                      <Typography sx={{ fontWeight: 800, fontSize: "1.4rem", color: form.accentColor || "#6366f1" }}>
                        {formatEuro(totals.total)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Imponibile {formatEuro(totals.subtotal - totals.discountAmount)} + IVA {formatEuro(totals.taxAmount)}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            )}

            {tab === 2 && (
              <Grid container spacing={2} sx={dialogFormGridSx}>
                <Grid size={12}>
                  <Alert severity="info" icon={<AutoAwesomeIcon fontSize="inherit" />}>
                    Funzioni premium incluse nel PDF: header brandizzato, pacchetti comparativi, timeline di progetto e layout print-ready.
                  </Alert>
                </Grid>
                <Grid size={12}>
                  <Typography sx={dialogStaticLabelSx}>Colore accent brand</Typography>
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                    {ACCENT_PRESETS.map((color) => (
                      <Box
                        key={color}
                        onClick={() => setField("accentColor", color)}
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          bgcolor: color,
                          cursor: "pointer",
                          border: form.accentColor === color ? "3px solid #fff" : "2px solid transparent",
                          boxShadow: form.accentColor === color ? `0 0 0 2px ${color}` : "none",
                        }}
                      />
                    ))}
                  </Box>
                </Grid>
                <Grid size={12}>
                  <FormControlLabel control={<Switch checked={Boolean(form.includePackages)} onChange={(e) => setField("includePackages", e.target.checked)} />} label="Includi comparativa pacchetti Essential / Growth / Scale" />
                </Grid>
                <Grid size={12}>
                  <FormControlLabel control={<Switch checked={Boolean(form.includeTimeline)} onChange={(e) => setField("includeTimeline", e.target.checked)} />} label="Includi timeline di progetto nel PDF" />
                </Grid>
                <Grid size={12}>
                  <FormControlLabel control={<Switch checked={Boolean(form.showBranding)} onChange={(e) => setField("showBranding", e.target.checked)} />} label="Branding studio nel documento" />
                </Grid>
                <Grid size={12}>
                  <TextField fullWidth size="small" multiline rows={2} label="Piano pagamenti" value={form.paymentPlan || ""} onChange={(e) => setField("paymentPlan", e.target.value)} />
                </Grid>
                <Grid size={12}>
                  <TextField fullWidth size="small" multiline rows={3} label="Termini e condizioni" value={form.terms || ""} onChange={(e) => setField("terms", e.target.value)} />
                </Grid>
              </Grid>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button onClick={onClose} sx={{ color: "text.secondary" }}>Annulla</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={saving || loading}
          sx={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
        >
          {saving ? <CircularProgress size={18} sx={{ color: "#fff" }} /> : quoteId ? "Salva preventivo" : "Crea preventivo"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
