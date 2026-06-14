"use client";

import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableHead, TableRow, Divider,
} from "@mui/material";
import { shellPanelSx } from "@/theme/shell-tokens";
import type { CashDayJournal } from "@/lib/platform/cash-register-service";

interface Props {
  journal: CashDayJournal;
  serviceColor?: string;
}

function money(n: number) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);
}

function time(iso: string) {
  return new Date(iso).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
}

export default function CashRegisterJournalPanel({ journal, serviceColor = "#22c55e" }: Props) {
  return (
    <Box className="cash-journal-print" sx={{ "@media print": { p: 2 } }}>
      <Paper sx={[shellPanelSx, { p: { xs: 2, md: 3 }, mb: 2 }]}>
        <Typography sx={{ fontWeight: 800, fontSize: "1.25rem", mb: 0.5, color: serviceColor }}>
          Giornale di cassa
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          {new Date(journal.businessDate).toLocaleDateString("it-IT", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </Typography>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2, mb: 2 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">Apertura</Typography>
            <Typography sx={{ fontWeight: 600 }}>{money(journal.opening.amount)}</Typography>
            <Typography variant="caption">{journal.openedBy}</Typography>
          </Box>
          {journal.closing && (
            <Box>
              <Typography variant="caption" color="text.secondary">Chiusura</Typography>
              <Typography sx={{ fontWeight: 600 }}>{money(journal.closing.amount)}</Typography>
              <Typography variant="caption">
                Atteso {money(journal.closing.expected)} · Scostamento {money(journal.closing.variance)}
              </Typography>
            </Box>
          )}
        </Box>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Riepilogo incassi e guadagni</Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 1.5, mb: 2 }}>
          {[
            { label: "Entrate", value: money(journal.summary.totalEntrate), c: "#22c55e" },
            { label: "Uscite", value: money(journal.summary.totalUscite), c: "#ef4444" },
            { label: "Saldo netto", value: money(journal.summary.saldoNetto), c: "#6366f1" },
            { label: "Margine", value: money(journal.summary.margineTotale), c: serviceColor },
            {
              label: "Express",
              value: `${journal.summary.expressSalesCount} vendite · ${money(journal.summary.expressSalesTotal)}`,
              c: "#eab308",
            },
          ].map((r) => (
            <Box key={r.label} sx={{ p: 1.5, borderRadius: 2, bgcolor: `${r.c}12` }}>
              <Typography variant="caption" color="text.secondary">{r.label}</Typography>
              <Typography sx={{ fontWeight: 700, fontSize: "0.95rem", color: r.c }}>{r.value}</Typography>
            </Box>
          ))}
        </Box>

        {journal.byMethod.length > 0 && (
          <>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Per metodo di pagamento</Typography>
            <Table size="small" sx={{ mb: 2 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Metodo</TableCell>
                  <TableCell align="right">Entrate</TableCell>
                  <TableCell align="right">Uscite</TableCell>
                  <TableCell align="right">Netto</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {journal.byMethod.map((row) => (
                  <TableRow key={row.method}>
                    <TableCell>{row.method}</TableCell>
                    <TableCell align="right">{money(row.entrate)}</TableCell>
                    <TableCell align="right">{money(row.uscite)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>{money(row.netto)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </Paper>

      {journal.expressSales.length > 0 && (
        <Paper sx={[shellPanelSx, { p: 2, mb: 2 }]}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            Vendite Express ({journal.expressSales.length})
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Ora</TableCell>
                <TableCell>Riferimento</TableCell>
                <TableCell>Dettaglio</TableCell>
                <TableCell>Metodo</TableCell>
                <TableCell align="right">Importo</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {journal.expressSales.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{time(s.time)}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{s.label}</TableCell>
                  <TableCell sx={{ maxWidth: 240 }}>{s.lines}</TableCell>
                  <TableCell>{s.method}</TableCell>
                  <TableCell align="right">{money(s.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      {journal.movements.length > 0 && (
        <Paper sx={[shellPanelSx, { p: 2 }]}>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
            I movimenti manuali collegati a vendite Express sono esclusi da questo elenco per evitare doppi conteggi.
          </Typography>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            Tutti i movimenti ({journal.movements.length})
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Ora</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Descrizione</TableCell>
                <TableCell>Metodo</TableCell>
                <TableCell>Fonte</TableCell>
                <TableCell align="right">Importo</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {journal.movements.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>{time(m.time)}</TableCell>
                  <TableCell>{m.type}</TableCell>
                  <TableCell>{m.description}</TableCell>
                  <TableCell>{m.method}</TableCell>
                  <TableCell>{m.source}</TableCell>
                  <TableCell align="right" sx={{ color: m.type === "ENTRATA" ? "#22c55e" : "#ef4444", fontWeight: 600 }}>
                    {m.type === "ENTRATA" ? "+" : "-"}{money(m.amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}
    </Box>
  );
}
