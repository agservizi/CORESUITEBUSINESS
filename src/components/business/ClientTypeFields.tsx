"use client";

import { Box, Grid, MenuItem, TextField, Typography } from "@mui/material";
import { CLIENT_TYPE_OPTIONS, getClientTypeHint, type ClientFormType } from "./client-form";
import { dialogStaticLabelSx } from "@/theme/shell-tokens";

type IdentityField = "name" | "companyName" | "taxCode" | "vatNumber";

interface Props {
  type: ClientFormType;
  onTypeChange: (type: ClientFormType) => void;
  name: string;
  companyName: string;
  taxCode: string;
  vatNumber: string;
  onFieldChange: (field: IdentityField, value: string) => void;
  layout?: "stack" | "grid";
  showTypeHint?: boolean;
  autoFocus?: boolean;
}

function fieldGridSize(layout: "stack" | "grid", full = false) {
  if (layout === "stack" || full) return 12;
  return { xs: 12, sm: 6 };
}

export default function ClientTypeFields({
  type,
  onTypeChange,
  name,
  companyName,
  taxCode,
  vatNumber,
  onFieldChange,
  layout = "stack",
  showTypeHint = true,
  autoFocus = false,
}: Props) {
  const fiscalSize = layout === "grid" ? { xs: 12, sm: 6 } : 6;

  return (
    <>
      <Grid size={12}>
        <Box>
          <Typography
            component="label"
            htmlFor="client-type-select"
            sx={dialogStaticLabelSx}
          >
            Tipologia
          </Typography>
          <TextField
            id="client-type-select"
            fullWidth
            size="small"
            select
            value={type}
            onChange={(e) => onTypeChange(e.target.value as ClientFormType)}
          >
            {CLIENT_TYPE_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        </Box>
        {showTypeHint && (
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.75 }}>
            {getClientTypeHint(type)}
          </Typography>
        )}
      </Grid>

      {type === "COMPANY" && (
        <>
          <Grid size={fieldGridSize(layout, true)}>
            <TextField
              fullWidth
              size="small"
              label="Ragione sociale *"
              value={companyName}
              onChange={(e) => onFieldChange("companyName", e.target.value)}
              autoFocus={autoFocus}
            />
          </Grid>
          <Grid size={fieldGridSize(layout)}>
            <TextField
              fullWidth
              size="small"
              label="Referente"
              value={name}
              onChange={(e) => onFieldChange("name", e.target.value)}
              helperText="Persona di contatto (opzionale)"
            />
          </Grid>
          <Grid size={fieldGridSize(layout)}>
            <TextField
              fullWidth
              size="small"
              label="Partita IVA"
              value={vatNumber}
              onChange={(e) => onFieldChange("vatNumber", e.target.value)}
            />
          </Grid>
        </>
      )}

      {type === "INDIVIDUAL" && (
        <>
          <Grid size={fieldGridSize(layout)}>
            <TextField
              fullWidth
              size="small"
              label="Nome e cognome *"
              value={name}
              onChange={(e) => onFieldChange("name", e.target.value)}
              autoFocus={autoFocus}
            />
          </Grid>
          <Grid size={fieldGridSize(layout)}>
            <TextField
              fullWidth
              size="small"
              label="Codice fiscale"
              value={taxCode}
              onChange={(e) => onFieldChange("taxCode", e.target.value.toUpperCase())}
              slotProps={{ htmlInput: { style: { textTransform: "uppercase" } } }}
            />
          </Grid>
        </>
      )}

      {type === "FREELANCE" && (
        <>
          <Grid size={fieldGridSize(layout, true)}>
            <TextField
              fullWidth
              size="small"
              label="Nome e cognome *"
              value={name}
              onChange={(e) => onFieldChange("name", e.target.value)}
              autoFocus={autoFocus}
            />
          </Grid>
          <Grid size={fieldGridSize(layout, true)}>
            <TextField
              fullWidth
              size="small"
              label="Denominazione attività"
              value={companyName}
              onChange={(e) => onFieldChange("companyName", e.target.value)}
              helperText="Es. studio, ditta individuale o brand professionale"
            />
          </Grid>
          <Grid size={fiscalSize}>
            <TextField
              fullWidth
              size="small"
              label="Partita IVA"
              value={vatNumber}
              onChange={(e) => onFieldChange("vatNumber", e.target.value)}
            />
          </Grid>
          <Grid size={fiscalSize}>
            <TextField
              fullWidth
              size="small"
              label="Codice fiscale"
              value={taxCode}
              onChange={(e) => onFieldChange("taxCode", e.target.value.toUpperCase())}
              slotProps={{ htmlInput: { style: { textTransform: "uppercase" } } }}
            />
          </Grid>
        </>
      )}
    </>
  );
}
