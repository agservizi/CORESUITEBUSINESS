"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  alpha,
} from "@mui/material";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import { money } from "./express-utils";

interface Props {
  serviceColor: string;
}

export default function ExpressOfferCompareView({ serviceColor }: Props) {
  const [data, setData] = useState<{
    operators: {
      name: string;
      minPrice: number;
      maxPrice: number;
      offers: {
        id: string;
        title: string;
        description?: string | null;
        price: number;
        cost: number;
        margin: number;
        validFrom?: string | null;
        validTo?: string | null;
      }[];
    }[];
  } | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/platform/express?view=confronto", { credentials: "include" });
    const json = await res.json();
    if (res.ok) setData(json);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!data) return null;

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
        <CompareArrowsIcon sx={{ color: serviceColor, fontSize: 32 }} />
        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: "1.25rem" }}>Confronto offerte operatori</Typography>
          <Typography variant="body2" color="text.secondary">
            Vista comparativa per consulenza vendita assistita
          </Typography>
        </Box>
      </Box>

      {data.operators.map((op) => (
        <Card key={op.name} variant="outlined" sx={{ mb: 3, borderColor: alpha(serviceColor, 0.3) }}>
          <CardContent>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2, flexWrap: "wrap", gap: 1 }}>
              <Typography sx={{ fontWeight: 800, fontSize: "1.1rem", color: serviceColor }}>{op.name}</Typography>
              <Chip label={`${money(op.minPrice)} – ${money(op.maxPrice)}`} size="small" />
            </Box>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Offerta</TableCell>
                  <TableCell align="right">Prezzo</TableCell>
                  <TableCell align="right">Costo</TableCell>
                  <TableCell align="right">Margine</TableCell>
                  <TableCell>Validità</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {op.offers.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {o.title}
                      </Typography>
                      {o.description && (
                        <Typography variant="caption" color="text.secondary">
                          {o.description}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">{money(o.price)}</TableCell>
                    <TableCell align="right">{money(o.cost)}</TableCell>
                    <TableCell align="right">
                      <Chip
                        label={money(o.margin)}
                        size="small"
                        color={o.margin >= 0 ? "success" : "error"}
                      />
                    </TableCell>
                    <TableCell>
                      {o.validFrom
                        ? `${new Date(o.validFrom).toLocaleDateString("it-IT")}${o.validTo ? ` → ${new Date(o.validTo).toLocaleDateString("it-IT")}` : ""}`
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}
