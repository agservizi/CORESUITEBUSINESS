"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Button,
  TextField,
  MenuItem,
  IconButton,
  Alert,
  Divider,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  alpha,
} from "@mui/material";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import { apiFetch, readJsonResponse } from "@/lib/fetch-client";
import { computeCampaignDiscount } from "@/lib/platform/express-discount";
import { resolveExpressLineVatRate } from "@/lib/platform/express-vat";
import ClientPicker from "../ClientPicker";
import { EXPRESS_GRADIENT, money, type OfferRow, type SaleRow } from "./express-utils";
import {
  mergePosCartIntoReceipt,
  printExpressReceipt,
  saleToReceiptInput,
  type ExpressStoreInfo,
} from "./express-receipt";
import ExpressClientInsightPanel from "./ExpressClientInsightPanel";
import ExpressCartSuggestions from "./ExpressCartSuggestions";
import ExpressCameraScanner from "./ExpressCameraScanner";
import ExpressPosScanQrDialog from "./ExpressPosScanQrDialog";
import ExpressDigitalReceiptDialog from "./ExpressDigitalReceiptDialog";
import AiSparkButton from "@/components/ai/AiSparkButton";

interface CartLine {
  key: string;
  lineType: string;
  description: string;
  unitPrice: number;
  lineDiscount?: number;
  operatorId?: string;
  offerId?: string;
  productId?: string;
  iccidStockId?: string;
  iccid?: string;
  assignedNumber?: string;
  vatRate?: number;
}

interface CampaignOption {
  id: string;
  name: string;
  type: string;
  value: number;
  description?: string | null;
}

interface PosContext {
  operators: {
    id: string;
    name: string;
    iccidStock: { id: string; iccid: string; assignedNumber?: string | null }[];
  }[];
  offers: OfferRow[];
  products: {
    id: string;
    name: string;
    price: number | string;
    stockQty: number;
    sku?: string | null;
    vatRate?: number;
  }[];
  settings: {
    payment_methods?: string[];
    default_payment_method?: string;
    default_vat?: number;
    sim_vat?: number;
    sim_price_default?: number;
    tax_note?: string;
    store_name?: string;
    store_address?: string;
    store_city?: string;
    store_vat?: string;
    store_phone?: string;
    store_email?: string;
    receipt_footer?: string;
    store_logo?: string;
  };
  campaigns?: CampaignOption[];
  taxNote?: string;
}

interface Props {
  serviceColor: string;
  onSaleComplete: () => void;
}

function isPhoneLikeDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|webOS|iPhone|iPod|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export default function ExpressPosView({ serviceColor, onSaleComplete }: Props) {
  const searchParams = useSearchParams();
  const [ctx, setCtx] = useState<PosContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientLookup, setClientLookup] = useState("");
  const [payment, setPayment] = useState("Contanti");
  const [discount, setDiscount] = useState(0);
  const [discountCampaignId, setDiscountCampaignId] = useState("");
  const [scanValue, setScanValue] = useState("");
  const [pendingAssignedNumber, setPendingAssignedNumber] = useState("");
  const [selectedOperator, setSelectedOperator] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [qrScanOpen, setQrScanOpen] = useState(false);
  const [marginInfo, setMarginInfo] = useState<{ margin: number; marginPct: number } | null>(null);
  const [digitalReceipt, setDigitalReceipt] = useState<{ saleId: string; token?: string | null } | null>(null);
  const [cashSessionOpen, setCashSessionOpen] = useState<boolean | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/platform/express?view=pos", { credentials: "include" });
      const data = await readJsonResponse<PosContext & { error?: string }>(res);

      if (!data || !res.ok) {
        const [opRes, offRes] = await Promise.all([
          fetch("/api/platform/express?view=operatori", { credentials: "include" }),
          fetch("/api/platform/express?view=offerte", { credentials: "include" }),
        ]);
        const opData = await readJsonResponse<{ items: PosContext["operators"] }>(opRes);
        const offData = await readJsonResponse<{ items: OfferRow[] }>(offRes);
        if (opData?.items?.length || offData?.items?.length) {
          setCtx((prev) => ({
            ...(prev ?? {
              products: [],
              settings: { payment_methods: ["Contanti", "Carta", "POS"], default_payment_method: "Contanti" },
            }),
            operators: opData?.items?.map((o) => ({
              id: o.id,
              name: o.name,
              iccidStock: o.iccidStock ?? [],
            })) ?? [],
            offers: offData?.items ?? [],
          }));
        }
        throw new Error(data?.error || `Errore caricamento POS (${res.status})`);
      }

      setCtx(data);
      setPayment(data.settings?.default_payment_method || "Contanti");
      const ops = data.operators ?? [];
      const offs = data.offers ?? [];
      if (ops.length) {
        const withOffers = ops.find((op) =>
          offs.some((o) => o.operatorId === op.id || o.operator?.id === op.id)
        );
        setSelectedOperator(withOffers?.id ?? ops[0].id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore caricamento cassa");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    fetch("/api/platform/entrate-uscite/cash-session", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setCashSessionOpen(d.session?.status === "OPEN"))
      .catch(() => setCashSessionOpen(null));
  }, []);

  useEffect(() => {
    const prefillId = searchParams.get("prefillRequest");
    if (!prefillId) return;
    fetch(`/api/platform/express?view=request-prefill&requestId=${prefillId}`, {
      credentials: "include",
    })
      .then((r) => r.json())
      .then((data) => {
        if (!data.prefill) return;
        const p = data.prefill;
        setClientId(p.clientId);
        if (p.paymentMethod) setPayment(p.paymentMethod);
        setCart(
          (p.lines || []).map(
            (l: { lineType: string; description: string; unitPrice: number; productId?: string }) => ({
              key: `${Date.now()}-${Math.random()}`,
              lineType: l.lineType,
              description: l.description,
              unitPrice: Number(l.unitPrice),
              productId: l.productId,
              lineDiscount: 0,
            })
          )
        );
        setSuccess(`Carrello precompilato da richiesta cliente (${p.clientName})`);
      });
  }, [searchParams]);

  useEffect(() => {
    if (!cart.length) {
      setMarginInfo(null);
      return;
    }
    const t = setTimeout(async () => {
      const res = await apiFetch("/api/platform/express", {
        method: "POST",
        body: JSON.stringify({
          action: "computeMargin",
          lines: cart.map((l) => ({
            lineType: l.lineType,
            unitPrice: l.unitPrice,
            lineDiscount: l.lineDiscount ?? 0,
            offerId: l.offerId,
            productId: l.productId,
          })),
        }),
      });
      const data = await readJsonResponse<{ margin?: { margin: number; marginPct: number } }>(res);
      if (res.ok && data?.margin) setMarginInfo(data.margin);
    }, 350);
    return () => clearTimeout(t);
  }, [cart]);

  async function lookupClientByPhone() {
    if (!clientLookup.trim()) return;
    const res = await fetch(
      `/api/platform/express?view=client-lookup&q=${encodeURIComponent(clientLookup.trim())}`,
      { credentials: "include" }
    );
    const data = await res.json();
    if (data.client?.id) {
      setClientId(data.client.id);
      setClientPhone(data.client.phone || clientLookup);
      setError("");
    } else {
      setError("Cliente non trovato — verifica telefono o codice fiscale");
    }
  }

  function applySuggestion(s: {
    kind: string;
    title: string;
    price: number;
    offerId?: string;
    productId?: string;
    operatorId?: string;
  }) {
    if (s.kind === "offer" && s.offerId) {
      const offer = ctx?.offers.find((o) => o.id === s.offerId);
      if (offer) addOffer(offer);
      return;
    }
    if (s.kind === "product" && s.productId) {
      const product = ctx?.products.find((p) => p.id === s.productId);
      if (product) addProduct(product);
      return;
    }
    if (s.kind === "sim") {
      setError("Scansiona un ICCID per aggiungere la SIM");
    }
  }

  const activeOffers = useMemo(
    () => (ctx?.offers || []).filter((o) => o.status === "Active"),
    [ctx]
  );

  useEffect(() => {
    if (!ctx?.operators?.length) return;
    const valid = ctx.operators.some((o) => o.id === selectedOperator);
    if (!selectedOperator || !valid) {
      const withOffers = ctx.operators.find((op) =>
        activeOffers.some((o) => o.operatorId === op.id || o.operator?.id === op.id)
      );
      setSelectedOperator(withOffers?.id ?? ctx.operators[0].id);
    }
  }, [ctx?.operators, selectedOperator, activeOffers]);

  const offersByOperator = useMemo(() => {
    if (!selectedOperator) return activeOffers;
    const forOperator = activeOffers.filter(
      (o) => o.operatorId === selectedOperator || o.operator?.id === selectedOperator
    );
    return forOperator.length > 0 ? forOperator : activeOffers;
  }, [activeOffers, selectedOperator]);

  const offersFilteredByOperator = useMemo(() => {
    if (!selectedOperator) return false;
    return activeOffers.some(
      (o) => o.operatorId === selectedOperator || o.operator?.id === selectedOperator
    );
  }, [activeOffers, selectedOperator]);

  const subtotal = cart.reduce((s, l) => s + Math.max(0, l.unitPrice - (l.lineDiscount ?? 0)), 0);
  const selectedCampaign = useMemo(
    () => (ctx?.campaigns || []).find((c) => c.id === discountCampaignId),
    [ctx?.campaigns, discountCampaignId]
  );
  const campaignDiscount = useMemo(
    () => (selectedCampaign ? computeCampaignDiscount(subtotal, selectedCampaign) : 0),
    [subtotal, selectedCampaign]
  );
  const total = Math.max(0, subtotal - discount - campaignDiscount);

  function updateLine(key: string, patch: Partial<CartLine>) {
    setCart((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function addLine(line: Omit<CartLine, "key">) {
    setCart((prev) => [...prev, { ...line, key: `${Date.now()}-${Math.random()}` }]);
  }

  function vatForLine(lineType: string, productVatRate?: number) {
    return resolveExpressLineVatRate(lineType, {
      defaultVat: ctx?.settings?.default_vat ?? 22,
      simVat: ctx?.settings?.sim_vat ?? 0,
      productVatRate,
    });
  }

  function addOffer(offer: OfferRow) {
    addLine({
      lineType: "servizio",
      description: offer.title,
      unitPrice: Number(offer.price),
      offerId: offer.id,
      operatorId: offer.operator?.id || offer.operatorId,
      vatRate: vatForLine("servizio"),
    });
  }

  function addProduct(p: PosContext["products"][0]) {
    if (p.stockQty <= 0) {
      setError("Prodotto esaurito");
      return;
    }
    addLine({
      lineType: "prodotto",
      description: p.name,
      unitPrice: Number(p.price),
      productId: p.id,
      vatRate: vatForLine("prodotto", Number(p.vatRate)),
    });
  }

  function addSimFromIccid(
    iccidRow: {
      id: string;
      iccid: string;
      assignedNumber?: string | null;
      operator?: { id: string; name: string };
    },
    overrideNumber?: string
  ) {
    const simPrice = ctx?.settings?.sim_price_default ?? 9.99;
    if (cart.some((l) => l.iccidStockId === iccidRow.id)) {
      setError("ICCID già nel carrello");
      return;
    }
    const assignedNumber =
      overrideNumber?.trim() ||
      iccidRow.assignedNumber?.trim() ||
      pendingAssignedNumber.trim() ||
      "";
    addLine({
      lineType: "sim",
      description: `SIM ${iccidRow.operator?.name || ""} · ${iccidRow.iccid.slice(-8)}`,
      unitPrice: simPrice,
      iccidStockId: iccidRow.id,
      iccid: iccidRow.iccid,
      assignedNumber,
      operatorId: iccidRow.operator?.id,
      vatRate: vatForLine("sim"),
    });
    setScanValue("");
    setPendingAssignedNumber("");
    setError("");
  }

  async function applyIccidFromScan(value: string, overrideNumber?: string | null) {
    const trimmed = value.trim();
    if (!trimmed) return;
    setScanValue(trimmed);
    const res = await fetch(`/api/platform/express?iccid=${encodeURIComponent(trimmed)}`);
    const data = await res.json();
    if (!data.iccid) {
      setError("ICCID non trovato o già venduto");
      return;
    }
    addSimFromIccid(data.iccid, overrideNumber || undefined);
  }

  async function handleScan() {
    if (!scanValue.trim()) return;
    await applyIccidFromScan(scanValue);
  }

  async function submitSale() {
    if (cart.length === 0) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await apiFetch("/api/platform/express", {
        method: "POST",
        body: JSON.stringify({
          action: "createSale",
          clientId: clientId || undefined,
          paymentMethod: payment,
          discount,
          discountCampaignId: discountCampaignId || undefined,
          lines: cart.map((l) => ({
            lineType: l.lineType,
            description: l.description,
            unitPrice: l.unitPrice,
            lineDiscount: l.lineDiscount ?? 0,
            offerId: l.offerId,
            operatorId: l.operatorId,
            productId: l.productId,
            iccidStockId: l.iccidStockId,
            assignedNumber: l.assignedNumber?.trim() || undefined,
            vatRate: l.vatRate ?? vatForLine(l.lineType),
          })),
        }),
      });
      const data = await readJsonResponse<{
        sale?: SaleRow;
        integrations?: { loyaltyPoints?: number; ticketCode?: string };
        error?: string;
      }>(res);
      if (!res.ok || !data?.sale) throw new Error(data?.error || "Errore vendita");

      const store: ExpressStoreInfo = {
        store_name: ctx?.settings?.store_name,
        store_address: ctx?.settings?.store_address,
        store_city: ctx?.settings?.store_city,
        store_vat: ctx?.settings?.store_vat,
        store_phone: ctx?.settings?.store_phone,
        store_email: ctx?.settings?.store_email,
        tax_note: ctx?.settings?.tax_note ?? ctx?.taxNote,
        default_vat: ctx?.settings?.default_vat,
        receipt_footer: ctx?.settings?.receipt_footer,
        store_logo: ctx?.settings?.store_logo,
      };
      printExpressReceipt(
        store,
        mergePosCartIntoReceipt(
          saleToReceiptInput(data.sale),
          cart,
          data.sale.lines?.map((l) => ({ iccidStockId: l.iccidStockId }))
        )
      );

      setCart([]);
      setClientId("");
      setDiscount(0);
      setDiscountCampaignId("");
      const integrationParts: string[] = [];
      if (data.integrations?.loyaltyPoints) {
        integrationParts.push(`+${data.integrations.loyaltyPoints} pt fedeltà`);
      }
      if (data.integrations?.ticketCode) {
        integrationParts.push(`ticket ${data.integrations.ticketCode}`);
      }
      setSuccess(
        integrationParts.length
          ? `Vendita registrata · ${integrationParts.join(" · ")}`
          : "Vendita registrata — ricevuta 80mm inviata alla stampante"
      );
      if (data.sale?.id) {
        setDigitalReceipt({
          saleId: data.sale.id,
          token: (data.sale as SaleRow & { receiptToken?: string }).receiptToken,
        });
      }
      onSaleComplete();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore vendita");
    } finally {
      setSaving(false);
    }
  }

  const taxNote = ctx?.taxNote || ctx?.settings?.tax_note;
  const operator = ctx?.operators.find((o) => o.id === selectedOperator);

  return (
    <Box>
      {cashSessionOpen === false && (
        <Alert severity="warning" sx={{ mb: 2 }} action={
          <Button color="inherit" size="small" href="/services/entrate-uscite?v=giornata&open=1">
            Apri cassa
          </Button>
        }>
          Giornata cassa non aperta — le vendite POS richiedono l&apos;apertura della cassa.
        </Alert>
      )}
      <Box
        sx={{
          mb: 3,
          p: 2.5,
          borderRadius: 3,
          background: EXPRESS_GRADIENT,
          color: "#fff",
          display: "flex",
          alignItems: "center",
          gap: 2,
        }}
      >
        <ShoppingCartIcon sx={{ fontSize: 36 }} />
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: "1.35rem" }}>Cassa POS Express</Typography>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            Scansiona ICCID, aggiungi offerte e prodotti — registrazione integrata con cassa
          </Typography>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess("")}>
          {success}
        </Alert>
      )}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 5 }}>
          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Typography sx={{ fontWeight: 700, mb: 2 }}>Carrello</Typography>
              <ClientPicker value={clientId} onChange={setClientId} label="Cliente (opzionale)" />
              <Box sx={{ display: "flex", gap: 1, mt: 1.5, mb: 1 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Telefono / CF / P.IVA"
                  value={clientLookup}
                  onChange={(e) => setClientLookup(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && lookupClientByPhone()}
                />
                <Button variant="outlined" onClick={lookupClientByPhone} sx={{ whiteSpace: "nowrap" }}>
                  Cerca
                </Button>
              </Box>
              {clientId && (
                <>
                  <ExpressClientInsightPanel clientId={clientId} serviceColor={serviceColor} />
                  <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1 }}>
                    <AiSparkButton
                      scope="express"
                      action="script"
                      entityId={clientId}
                      context={{ cart, payment, operator: selectedOperator }}
                      label="Script vendita AI"
                      inline={false}
                      color={serviceColor}
                    />
                  </Box>
                </>
              )}
              <ExpressCartSuggestions
                clientId={clientId}
                cart={cart}
                serviceColor={serviceColor}
                onApply={applySuggestion}
              />
              <TextField
                select
                fullWidth
                label="Pagamento"
                value={payment}
                onChange={(e) => setPayment(e.target.value)}
                sx={{ mt: 2, mb: 2 }}
                size="small"
              >
                {(ctx?.settings?.payment_methods || ["Contanti", "Carta", "POS"]).map((m) => (
                  <MenuItem key={m} value={m}>
                    {m}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                fullWidth
                label="Campagna sconto"
                value={discountCampaignId}
                onChange={(e) => setDiscountCampaignId(e.target.value)}
                size="small"
                sx={{ mb: 2 }}
              >
                <MenuItem value="">Nessuna campagna</MenuItem>
                {(ctx?.campaigns || []).map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name} ({c.type === "Percent" ? `${c.value}%` : money(c.value)})
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                fullWidth
                type="number"
                label="Sconto totale €"
                value={discount}
                onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
                size="small"
                sx={{ mb: 2 }}
              />

              {taxNote && (
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
                  {taxNote}
                </Typography>
              )}

              {cart.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
                  Carrello vuoto — aggiungi SIM, offerte o prodotti
                </Typography>
              ) : (
                <StackLines
                  cart={cart}
                  onRemove={(key) => setCart((c) => c.filter((l) => l.key !== key))}
                  onUpdateLine={updateLine}
                  serviceColor={serviceColor}
                />
              )}

              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                <Typography color="text.secondary">Subtotale</Typography>
                <Typography>{money(subtotal)}</Typography>
              </Box>
              {campaignDiscount > 0 && (
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                  <Typography color="text.secondary">
                    Sconto campagna{selectedCampaign ? ` (${selectedCampaign.name})` : ""}
                  </Typography>
                  <Typography color="error.main">− {money(campaignDiscount)}</Typography>
                </Box>
              )}
              {discount > 0 && (
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                  <Typography color="text.secondary">Sconto</Typography>
                  <Typography color="error.main">− {money(discount)}</Typography>
                </Box>
              )}
              {marginInfo && (
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                  <Typography color="text.secondary">Margine stimato</Typography>
                  <Chip
                    size="small"
                    label={`${money(marginInfo.margin)} (${marginInfo.marginPct.toFixed(1)}%)`}
                    color={marginInfo.margin >= 0 ? "success" : "error"}
                  />
                </Box>
              )}
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
                <Typography sx={{ fontWeight: 800, fontSize: "1.2rem" }}>Totale</Typography>
                <Typography sx={{ fontWeight: 800, fontSize: "1.2rem", color: serviceColor }}>
                  {money(total)}
                </Typography>
              </Box>
              <Button
                fullWidth
                variant="contained"
                size="large"
                disabled={cart.length === 0 || saving}
                onClick={submitSale}
                sx={{ background: serviceColor, py: 1.5, fontWeight: 700 }}
              >
                {saving ? "Registrazione…" : "Completa vendita"}
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 7 }}>
          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Typography sx={{ fontWeight: 700, mb: 1.5 }}>Scansione ICCID / barcode</Typography>
              <Grid container spacing={1.5}>
                <Grid size={{ xs: 12, md: 7 }}>
                  <TextField
                    fullWidth
                    label="ICCID"
                    placeholder="Inserisci o scansiona ICCID…"
                    value={scanValue}
                    onChange={(e) => setScanValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleScan()}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <QrCodeScannerIcon color="action" />
                          </InputAdornment>
                        ),
                      },
                    }}
                    size="small"
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 5 }}>
                  <TextField
                    fullWidth
                    label="Numero assegnato"
                    placeholder="Es. 3331234567"
                    value={pendingAssignedNumber}
                    onChange={(e) => setPendingAssignedNumber(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleScan()}
                    size="small"
                    helperText="Compare sulla ricevuta 80mm"
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Button
                    variant="outlined"
                    startIcon={<QrCodeScannerIcon />}
                    onClick={() => {
                      if (isPhoneLikeDevice()) setCameraOpen(true);
                      else setQrScanOpen(true);
                    }}
                    sx={{ borderColor: serviceColor, color: serviceColor, mr: 1 }}
                  >
                    Scansiona con smartphone
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={handleScan}
                    disabled={!scanValue.trim()}
                    sx={{ borderColor: serviceColor, color: serviceColor }}
                  >
                    Aggiungi SIM al carrello
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <FormControl fullWidth size="small" sx={{ mb: 2 }} disabled={loading || !ctx?.operators?.length}>
            <InputLabel id="express-pos-operator-label">Operatore</InputLabel>
            <Select
              labelId="express-pos-operator-label"
              label="Operatore"
              value={selectedOperator || ""}
              onChange={(e) => setSelectedOperator(String(e.target.value))}
            >
              {loading && (
                <MenuItem value="" disabled>
                  Caricamento…
                </MenuItem>
              )}
              {!loading && !(ctx?.operators || []).length && (
                <MenuItem value="" disabled>
                  Nessun operatore disponibile
                </MenuItem>
              )}
              {(ctx?.operators || []).map((op) => (
                <MenuItem key={op.id} value={op.id}>
                  {op.name} ({op.iccidStock?.length ?? 0} SIM)
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {operator && (operator.iccidStock?.length ?? 0) > 0 && (
            <Card variant="outlined" sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  SIM disponibili · {operator.name}
                </Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
                  {operator.iccidStock!.slice(0, 24).map((sim) => (
                    <Chip
                      key={sim.id}
                      label={
                        sim.assignedNumber
                          ? `${sim.iccid.slice(-10)} · ${sim.assignedNumber}`
                          : sim.iccid.slice(-10)
                      }
                      size="small"
                      clickable
                      onClick={() =>
                        addSimFromIccid({
                          id: sim.id,
                          iccid: sim.iccid,
                          assignedNumber: sim.assignedNumber,
                          operator: { id: operator.id, name: operator.name },
                        })
                      }
                      sx={{
                        fontFamily: "monospace",
                        "&:hover": { bgcolor: alpha(serviceColor, 0.15) },
                      }}
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>
          )}

          <Typography sx={{ fontWeight: 700, mb: 0.5 }}>Offerte rapide</Typography>
          {!offersFilteredByOperator && activeOffers.length > 0 && selectedOperator && (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
              Nessuna offerta per l&apos;operatore selezionato — mostro tutte le offerte attive
            </Typography>
          )}
          {offersByOperator.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Nessuna offerta attiva disponibile
            </Typography>
          ) : (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
              {offersByOperator.map((offer) => (
                <Chip
                  key={offer.id}
                  label={`${offer.operator?.name ? `${offer.operator.name} · ` : ""}${offer.title} · ${money(offer.price)}`}
                  onClick={() => addOffer(offer)}
                  clickable
                  variant="outlined"
                  sx={{ borderColor: alpha(serviceColor, 0.4) }}
                />
              ))}
            </Box>
          )}

          {(ctx?.products || []).length > 0 && (
            <>
              <Typography sx={{ fontWeight: 700, mb: 1 }}>Catalogo prodotti</Typography>
              <Grid container spacing={1}>
                {ctx!.products.map((p) => (
                  <Grid key={p.id} size={{ xs: 12, sm: 6 }}>
                    <Card
                      variant="outlined"
                      sx={{ cursor: "pointer", "&:hover": { borderColor: serviceColor } }}
                      onClick={() => addProduct(p)}
                    >
                      <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {p.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {money(p.price)} · stock {p.stockQty}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </>
          )}
        </Grid>
      </Grid>

      <ExpressPosScanQrDialog
        open={qrScanOpen}
        onClose={() => setQrScanOpen(false)}
        serviceColor={serviceColor}
        onIccidScanned={applyIccidFromScan}
      />

      <ExpressCameraScanner
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        serviceColor={serviceColor}
        onScan={applyIccidFromScan}
      />

      <ExpressDigitalReceiptDialog
        open={Boolean(digitalReceipt)}
        onClose={() => setDigitalReceipt(null)}
        saleId={digitalReceipt?.saleId || ""}
        receiptToken={digitalReceipt?.token}
        clientPhone={clientPhone || clientLookup || undefined}
      />
    </Box>
  );
}

function StackLines({
  cart,
  onRemove,
  onUpdateLine,
  serviceColor,
}: {
  cart: CartLine[];
  onRemove: (key: string) => void;
  onUpdateLine: (key: string, patch: Partial<CartLine>) => void;
  serviceColor: string;
}) {
  return (
    <Box>
      {cart.map((line) => {
        const net = Math.max(0, line.unitPrice - (line.lineDiscount ?? 0));
        const isSim = line.lineType === "sim";
        return (
          <Box
            key={line.key}
            sx={{
              py: 1.25,
              borderBottom: "1px solid",
              borderColor: "divider",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Chip label={line.lineType} size="small" sx={{ mr: 1, fontSize: "0.65rem" }} />
                <Typography component="span" variant="body2">
                  {line.description}
                </Typography>
                {isSim && line.iccid && (
                  <Typography
                    variant="caption"
                    sx={{ display: "block", fontFamily: "monospace", color: "text.secondary", mt: 0.25 }}
                  >
                    ICCID …{line.iccid.slice(-12)}
                  </Typography>
                )}
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {money(net)}
                </Typography>
                <IconButton size="small" onClick={() => onRemove(line.key)}>
                  <DeleteOutlinedIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 0.75 }}>
              <TextField
                size="small"
                type="number"
                label="Sconto riga €"
                value={line.lineDiscount ?? 0}
                onChange={(e) =>
                  onUpdateLine(line.key, { lineDiscount: Math.max(0, Number(e.target.value)) })
                }
                sx={{ width: 120 }}
              />
              {isSim && (
                <TextField
                  size="small"
                  required
                  label="Numero assegnato"
                  placeholder="Es. 3331234567"
                  value={line.assignedNumber ?? ""}
                  onChange={(e) => onUpdateLine(line.key, { assignedNumber: e.target.value })}
                  sx={{
                    flex: 1,
                    minWidth: 160,
                    "& .MuiOutlinedInput-root": {
                      bgcolor: alpha(serviceColor, 0.06),
                    },
                  }}
                  helperText="Stampato sulla ricevuta termica"
                />
              )}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
