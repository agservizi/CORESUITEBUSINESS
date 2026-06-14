"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Chip,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  InputAdornment,
  Stack,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import RefreshIcon from "@mui/icons-material/Refresh";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import SearchIcon from "@mui/icons-material/Search";
import { motion } from "framer-motion";
import type { ModuleDefinition, ModuleField } from "@/config/platform-modules";
import { shellPaperSx } from "@/theme/shell-tokens";
import {
  getModuleKeyFromApiPath,
  moduleNeedsClientId,
  moduleSupportsPdf,
} from "@/lib/platform/client-modules";
import { jsonMutationHeaders } from "@/lib/csrf-client";
import ClientPicker from "./ClientPicker";
import ModuleDetailDrawer from "./ModuleDetailDrawer";
import AiSparkButton from "@/components/ai/AiSparkButton";
import { usePlatformNavigation } from "@/context/PlatformNavigationProvider";
import { getPlatformService } from "@/config/platform-services";
import ServiceViewHero from "./service-shell/ServiceViewHero";
import { ServiceKpiStrip } from "./service-shell/useModuleDashboardMini";
import { getServiceViewTheme, statusChipColor } from "./service-shell/service-view-themes";

function formatCell(value: unknown, format?: string) {
  if (value == null) return "—";
  if (format === "date") {
    const d = new Date(String(value));
    return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString("it-IT");
  }
  if (format === "currency") {
    return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(
      Number(value)
    );
  }
  if (format === "status") {
    return String(value).replace(/_/g, " ");
  }
  return String(value);
}

