"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Box, Typography, Drawer, IconButton, Chip, Button, Stack, Divider, TextField,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SaveIcon from "@mui/icons-material/Save";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import PhoneIcon from "@mui/icons-material/Phone";
import EmailIcon from "@mui/icons-material/Email";
import { useTheme } from "@mui/material/styles";
import { getShellTokens, shellDrawerPaperSx } from "@/theme/shell-tokens";
import { jsonMutationHeaders } from "@/lib/csrf-client";
import {
  CATEGORY_LABELS, CATEGORY_COLORS, customerLabel, money, statusColor,
  type OpportunityRow,
} from "./opportunities-utils";
import OpportunityHealthBadge from "./OpportunityHealthBadge";
import OpportunityTimeline from "./OpportunityTimeline";
import OpportunityDocumentProgress from "./OpportunityDocumentProgress";
import OpportunityFileUpload from "./OpportunityFileUpload";

interface StatusOption {
  code: string;
  label: string;
  color: string;
}

const STAFF_ROLES = new Set(["SUPER_ADMIN", "ADMIN", "MANAGER", "OPERATORE"]);

interface Props {
  open: boolean;
  row: OpportunityRow | null;
  onClose: () => void;
  onEdit?: (row: OpportunityRow) => void;
  onStatusChange: (id: string, statusCode: string) => void;
  onUpdated?: () => void;
  serviceColor?: string;
}

