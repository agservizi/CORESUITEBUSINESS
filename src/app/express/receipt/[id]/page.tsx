import { notFound } from "next/navigation";
import { Box, Typography, Divider, Paper, Chip } from "@mui/material";
import { getPublicReceipt } from "@/lib/platform/express-wow";

function money(n: number) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);
}

export default async function ExpressPublicReceiptPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { id } = await params;
  const { t } = await searchParams;
  if (!t) notFound();

  const receipt = await getPublicReceipt(id, t);
  if (!receipt) notFound();

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        py: 4,
        px: 2,
        display: "flex",
        justifyContent: "center",
      }}
    >
      <Paper
        elevation={0}
        sx={{
          maxWidth: 420,
          width: "100%",
          p: 3,
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 2 }}>
          Express Telefonia
        </Typography>
        <Typography sx={{ fontWeight: 800, fontSize: "1.35rem", mb: 0.5 }}>
          Ricevuta #{receipt.receiptNumber ?? receipt.id.slice(-6)}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {new Date(receipt.soldAt).toLocaleString("it-IT")} · {receipt.paymentMethod}
        </Typography>
        {receipt.clientName && (
          <Typography variant="body2" sx={{ mb: 2 }}>
            Cliente: <strong>{receipt.clientName}</strong>
          </Typography>
        )}
        <Chip label={receipt.status} size="small" sx={{ mb: 2 }} />

        <Divider sx={{ mb: 2 }} />

        {receipt.lines.map((line, i) => (
          <Box
            key={i}
            sx={{
              display: "flex",
              justifyContent: "space-between",
              gap: 2,
              py: 1,
              borderBottom: "1px solid",
              borderColor: "divider",
            }}
          >
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2">{line.description}</Typography>
              {line.assignedNumber && (
                <Typography variant="caption" color="text.secondary">
                  Numero: {line.assignedNumber}
                </Typography>
              )}
            </Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {money(line.lineTotal)}
            </Typography>
          </Box>
        ))}

        {receipt.discount > 0 && (
          <Box sx={{ display: "flex", justifyContent: "space-between", mt: 2 }}>
            <Typography color="text.secondary">Sconto</Typography>
            <Typography color="error.main">− {money(receipt.discount)}</Typography>
          </Box>
        )}

        <Box sx={{ display: "flex", justifyContent: "space-between", mt: 2 }}>
          <Typography sx={{ fontWeight: 800, fontSize: "1.15rem" }}>Totale</Typography>
          <Typography sx={{ fontWeight: 800, fontSize: "1.15rem", color: "#ca8a04" }}>
            {money(receipt.total)}
          </Typography>
        </Box>

        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 3, textAlign: "center" }}>
          Documento generato digitalmente — conserva questo link per i tuoi archivi.
        </Typography>
      </Paper>
    </Box>
  );
}
