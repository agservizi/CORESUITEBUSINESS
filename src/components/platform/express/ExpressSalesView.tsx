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
  Divider,
  Grid,
  TextField,
  MenuItem,
  Checkbox,
  Alert,
  InputAdornment,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CancelIcon from "@mui/icons-material/Cancel";
import PrintIcon from "@mui/icons-material/Print";
import ReplayIcon from "@mui/icons-material/Replay";
import DownloadIcon from "@mui/icons-material/Download";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import { apiFetch, readJsonResponse } from "@/lib/fetch-client";
import { AppDateField } from "@/components/layout/app-shell";
import { money, statusColor, type SaleRow } from "./express-utils";
import {
  printExpressReceipt,
  saleToReceiptInput,
  type ExpressStoreInfo,
} from "./express-receipt";

interface OperatorOption {
  id: string;
  name: string;
}

interface Props {
  serviceColor: string;
  initialSaleId?: string | null;
  onRefresh?: () => void;
}

export default function ExpressSalesView({ serviceColor, initialSaleId, onRefresh }: Props) {
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [selected, setSelected] = useState<SaleRow | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [operators, setOperators] = useState<OperatorOption[]>([]);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPayment, setFilterPayment] = useState("");
  const [filterOperator, setFilterOperator] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [refundSelection, setRefundSelection] = useState<Record<string, { checked: boolean; qty: number }>>({});
  const [refunding, setRefunding] = useState(false);
  const [refundError, setRefundError] = useState("");
  const [storeInfo, setStoreInfo] = useState<ExpressStoreInfo | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ view: "sales", page: String(page), limit: "50" });
    if (filterStatus) params.set("status", filterStatus);
    if (filterPayment) params.set("paymentMethod", filterPayment);
    if (filterOperator) params.set("operatorId", filterOperator);
    if (filterFrom) params.set("from", filterFrom);
    if (filterTo) params.set("to", filterTo);
    if (search.trim()) params.set("search", search.trim());

    const res = await fetch(`/api/platform/express?${params}`, { credentials: "include" });
    const data = await readJsonResponse<{ items: SaleRow[]; totalPages?: number; total?: number }>(res);
    if (res.ok && data) {
      setSales(data.items || []);
      setTotalPages(data.totalPages ?? 1);
      setTotalCount(data.total ?? data.items?.length ?? 0);
    }
    setLoading(false);
  }, [filterStatus, filterPayment, filterOperator, filterFrom, filterTo, search, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    fetch("/api/platform/express?view=impostazioni", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (d.settings) setStoreInfo(d.settings as ExpressStoreInfo);
      });
    fetch("/api/platform/express?view=operatori", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setOperators(d.items || []));
  }, []);

  useEffect(() => {
    if (initialSaleId) openDetail(initialSaleId);
  }, [initialSaleId]);

  async function openDetail(id: string) {
    const res = await fetch(`/api/platform/express?id=${id}`, { credentials: "include" });
    const data = await readJsonResponse<{ sale: SaleRow }>(res);
    if (res.ok && data?.sale) {
      setSelected(data.sale);
      const sel: Record<string, { checked: boolean; qty: number }> = {};
      (data.sale.lines || []).forEach((l) => {
        const maxReturn = (l.quantity ?? 1) - (l.returnedQty ?? 0);
        if (maxReturn > 0) sel[l.id] = { checked: false, qty: 1 };
      });
      setRefundSelection(sel);
      setRefundError("");
    }
  }

  async function cancelSale(id: string) {
    if (!confirm("Annullare questa vendita? Le SIM torneranno in stock.")) return;
    const res = await apiFetch("/api/platform/express", {
      method: "POST",
      body: JSON.stringify({ action: "cancelSale", id }),
    });
    if (res.ok) {
      setSelected(null);
      load();
      onRefresh?.();
    }
  }

  async function submitRefund() {
    if (!selected) return;
    const refunds = Object.entries(refundSelection)
      .filter(([, v]) => v.checked && v.qty > 0)
      .map(([lineId, v]) => ({ lineId, quantity: v.qty }));
    if (!refunds.length) {
      setRefundError("Seleziona almeno una riga da rimborsare");
      return;
    }
    setRefunding(true);
    setRefundError("");
    const res = await apiFetch("/api/platform/express", {
      method: "POST",
      body: JSON.stringify({ action: "refundSale", id: selected.id, refunds }),
    });
    const data = await readJsonResponse<{ sale?: SaleRow; error?: string }>(res);
    setRefunding(false);
    if (res.ok && data?.sale) {
      setSelected(data.sale);
      load();
      onRefresh?.();
    } else {
      setRefundError(data?.error || "Errore rimborso");
    }
  }

  function printReceipt() {
    if (!selected) return;
    printExpressReceipt(storeInfo ?? {}, saleToReceiptInput(selected));
  }

  function exportCsv() {
    const params = new URLSearchParams({ view: "sales", export: "csv" });
    if (filterStatus) params.set("status", filterStatus);
    if (filterFrom) params.set("from", filterFrom);
    if (filterTo) params.set("to", filterTo);
    if (search.trim()) params.set("search", search.trim());
    window.open(`/api/platform/express?${params}`, "_blank");
  }

  function downloadPdf(saleId: string) {
    window.open(`/api/platform/express?id=${saleId}&format=pdf`, "_blank");
  }

  const paymentMethods = Array.from(new Set(sales.map((s) => s.paymentMethod))).sort();

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, flexWrap: "wrap", gap: 2 }}>
        <Typography sx={{ fontWeight: 700, fontSize: "1.25rem" }}>Storico vendite</Typography>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
          <Button size="small" startIcon={<DownloadIcon />} onClick={exportCsv} variant="outlined">
            Export CSV
          </Button>
          <TextField
          size="small"
          placeholder="Cerca cliente, pagamento…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
          sx={{ width: 280 }}
        />
        </Box>
      </Box>

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
        <TextField
          select
          size="small"
          label="Stato"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="">Tutti</MenuItem>
          <MenuItem value="Completata">Completata</MenuItem>
          <MenuItem value="Annullata">Annullata</MenuItem>
          <MenuItem value="Parzialmente rimborsata">Parz. rimborsata</MenuItem>
          <MenuItem value="Rimborsata">Rimborsata</MenuItem>
        </TextField>
        <TextField
          select
          size="small"
          label="Pagamento"
          value={filterPayment}
          onChange={(e) => setFilterPayment(e.target.value)}
          sx={{ minWidth: 140 }}
        >
          <MenuItem value="">Tutti</MenuItem>
          {paymentMethods.map((m) => (
            <MenuItem key={m} value={m}>
              {m}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Operatore"
          value={filterOperator}
          onChange={(e) => setFilterOperator(e.target.value)}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">Tutti</MenuItem>
          {operators.map((op) => (
            <MenuItem key={op.id} value={op.id}>
              {op.name}
            </MenuItem>
          ))}
        </TextField>
        <AppDateField
          label="Da"
          value={filterFrom}
          onChange={setFilterFrom}
        />
        <AppDateField
          label="A"
          value={filterTo}
          onChange={setFilterTo}
        />
      </Box>

      <Card variant="outlined">
        <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Data</TableCell>
                <TableCell>Cliente</TableCell>
                <TableCell>Importo</TableCell>
                <TableCell>Pagamento</TableCell>
                <TableCell>Stato</TableCell>
                <TableCell align="right">Righe</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {!loading &&
                sales.map((sale) => (
                  <TableRow
                    key={sale.id}
                    hover
                    sx={{ cursor: "pointer" }}
                    onClick={() => openDetail(sale.id)}
                  >
                    <TableCell>
                      {new Date(sale.soldAt).toLocaleString("it-IT", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell>{sale.client?.name || "—"}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{money(sale.total)}</TableCell>
                    <TableCell>{sale.paymentMethod}</TableCell>
                    <TableCell>
                      <Chip label={sale.status} size="small" color={statusColor(sale.status)} />
                    </TableCell>
                    <TableCell align="right">{sale._count?.lines ?? sale.lines?.length ?? 0}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 2 }}>
        <Typography variant="body2" color="text.secondary">
          {totalCount} vendite · pagina {page} di {totalPages}
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button size="small" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Precedente
          </Button>
          <Button size="small" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Successiva
          </Button>
        </Box>
      </Box>

      <Dialog open={Boolean(selected)} onClose={() => setSelected(null)} maxWidth="md" fullWidth>
        {selected && (
          <>
            <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              Dettaglio vendita
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button size="small" startIcon={<PrintIcon />} onClick={printReceipt}>
                  Ricevuta
                </Button>
                <Button size="small" startIcon={<PictureAsPdfIcon />} onClick={() => downloadPdf(selected.id)}>
                  PDF
                </Button>
                {selected.status === "Completata" && (
                  <Button
                    color="error"
                    size="small"
                    startIcon={<CancelIcon />}
                    onClick={() => cancelSale(selected.id)}
                  >
                    Annulla
                  </Button>
                )}
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">
                    Cliente
                  </Typography>
                  <Typography>{selected.client?.name || "—"}</Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">
                    Totale
                  </Typography>
                  <Typography sx={{ fontWeight: 700, color: serviceColor }}>
                    {money(selected.total)}
                  </Typography>
                </Grid>
              </Grid>
              <Divider sx={{ mb: 2 }} />
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Descrizione</TableCell>
                    <TableCell>Dettaglio</TableCell>
                    <TableCell align="center">Qtà</TableCell>
                    <TableCell align="center">Resi</TableCell>
                    <TableCell align="right">Importo</TableCell>
                    {(selected.status === "Completata" || selected.status === "Parzialmente rimborsata") && (
                      <TableCell align="center">Rimborso</TableCell>
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selected.lines?.map((line) => {
                    const qty = line.quantity ?? 1;
                    const returned = line.returnedQty ?? 0;
                    const maxReturn = qty - returned;
                    const sel = refundSelection[line.id];
                    const showRefund =
                      maxReturn > 0 &&
                      (selected.status === "Completata" || selected.status === "Parzialmente rimborsata");
                    return (
                      <TableRow key={line.id}>
                        <TableCell>{line.lineType}</TableCell>
                        <TableCell>{line.description}</TableCell>
                        <TableCell>
                          {[
                            line.assignedNumber || line.iccidStock?.assignedNumber
                              ? `Numero ${line.assignedNumber || line.iccidStock?.assignedNumber}`
                              : null,
                            line.iccidStock?.iccid
                              ? `ICCID …${line.iccidStock.iccid.slice(-8)}`
                              : null,
                            line.operator?.name,
                            line.product?.name,
                          ]
                            .filter(Boolean)
                            .join(" · ") || "—"}
                        </TableCell>
                        <TableCell align="center">{qty}</TableCell>
                        <TableCell align="center">
                          {returned > 0 ? (
                            <Chip label={returned} size="small" color="warning" />
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell align="right">{money(line.lineTotal)}</TableCell>
                        {(selected.status === "Completata" || selected.status === "Parzialmente rimborsata") && (
                          <TableCell align="center">
                            {showRefund ? (
                              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.5 }}>
                                <Checkbox
                                  size="small"
                                  checked={sel?.checked ?? false}
                                  onChange={(e) =>
                                    setRefundSelection((s) => ({
                                      ...s,
                                      [line.id]: { checked: e.target.checked, qty: sel?.qty ?? 1 },
                                    }))
                                  }
                                />
                                {sel?.checked && (
                                  <TextField
                                    size="small"
                                    type="number"
                                    value={sel.qty}
                                    onChange={(e) =>
                                      setRefundSelection((s) => ({
                                        ...s,
                                        [line.id]: {
                                          checked: true,
                                          qty: Math.min(maxReturn, Math.max(1, Number(e.target.value))),
                                        },
                                      }))
                                    }
                                    sx={{ width: 56 }}
                                  />
                                )}
                              </Box>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {(selected.status === "Completata" || selected.status === "Parzialmente rimborsata") && (
                <Box sx={{ mt: 2 }}>
                  {refundError && (
                    <Alert severity="error" sx={{ mb: 1 }}>
                      {refundError}
                    </Alert>
                  )}
                  <Button
                    variant="outlined"
                    startIcon={<ReplayIcon />}
                    onClick={submitRefund}
                    disabled={refunding}
                    color="warning"
                  >
                    {refunding ? "Rimborso…" : "Rimborso parziale"}
                  </Button>
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              {selected.cashMovementId && (
                <Button
                  href={`/services/entrate-uscite?id=${selected.cashMovementId}`}
                  startIcon={<AccountBalanceWalletIcon />}
                >
                  Movimento cassa
                </Button>
              )}
              <Button onClick={() => setSelected(null)}>Chiudi</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
