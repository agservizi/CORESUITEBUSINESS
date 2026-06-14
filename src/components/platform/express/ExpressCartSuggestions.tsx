"use client";

import { useEffect, useState } from "react";
import { Box, Typography, Chip, Stack, Card, CardContent, alpha } from "@mui/material";
import LightbulbIcon from "@mui/icons-material/Lightbulb";
import { apiFetch, readJsonResponse } from "@/lib/fetch-client";
import { money } from "./express-utils";

interface Suggestion {
  id: string;
  kind: string;
  title: string;
  reason: string;
  price: number;
  offerId?: string;
  productId?: string;
  operatorId?: string;
}

interface Props {
  clientId: string;
  cart: { lineType: string; offerId?: string; productId?: string; operatorId?: string }[];
  serviceColor: string;
  onApply: (s: Suggestion) => void;
}

export default function ExpressCartSuggestions({ clientId, cart, serviceColor, onApply }: Props) {
  const [items, setItems] = useState<Suggestion[]>([]);

  useEffect(() => {
    const t = setTimeout(async () => {
      const res = await apiFetch("/api/platform/express", {
        method: "POST",
        body: JSON.stringify({ action: "getSuggestions", clientId: clientId || undefined, cart }),
      });
      const data = await readJsonResponse<{ items: Suggestion[] }>(res);
      if (res.ok && data) setItems(data.items || []);
    }, 400);
    return () => clearTimeout(t);
  }, [clientId, cart]);

  if (!items.length) return null;

  return (
    <Card variant="outlined" sx={{ mb: 2, borderColor: alpha(serviceColor, 0.3), bgcolor: alpha(serviceColor, 0.04) }}>
      <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
          <LightbulbIcon sx={{ color: serviceColor, fontSize: 20 }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Suggerimenti intelligenti
          </Typography>
        </Box>
        <Stack spacing={1}>
          {items.map((s) => (
            <Box key={s.id} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {s.title}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {s.reason}
                </Typography>
              </Box>
              <Chip
                label={`${money(s.price)} · Aggiungi`}
                size="small"
                clickable
                onClick={() => onApply(s)}
                sx={{ bgcolor: serviceColor, color: "#fff", fontWeight: 600 }}
              />
            </Box>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}