function FieldInput({
  field,
  value,
  onChange,
  moduleKey,
}: {
  field: ModuleField;
  value: string;
  onChange: (v: string) => void;
  moduleKey?: string;
}) {
  if (field.type === "select" && field.options) {
    return (
      <TextField
        select
        fullWidth
        size="small"
        label={field.label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={field.required}
      >
        {field.options.map((o) => (
          <MenuItem key={o.value} value={o.value}>
            {o.label}
          </MenuItem>
        ))}
      </TextField>
    );
  }

  const inputType =
    field.type === "number"
      ? "number"
      : field.type === "email"
        ? "email"
        : field.type === "date"
          ? "date"
          : field.type === "datetime"
            ? "datetime-local"
            : "text";

  return (
    <Box sx={{ display: "flex", gap: 0.5, alignItems: "flex-start", width: "100%" }}>
      <TextField
        fullWidth
        size="small"
        label={field.label}
        type={inputType}
        multiline={field.type === "textarea"}
        rows={field.type === "textarea" ? 3 : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={field.required}
      />
      {field.type === "textarea" && moduleKey && (
        <AiSparkButton
          scope="practices"
          action="improve"
          moduleKey={moduleKey}
          message={value}
          label="Migliora testo"
          onResult={onChange}
        />
      )}
    </Box>
  );
}

export default function GenericModuleView({
  module,
  viewId,
  serviceColor = "#6366f1",
  onRowClick,
  showToolbar = false,
  moduleKeyOverride,
  initialSelectedId,
  hideHeader = false,
  serviceNameOverride,
}: {
  module: ModuleDefinition;
  viewId: string;
  serviceColor?: string;
  onRowClick?: (id: string) => void;
  showToolbar?: boolean;
  moduleKeyOverride?: string;
  initialSelectedId?: string | null;
  hideHeader?: boolean;
  serviceNameOverride?: string;
}) {
  const { serviceSlug } = usePlatformNavigation();
  const platformService = getPlatformService(serviceSlug);
  const moduleKey = moduleKeyOverride || getModuleKeyFromApiPath(module.apiPath);
  const needsClient = moduleNeedsClientId(moduleKey);
  const viewTheme = getServiceViewTheme(
    moduleKey,
    viewId,
    serviceNameOverride ?? platformService?.name ?? module.entityLabelPlural,
    serviceColor,
    platformService?.gradient
  );

  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId ?? null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (initialSelectedId) setSelectedId(initialSelectedId);
  }, [initialSelectedId]);

  async function loadData() {
    setLoading(true);
    try {
      const params =
        viewId !== "dashboard" && viewId !== "elenco" ? `?view=${viewId}` : "";
      const res = await fetch(`${module.apiPath}${params}`);
      const data = await res.json();
      setRows(Array.isArray(data.items) ? data.items : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [viewId, module.apiPath]);

  useEffect(() => {
    function onMutated(e: Event) {
      const detail = (e as CustomEvent<{ moduleKey?: string }>).detail;
      if (!detail?.moduleKey || detail.moduleKey === moduleKey) loadData();
    }
    window.addEventListener("coresuite:data-mutated", onMutated);
    return () => window.removeEventListener("coresuite:data-mutated", onMutated);
  }, [moduleKey, viewId, module.apiPath]);

  async function handleCreate() {
    setSaving(true);
    try {
      const res = await fetch(module.apiPath, {
        method: "POST",
        headers: jsonMutationHeaders(),
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setOpen(false);
        setForm({});
        await loadData();
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleQuickDelete(id: string) {
    if (!confirm("Eliminare questo record?")) return;
    await fetch(`${module.apiPath}/${id}`, {
      method: "DELETE",
      headers: jsonMutationHeaders(),
    });
    await loadData();
  }

  if (viewId === "dashboard") {
    return null;
  }

  const filteredRows = search.trim()
    ? rows.filter((row) =>
        module.columns.some((col) => {
          const parts = col.key.split(".");
          let val: unknown = row;
          for (const p of parts) val = (val as Record<string, unknown>)?.[p];
          return String(val ?? "")
            .toLowerCase()
            .includes(search.trim().toLowerCase());
        })
      )
    : rows;

  return (
    <Box>
      {!hideHeader && showToolbar && (
        <>
          <ServiceViewHero theme={viewTheme} badge={`${filteredRows.length} record`}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
              <TextField
                size="small"
                placeholder="Cerca…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ opacity: 0.7, fontSize: 20, color: "#fff" }} />
                      </InputAdornment>
                    ),
                    sx: { bgcolor: "rgba(255,255,255,0.15)", borderRadius: 2, color: "#fff" },
                  },
                }}
                sx={{ minWidth: 180 }}
              />
              <Tooltip title="Export CSV">
                <IconButton
                  component="a"
                  href={`/api/platform/${moduleKey}/export?view=${viewId}`}
                  target="_blank"
                  size="small"
                  sx={{ color: "#fff" }}
                >
                  <FileDownloadIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Aggiorna">
                <IconButton size="small" onClick={loadData} sx={{ color: "#fff" }}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setOpen(true)}
                sx={{ bgcolor: "#fff", color: serviceColor, fontWeight: 700 }}
              >
                Nuovo
              </Button>
            </Stack>
          </ServiceViewHero>
          <ServiceKpiStrip moduleKey={moduleKey} serviceColor={serviceColor} />
        </>
      )}

      {!hideHeader && !showToolbar && (
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {module.entityLabelPlural}
          </Typography>
          <Chip label={filteredRows.length} size="small" sx={{ mt: 0.5 }} />
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpen(true)}
          sx={{ background: serviceColor }}
        >
          Nuovo
        </Button>
      </Box>
      )}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress size={32} />
        </Box>
      ) : (
        <Paper sx={[shellPaperSx, { overflow: "auto" }]}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {module.columns.map((col) => (
                  <TableCell key={col.key} sx={{ fontWeight: 700 }}>
                    {col.label}
                  </TableCell>
                ))}
                <TableCell sx={{ fontWeight: 700, width: 120 }} align="right">
                  Azioni
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={module.columns.length + 1}
                    align="center"
                    sx={{ py: 4, color: "text.secondary" }}
                  >
                    {search ? "Nessun risultato per la ricerca." : "Nessun record. Crea il primo con il pulsante Nuovo."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredRows.map((row, rowIndex) => (
                  <TableRow
                    key={String(row.id)}
                    component={motion.tr}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(rowIndex * 0.02, 0.3) }}
                    hover
                    sx={{ cursor: "pointer" }}
                    onClick={() => {
                      const id = String(row.id);
                      if (onRowClick) onRowClick(id);
                      else setSelectedId(id);
                    }}
                  >
                    {module.columns.map((col) => (
                      <TableCell key={col.key}>
                        {col.format === "status" ? (
                          <Chip
                            size="small"
                            label={formatCell(row[col.key], col.format)}
                            color={statusChipColor(row[col.key])}
                            variant="outlined"
                          />
                        ) : (
                          formatCell(row[col.key], col.format)
                        )}
                      </TableCell>
                    ))}
                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                      {moduleSupportsPdf(moduleKey) && (
                        <Tooltip title="PDF">
                          <IconButton
                            size="small"
                            component="a"
                            href={`${module.apiPath}/${row.id}/pdf`}
                            target="_blank"
                          >
                            <PictureAsPdfIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="Modifica">
                        <IconButton size="small" onClick={() => setSelectedId(String(row.id))}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Elimina">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleQuickDelete(String(row.id))}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Paper>
      )}

      <CreateDialog
        open={open}
        onClose={() => setOpen(false)}
        module={module}
        moduleKey={moduleKey}
        form={form}
        setForm={setForm}
        saving={saving}
        onCreate={handleCreate}
        needsClient={needsClient}
      />

      <ModuleDetailDrawer
        open={Boolean(selectedId)}
        onClose={() => setSelectedId(null)}
        module={module}
        recordId={selectedId}
        serviceColor={serviceColor}
        onUpdated={loadData}
        onDeleted={loadData}
      />
    </Box>
  );
}

function CreateDialog({
  open,
  onClose,
  module,
  moduleKey,
  form,
  setForm,
  saving,
  onCreate,
  needsClient,
}: {
  open: boolean;
  onClose: () => void;
  module: ModuleDefinition;
  moduleKey: string;
  form: Record<string, string>;
  setForm: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  saving: boolean;
  onCreate: () => void;
  needsClient: boolean;
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Nuovo {module.entityLabel.toLowerCase()}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          {needsClient && (
            <ClientPicker
              value={form.clientId || ""}
              onChange={(id) => setForm((prev) => ({ ...prev, clientId: id }))}
              required
            />
          )}
          {module.createFields.map((field) => (
            <FieldInput
              key={field.key}
              field={field}
              value={form[field.key] || ""}
              moduleKey={moduleKey}
              onChange={(v) => setForm((prev) => ({ ...prev, [field.key]: v }))}
            />
          ))}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annulla</Button>
        <Button variant="contained" onClick={onCreate} disabled={saving}>
          {saving ? "Salvataggio…" : "Salva"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
