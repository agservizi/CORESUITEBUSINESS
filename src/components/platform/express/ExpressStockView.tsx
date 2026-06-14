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
  TextField,
  MenuItem,
  Button,
  Grid,
  Pagination,
  Alert,
  alpha,
  IconButton,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import SimCardIcon from "@mui/icons-material/SimCard";
import SaveIcon from "@mui/icons-material/Save";
import { apiFetch, readJsonResponse } from "@/lib/fetch-client";
import { statusColor } from "./express-utils";

interface StockRow {
  id: string;
  iccid: string;
  assignedNumber?: string | null;
  status: string;
  operator: { id: string; name: string };
  sale?: { id: string; mysqlId: number | null } | null;
  createdAt: string;
}

interface OperatorOption {
  id: string;
  name: string;
  reorderThreshold?: number;
  _count?: { iccidStock: number };
}

interface Props {
  serviceColor: string;
}

export default function ExpressStockView({ serviceColor }: Props) {
  const [items, setItems] = useState<StockRow[]>([]);
  const [operators, setOperators] = useState<OperatorOption[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [operatorId, setOperatorId] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [importOp, setImportOp] = useState("");
  const [importRaw, setImportRaw] = useState("");
  const [feedback, setFeedback] = useState("");
  const [importing, setImporting] = useState(false);
  const [thresholdDraft, setThresholdDraft] = useState<Record<string, string>>({});
  const [savingThreshold, setSavingThreshold] = useState<string | null>(null);
  const [numberDraft, setNumberDraft] = useState<Record<string, string>>({});
  const [savingNumber, setSavingNumber] = useState<string | null>(null);

  const loadOperators = useCallback(async () => {
    const res = await fetch("/api/platform/express?view=operators");
    const data = await readJsonResponse<{ items: OperatorOption[] }>(res);
    if (res.ok && data) {
      const ops = data.items || [];
      setOperators(ops.map((o) => ({ id: o.id, name: o.name, reorderThreshold: o.reorderThreshold, _count: o._count })));
      if (ops[0]) setImportOp(ops[0].id);
      const drafts: Record<string, string> = {};
      ops.forEach((o) => {
        drafts[o.id] = String(o.reorderThreshold ?? 10);
      });
      setThresholdDraft(drafts);
    }
  }, []);

  const loadStock = useCallback(async () => {
    const params = new URLSearchParams({
      view: "magazzino",
      page: String(page),
      perPage: "15",
    });
    if (operatorId) params.set("operatorId", operatorId);
    if (status) params.set("status", status);
    if (search.trim()) params.set("search", search.trim());

    const res = await fetch(`/api/platform/express?${params}`);
    const data = await res.json();
    if (res.ok) {
      setItems(data.items || []);
      setPages(data.pages || 1);
      setTotal(data.total || 0);
      const drafts: Record<string, string> = {};
      (data.items || []).forEach((row: StockRow) => {
        drafts[row.id] = row.assignedNumber ?? "";
      });
      setNumberDraft(drafts);
    }
  }, [page, operatorId, status, search]);

  useEffect(() => {
    loadOperators();
  }, [loadOperators]);

  useEffect(() => {
    loadStock();
  }, [loadStock]);

  async function handleImport() {
    if (!importOp || !importRaw.trim()) return;
    setImporting(true);
    setFeedback("");
    const res = await apiFetch("/api/platform/express", {
      method: "POST",
      body: JSON.stringify({
        action: "importIccid",
        operatorId: importOp,
        raw: importRaw,
      }),
    });
    const data = await readJsonResponse<{ created?: number; skipped?: number; error?: string }>(res);
    setImporting(false);
    if (res.ok && data) {
      setFeedback(`Importate ${data.created} SIM (${data.skipped} duplicate saltate)`);
      setImportRaw("");
      loadStock();
      loadOperators();
    } else {
      setFeedback(data?.error || "Errore import");
    }
  }

  async function handleCsvFile(file: File | null) {
    if (!file) return;
    const text = await file.text();
    setImportRaw(text);
    setFeedback(`File "${file.name}" caricato (${text.split(/[\n,;]+/).filter(Boolean).length} righe)`);
  }

  async function saveThreshold(operatorId: string) {
    const threshold = Number(thresholdDraft[operatorId]);
    if (Number.isNaN(threshold) || threshold < 0) return;
    setSavingThreshold(operatorId);
    const res = await apiFetch("/api/platform/express", {
      method: "POST",
      body: JSON.stringify({ action: "updateThreshold", operatorId, threshold }),
    });
    setSavingThreshold(null);
    if (res.ok) {
      setFeedback("Soglia operatore aggiornata");
      loadOperators();
    }
  }

  async function saveAssignedNumber(id: string) {
    setSavingNumber(id);
    setFeedback("");
    const res = await apiFetch("/api/platform/express", {
      method: "POST",
      body: JSON.stringify({
        action: "updateIccidNumber",
        id,
        assignedNumber: numberDraft[id] ?? "",
      }),
    });
    setSavingNumber(null);
    if (res.ok) {
      setFeedback("Numero assegnato aggiornato");
      loadStock();
    }
  }

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
        <SimCardIcon sx={{ color: serviceColor, fontSize: 32 }} />
        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: "1.25rem" }}>Magazzino SIM</Typography>
          <Typography variant="body2" color="text.secondary">
            {total} ICCID in anagrafica · import CSV e gestione stock
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Card
            variant="outlined"
            sx={{ borderColor: alpha(serviceColor, 0.35), bgcolor: alpha(serviceColor, 0.04) }}
          >
            <CardContent>
              <Typography sx={{ fontWeight: 700, mb: 2 }}>
                <UploadFileIcon sx={{ verticalAlign: "middle", mr: 1, fontSize: 20 }} />
                Import ICCID
              </Typography>
              <TextField
                select
                fullWidth
                label="Operatore"
                value={importOp}
                onChange={(e) => setImportOp(e.target.value)}
                size="small"
                sx={{ mb: 2 }}
              >
                {operators.map((op) => (
                  <MenuItem key={op.id} value={op.id}>
                    {op.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                fullWidth
                multiline
                minRows={4}
                label="ICCID (uno per riga; opzionale: ICCID,numero)"
                value={importRaw}
                onChange={(e) => setImportRaw(e.target.value)}
                size="small"
                sx={{ mb: 1, fontFamily: "monospace" }}
              />
              <Button component="label" size="small" variant="outlined" sx={{ mb: 2 }}>
                Carica file CSV
                <input
                  type="file"
                  accept=".csv,.txt"
                  hidden
                  onChange={(e) => handleCsvFile(e.target.files?.[0] ?? null)}
                />
              </Button>
              <Button
                variant="contained"
                onClick={handleImport}
                disabled={importing || !importRaw.trim()}
                sx={{ background: serviceColor }}
              >
                {importing ? "Import…" : "Importa batch"}
              </Button>
              {feedback && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  {feedback}
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
            <TextField
              select
              label="Operatore"
              value={operatorId}
              onChange={(e) => {
                setOperatorId(e.target.value);
                setPage(1);
              }}
              size="small"
              sx={{ minWidth: 160 }}
            >
              <MenuItem value="">Tutti</MenuItem>
              {operators.map((op) => (
                <MenuItem key={op.id} value={op.id}>
                  {op.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Stato"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              size="small"
              sx={{ minWidth: 140 }}
            >
              <MenuItem value="">Tutti</MenuItem>
              <MenuItem value="InStock">In stock</MenuItem>
              <MenuItem value="Sold">Venduta</MenuItem>
              <MenuItem value="Reserved">Riservata</MenuItem>
            </TextField>
            <TextField
              label="Cerca ICCID"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              size="small"
              sx={{ flex: 1, minWidth: 180 }}
            />
          </Box>

          <Card variant="outlined">
            <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>ICCID</TableCell>
                    <TableCell>Numero assegnato</TableCell>
                    <TableCell>Operatore</TableCell>
                    <TableCell>Stato</TableCell>
                    <TableCell>Vendita</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell sx={{ fontFamily: "monospace", fontSize: "0.8rem" }}>
                        {row.iccid}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          <TextField
                            size="small"
                            placeholder="333…"
                            value={numberDraft[row.id] ?? ""}
                            onChange={(e) =>
                              setNumberDraft((d) => ({ ...d, [row.id]: e.target.value }))
                            }
                            sx={{ width: 130 }}
                          />
                          <IconButton
                            size="small"
                            disabled={savingNumber === row.id}
                            onClick={() => void saveAssignedNumber(row.id)}
                          >
                            <SaveIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </TableCell>
                      <TableCell>{row.operator.name}</TableCell>
                      <TableCell>
                        <Chip label={row.status} size="small" color={statusColor(row.status)} />
                      </TableCell>
                      <TableCell>
                        {row.sale ? `#${row.sale.mysqlId ?? row.sale.id.slice(-6)}` : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          {pages > 1 && (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
              <Pagination count={pages} page={page} onChange={(_, p) => setPage(p)} color="primary" />
            </Box>
          )}
        </Grid>
      </Grid>

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography sx={{ fontWeight: 700, mb: 2 }}>Soglie riordino per operatore</Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
            {operators.map((op) => (
              <Box
                key={op.id}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  p: 1.5,
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: alpha(serviceColor, 0.25),
                }}
              >
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {op.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {op._count?.iccidStock ?? 0} in stock
                  </Typography>
                </Box>
                <TextField
                  size="small"
                  type="number"
                  label="Soglia"
                  value={thresholdDraft[op.id] ?? ""}
                  onChange={(e) => setThresholdDraft((d) => ({ ...d, [op.id]: e.target.value }))}
                  sx={{ width: 90 }}
                />
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={() => saveThreshold(op.id)}
                  disabled={savingThreshold === op.id}
                  sx={{ background: serviceColor, minWidth: 0, px: 1.5 }}
                >
                  Salva
                </Button>
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