export default function OpportunityDetailDrawer({
  open,
  row,
  onClose,
  onStatusChange,
  onUpdated,
  serviceColor = "#8b5cf6",
}: Props) {
  const theme = useTheme();
  const [statuses, setStatuses] = useState<StatusOption[]>([]);
  const [isStaff, setIsStaff] = useState(false);
  const [contractCode, setContractCode] = useState("");
  const [clientCode, setClientCode] = useState("");
  const [savingCodes, setSavingCodes] = useState(false);
  const [codeError, setCodeError] = useState("");

  const loadMeta = useCallback(async () => {
    const [catalogRes, profileRes] = await Promise.all([
      fetch("/api/platform/opportunities/catalog"),
      fetch("/api/profile"),
    ]);
    const catalog = await catalogRes.json();
    setStatuses(catalog.statuses || []);
    try {
      const profile = await profileRes.json();
      setIsStaff(STAFF_ROLES.has(profile.user?.role || ""));
    } catch {
      setIsStaff(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    loadMeta();
  }, [open, loadMeta]);

  useEffect(() => {
    if (!row) return;
    setContractCode(row.contractCode || "");
    setClientCode(row.clientCode || "");
    setCodeError("");
  }, [row]);

  if (!row) return null;

  const color = row.statusColor || statusColor(row.statusCode);

  async function handleSaveCodes() {
    if (!row) return;
    setSavingCodes(true);
    setCodeError("");
    try {
      const res = await fetch(`/api/platform/opportunities/${row.id}`, {
        method: "PATCH",
        headers: jsonMutationHeaders(),
        body: JSON.stringify({ contractCode, clientCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCodeError(data.error || "Errore salvataggio");
        return;
      }
      onUpdated?.();
    } finally {
      setSavingCodes(false);
    }
  }

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: [shellDrawerPaperSx, { width: { xs: "100%", sm: 480 } }],
        },
      }}
    >
      <Box sx={{ height: 56, display: "flex", alignItems: "center", px: 2, gap: 1, borderBottom: getShellTokens(theme).border }}>
        <IconButton size="small" onClick={onClose}><CloseIcon fontSize="small" /></IconButton>
        <Typography sx={{ fontWeight: 700, flex: 1, fontSize: "0.95rem" }} noWrap>{row.code}</Typography>
        <Chip
          label={CATEGORY_LABELS[row.category]}
          size="small"
          sx={{ height: 22, fontSize: "0.65rem", fontWeight: 700, background: `${CATEGORY_COLORS[row.category]}18`, color: CATEGORY_COLORS[row.category] }}
        />
      </Box>

      <Box sx={{ p: 2.5, overflowY: "auto" }}>
        <Chip
          label={row.statusLabel || row.statusCode}
          size="small"
          sx={{ mb: 1, background: `${color}18`, color, border: `1px solid ${color}44`, fontWeight: 700 }}
        />
        <Box sx={{ mb: 2 }}>
          <OpportunityHealthBadge row={row} size="medium" />
        </Box>

        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<PhoneIcon />}
            href={`tel:${row.customerPhone}`}
            component="a"
          >
            Chiama
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<EmailIcon />}
            href={`mailto:${row.customerEmail}`}
            component="a"
          >
            Email
          </Button>
          <IconButton
            size="small"
            onClick={() => navigator.clipboard.writeText(row.code)}
            aria-label="Copia codice"
          >
            <ContentCopyIcon fontSize="small" />
          </IconButton>
        </Stack>

        <Divider sx={{ mb: 2 }} />

        <Box sx={{ mb: 2.5 }}>
          <OpportunityDocumentProgress row={row} serviceColor={serviceColor} />
        </Box>

        <Box sx={{ mb: 2.5 }}>
          <OpportunityFileUpload
            opportunityId={row.id}
            serviceColor={serviceColor}
            onChange={onUpdated}
          />
        </Box>

        <Divider sx={{ mb: 2.5 }} />
        <Stack spacing={1.5}>
          <Box>
            <Typography variant="caption" color="text.secondary">Cliente</Typography>
            <Typography sx={{ fontWeight: 600 }}>{customerLabel(row)}</Typography>
            <Typography variant="caption" color="text.secondary">{row.customerTaxCode}</Typography>
          </Box>
          <Stack direction="row" spacing={3}>
            <Box>
              <Typography variant="caption" color="text.secondary">Telefono</Typography>
              <Typography sx={{ fontSize: "0.875rem" }}>{row.customerPhone}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Email</Typography>
              <Typography sx={{ fontSize: "0.875rem" }} noWrap>{row.customerEmail}</Typography>
            </Box>
          </Stack>
          {row.customerAddress && (
            <Box>
              <Typography variant="caption" color="text.secondary">Indirizzo</Typography>
              <Typography sx={{ fontSize: "0.875rem" }}>
                {[row.customerAddress, row.customerPostalCode, row.customerCity, row.customerProvince].filter(Boolean).join(", ")}
              </Typography>
            </Box>
          )}
          <Box>
            <Typography variant="caption" color="text.secondary">Gestore / Offerta</Typography>
            <Typography sx={{ fontWeight: 600 }}>{row.providerLabel}</Typography>
            {row.offerLabel && (
              <Typography variant="caption" color="text.secondary">{row.offerLabel}</Typography>
            )}
          </Box>
          <Stack direction="row" spacing={3}>
            <Box>
              <Typography variant="caption" color="text.secondary">Commissione</Typography>
              <Typography sx={{ fontWeight: 700, color: "#10b981" }}>{money(row.commission)}</Typography>
            </Box>
            {row.collaboratorName && (
              <Box>
                <Typography variant="caption" color="text.secondary">Collaboratore</Typography>
                <Typography sx={{ fontSize: "0.875rem" }}>{row.collaboratorName}</Typography>
              </Box>
            )}
          </Stack>

          {(row.telefoniaLineNumber || row.lucePod || row.gasPdr) && (
            <Box>
              <Typography variant="caption" color="text.secondary">Identificativo servizio</Typography>
              {row.telefoniaLineNumber && (
                <Typography sx={{ fontSize: "0.875rem" }}>
                  Linea: {row.telefoniaLineNumber}
                  {row.telefoniaCurrentOperator ? ` (${row.telefoniaCurrentOperator})` : ""}
                </Typography>
              )}
              {row.lucePod && <Typography sx={{ fontSize: "0.875rem" }}>POD: {row.lucePod}</Typography>}
              {row.gasPdr && <Typography sx={{ fontSize: "0.875rem" }}>PDR: {row.gasPdr}</Typography>}
            </Box>
          )}

          {(row.documentType || row.documentNumber) && (
            <Box>
              <Typography variant="caption" color="text.secondary">Documento</Typography>
              <Typography sx={{ fontSize: "0.875rem" }}>
                {[row.documentType, row.documentNumber].filter(Boolean).join(" · ")}
              </Typography>
              {row.documentExpiresAt && (
                <Typography variant="caption" color="text.secondary">
                  Scadenza: {new Date(row.documentExpiresAt).toLocaleDateString("it-IT")}
                </Typography>
              )}
            </Box>
          )}

          {row.paymentIban && (
            <Box>
              <Typography variant="caption" color="text.secondary">IBAN</Typography>
              <Typography sx={{ fontSize: "0.875rem", fontFamily: "monospace" }}>{row.paymentIban}</Typography>
            </Box>
          )}

          {(row.additionalNotes || row.adminNotes) && (
            <Box>
              <Typography variant="caption" color="text.secondary">Note</Typography>
              {row.additionalNotes && (
                <Typography sx={{ fontSize: "0.875rem", whiteSpace: "pre-wrap" }}>{row.additionalNotes}</Typography>
              )}
              {row.adminNotes && (
                <Typography sx={{ fontSize: "0.875rem", whiteSpace: "pre-wrap", color: "text.secondary", mt: 0.5 }}>
                  Admin: {row.adminNotes}
                </Typography>
              )}
            </Box>
          )}
        </Stack>

        {isStaff && (
          <>
            <Divider sx={{ my: 2.5 }} />
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>Codici gestionale</Typography>
            <Stack spacing={1.5}>
              <TextField
                label="Codice contratto"
                size="small"
                fullWidth
                value={contractCode}
                onChange={(e) => setContractCode(e.target.value)}
              />
              <TextField
                label="Codice cliente"
                size="small"
                fullWidth
                value={clientCode}
                onChange={(e) => setClientCode(e.target.value)}
              />
              {codeError && (
                <Typography color="error" sx={{ fontSize: "0.8rem" }}>{codeError}</Typography>
              )}
              <Button
                size="small"
                variant="outlined"
                startIcon={<SaveIcon />}
                onClick={handleSaveCodes}
                disabled={savingCodes}
              >
                {savingCodes ? "Salvataggio..." : "Salva codici"}
              </Button>
            </Stack>
          </>
        )}

        <Divider sx={{ my: 2.5 }} />
        <OpportunityTimeline row={row} serviceColor={serviceColor} />

        <Divider sx={{ my: 2.5 }} />
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>Azioni rapide stato</Typography>
        <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1 }}>
          {statuses.map((s) => (
            <Button
              key={s.code}
              size="small"
              variant={row.statusCode === s.code ? "contained" : "outlined"}
              onClick={() => onStatusChange(row.id, s.code)}
              sx={row.statusCode === s.code
                ? { background: s.color || statusColor(s.code) }
                : { borderColor: `${s.color || statusColor(s.code)}55`, color: s.color || statusColor(s.code) }}
            >
              {s.label}
            </Button>
          ))}
        </Stack>
      </Box>
    </Drawer>
  );
}
