"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Box, Typography, Button, TextField, MenuItem, Stack, IconButton,
  CircularProgress, Chip, Switch, FormControlLabel, Accordion, AccordionSummary, AccordionDetails,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AddIcon from "@mui/icons-material/Add";
import { shellPanelSx } from "@/theme/shell-tokens";
import { jsonMutationHeaders } from "@/lib/csrf-client";
import { CATEGORY_LABELS } from "./opportunities-utils";
import type { OpportunityCategory } from "@/generated/prisma";

interface Offer {
  id: string;
  name: string;
  commission: number | null;
  ordering: number;
  active: boolean;
}

interface Provider {
  id: string;
  category: OpportunityCategory;
  name: string;
  defaultCommission: number | null;
  ordering: number;
  active: boolean;
  offers: Offer[];
}

interface Props {
  serviceColor: string;
}

const EMPTY_PROVIDER = {
  category: "TELEFONIA" as OpportunityCategory,
  name: "",
  defaultCommission: "",
  ordering: "0",
};

export default function OpportunitiesAdminCatalog({ serviceColor }: Props) {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newProvider, setNewProvider] = useState(EMPTY_PROVIDER);
  const [creating, setCreating] = useState(false);
  const [newOffers, setNewOffers] = useState<Record<string, { name: string; commission: string }>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/platform/opportunities/admin/providers");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Non autorizzato");
        setProviders([]);
        return;
      }
      setProviders(data.providers || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function createProvider() {
    if (!newProvider.name.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/platform/opportunities/admin/providers", {
        method: "POST",
        headers: jsonMutationHeaders(),
        body: JSON.stringify({
          category: newProvider.category,
          name: newProvider.name.trim(),
          defaultCommission: newProvider.defaultCommission || undefined,
          ordering: Number(newProvider.ordering) || 0,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Errore creazione");
        return;
      }
      setNewProvider(EMPTY_PROVIDER);
      await load();
    } finally {
      setCreating(false);
    }
  }

  async function patchProvider(id: string, patch: Record<string, unknown>) {
    await fetch(`/api/platform/opportunities/admin/providers/${id}`, {
      method: "PATCH",
      headers: jsonMutationHeaders(),
      body: JSON.stringify(patch),
    });
    await load();
  }

  async function createOffer(providerId: string) {
    const draft = newOffers[providerId];
    if (!draft?.name.trim()) return;
    await fetch("/api/platform/opportunities/admin/offers", {
      method: "POST",
      headers: jsonMutationHeaders(),
      body: JSON.stringify({
        providerId,
        name: draft.name.trim(),
        commission: draft.commission || undefined,
      }),
    });
    setNewOffers((prev) => ({ ...prev, [providerId]: { name: "", commission: "" } }));
    await load();
  }

  async function patchOffer(id: string, patch: Record<string, unknown>) {
    await fetch(`/api/platform/opportunities/admin/offers/${id}`, {
      method: "PATCH",
      headers: jsonMutationHeaders(),
      body: JSON.stringify(patch),
    });
    await load();
  }

  const grouped = (["TELEFONIA", "LUCE", "GAS"] as OpportunityCategory[]).map((cat) => ({
    category: cat,
    items: providers.filter((p) => p.category === cat),
  }));

  if (loading) {
    return (
      <Box sx={{ py: 8, display: "flex", justifyContent: "center" }}>
        <CircularProgress sx={{ color: serviceColor }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ py: 4, textAlign: "center" }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography sx={{ fontWeight: 700, fontSize: "1.5rem", mb: 1 }}>Catalogo gestori e offerte</Typography>
      <Typography color="text.secondary" sx={{ mb: 3, fontSize: "0.875rem" }}>
        Configura gestori, commissioni default e offerte disponibili per i collaboratori.
      </Typography>

      <Box sx={[shellPanelSx, { p: 2, mb: 3 }]}>
        <Typography sx={{ fontWeight: 600, mb: 2 }}>Nuovo gestore</Typography>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ alignItems: { md: "flex-end" } }}>
          <TextField
            select
            label="Categoria"
            size="small"
            value={newProvider.category}
            onChange={(e) => setNewProvider((p) => ({ ...p, category: e.target.value as OpportunityCategory }))}
            sx={{ minWidth: 140 }}
          >
            {(Object.keys(CATEGORY_LABELS) as OpportunityCategory[]).map((c) => (
              <MenuItem key={c} value={c}>{CATEGORY_LABELS[c]}</MenuItem>
            ))}
          </TextField>
          <TextField
            label="Nome gestore"
            size="small"
            value={newProvider.name}
            onChange={(e) => setNewProvider((p) => ({ ...p, name: e.target.value }))}
            sx={{ flex: 1 }}
          />
          <TextField
            label="Comm. default €"
            size="small"
            type="number"
            value={newProvider.defaultCommission}
            onChange={(e) => setNewProvider((p) => ({ ...p, defaultCommission: e.target.value }))}
            sx={{ width: 140 }}
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={createProvider}
            disabled={creating || !newProvider.name.trim()}
            sx={{ background: serviceColor }}
          >
            Aggiungi
          </Button>
        </Stack>
      </Box>

      <Stack spacing={2}>
        {grouped.map(({ category, items }) => (
          <Box key={category}>
            <Typography sx={{ fontWeight: 700, mb: 1, color: serviceColor }}>
              {CATEGORY_LABELS[category]}
            </Typography>
            {items.length === 0 ? (
              <Typography variant="caption" color="text.secondary">Nessun gestore</Typography>
            ) : (
              items.map((provider) => (
                <Accordion key={provider.id} sx={[shellPanelSx, { mb: 1, "&:before": { display: "none" } }]}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center", flex: 1, pr: 2 }}>
                      <Typography sx={{ fontWeight: 600, flex: 1 }}>{provider.name}</Typography>
                      {!provider.active && <Chip label="Disattivo" size="small" />}
                      {provider.defaultCommission != null && (
                        <Chip
                          label={`€${Number(provider.defaultCommission).toFixed(2)}`}
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Stack>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Stack spacing={2}>
                      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                        <TextField
                          label="Nome"
                          size="small"
                          defaultValue={provider.name}
                          onBlur={(e) => {
                            if (e.target.value !== provider.name) {
                              patchProvider(provider.id, { name: e.target.value });
                            }
                          }}
                          sx={{ flex: 1 }}
                        />
                        <TextField
                          label="Comm. default €"
                          size="small"
                          type="number"
                          defaultValue={provider.defaultCommission ?? ""}
                          onBlur={(e) => {
                            patchProvider(provider.id, { defaultCommission: e.target.value || 0 });
                          }}
                          sx={{ width: 140 }}
                        />
                        <FormControlLabel
                          control={
                            <Switch
                              checked={provider.active}
                              onChange={(_, checked) => patchProvider(provider.id, { active: checked })}
                            />
                          }
                          label="Attivo"
                        />
                      </Stack>

                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                        Offerte ({provider.offers.length})
                      </Typography>
                      {provider.offers.map((offer) => (
                        <Stack key={offer.id} direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignItems: "center" }}>
                          <TextField
                            size="small"
                            defaultValue={offer.name}
                            onBlur={(e) => {
                              if (e.target.value !== offer.name) {
                                patchOffer(offer.id, { name: e.target.value });
                              }
                            }}
                            sx={{ flex: 1 }}
                          />
                          <TextField
                            size="small"
                            type="number"
                            label="€"
                            defaultValue={offer.commission ?? ""}
                            onBlur={(e) => patchOffer(offer.id, { commission: e.target.value || 0 })}
                            sx={{ width: 100 }}
                          />
                          <FormControlLabel
                            control={
                              <Switch
                                size="small"
                                checked={offer.active}
                                onChange={(_, checked) => patchOffer(offer.id, { active: checked })}
                              />
                            }
                            label=""
                          />
                        </Stack>
                      ))}

                      <Stack direction="row" spacing={1}>
                        <TextField
                          size="small"
                          placeholder="Nuova offerta"
                          value={newOffers[provider.id]?.name || ""}
                          onChange={(e) => setNewOffers((prev) => ({
                            ...prev,
                            [provider.id]: { name: e.target.value, commission: prev[provider.id]?.commission || "" },
                          }))}
                          sx={{ flex: 1 }}
                        />
                        <TextField
                          size="small"
                          placeholder="€"
                          type="number"
                          value={newOffers[provider.id]?.commission || ""}
                          onChange={(e) => setNewOffers((prev) => ({
                            ...prev,
                            [provider.id]: { name: prev[provider.id]?.name || "", commission: e.target.value },
                          }))}
                          sx={{ width: 90 }}
                        />
                        <IconButton
                          size="small"
                          onClick={() => createOffer(provider.id)}
                          sx={{ color: serviceColor }}
                          aria-label="Aggiungi offerta"
                        >
                          <AddIcon />
                        </IconButton>
                      </Stack>
                    </Stack>
                  </AccordionDetails>
                </Accordion>
              ))
            )}
          </Box>
        ))}
      </Stack>
    </Box>
  );
}
