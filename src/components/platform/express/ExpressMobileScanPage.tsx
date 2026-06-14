"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  Paper,
  CircularProgress,
} from "@mui/material";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { Html5Qrcode } from "html5-qrcode";
import {
  EXPRESS_BARCODE_FORMATS,
  isScannableCode,
  normalizeBarcodeScan,
} from "@/lib/platform/express-scan-formats";

const SCANNER_ELEMENT_ID = "express-mobile-iccid-scanner";

const fixedPageSx = {
  height: "100%",
  maxHeight: "100%",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
} as const;

export default function ExpressMobileScanPage({ token }: { token: string }) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [iccid, setIccid] = useState("");
  const [assignedNumber, setAssignedNumber] = useState("");
  const [error, setError] = useState("");
  const [active, setActive] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const invalidToken = !token;

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyPosition = body.style.position;
    const prevBodyWidth = body.style.width;
    const prevBodyHeight = body.style.height;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.width = "100%";
    body.style.height = "100%";

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      body.style.position = prevBodyPosition;
      body.style.width = prevBodyWidth;
      body.style.height = prevBodyHeight;
    };
  }, []);

  const submitScan = useCallback(
    async (value: string, number?: string) => {
      if (!token) {
        setError("Link scanner non valido — rigenera il QR dal POS");
        return;
      }
      const normalized = normalizeBarcodeScan(value);
      if (!isScannableCode(normalized)) {
        setError("Codice non valido");
        return;
      }
      setSubmitting(true);
      setError("");
      try {
        const res = await fetch("/api/platform/express/scan-session/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token,
            iccid: normalized,
            assignedNumber: number?.trim() || assignedNumber.trim() || null,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Invio fallito");
        setDone(true);
        if (scannerRef.current) {
          await scannerRef.current.stop().catch(() => undefined);
          scannerRef.current.clear();
          scannerRef.current = null;
        }
        setActive(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Errore invio al POS");
      } finally {
        setSubmitting(false);
      }
    },
    [token, assignedNumber]
  );

  useEffect(() => {
    if (done || invalidToken) return;

    let stopped = false;

    async function startScanner() {
      setError("");
      const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID, {
        verbose: false,
        formatsToSupport: EXPRESS_BARCODE_FORMATS,
        useBarCodeDetectorIfSupported: true,
      });
      scannerRef.current = scanner;

      try {
        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 12,
            aspectRatio: 1,
            disableFlip: false,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              const width = Math.floor(Math.min(viewfinderWidth * 0.92, 360));
              const height = Math.floor(Math.min(viewfinderHeight * 0.45, 180));
              return { width, height };
            },
          },
          (decoded) => {
            const value = normalizeBarcodeScan(decoded);
            if (!isScannableCode(value)) return;
            setIccid(value);
            submitScan(value);
          },
          () => undefined
        );
        if (!stopped) setActive(true);
      } catch (e) {
        if (!stopped) {
          setError(
            e instanceof Error
              ? e.message
              : "Impossibile avviare la fotocamera. Consenti l'accesso."
          );
        }
      }
    }

    const timer = window.setTimeout(startScanner, 200);

    return () => {
      stopped = true;
      window.clearTimeout(timer);
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => undefined);
        scannerRef.current.clear();
        scannerRef.current = null;
      }
      setActive(false);
    };
  }, [done, invalidToken, submitScan]);

  if (invalidToken) {
    return (
      <Box
        sx={{
          ...fixedPageSx,
          alignItems: "center",
          justifyContent: "center",
          p: 2,
          bgcolor: "background.default",
        }}
      >
        <Paper sx={{ p: 3, maxWidth: 420, width: "100%", textAlign: "center", borderRadius: 3 }}>
          <Typography sx={{ fontWeight: 700, fontSize: "1.1rem", mb: 1 }}>
            Link scanner non valido
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Torna al POS Express e genera un nuovo QR con &quot;Scansiona con smartphone&quot;.
          </Typography>
        </Paper>
      </Box>
    );
  }

  if (done) {
    return (
      <Box
        sx={{
          ...fixedPageSx,
          alignItems: "center",
          justifyContent: "center",
          p: 2,
          bgcolor: "background.default",
        }}
      >
        <Paper sx={{ p: 3, maxWidth: 420, width: "100%", textAlign: "center", borderRadius: 3 }}>
          <CheckCircleIcon sx={{ fontSize: 56, color: "success.main", mb: 1 }} />
          <Typography sx={{ fontWeight: 700, fontSize: "1.2rem", mb: 1 }}>
            Codice inviato al POS
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Puoi tornare al computer: il codice è stato inserito nel carrello Express.
          </Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ ...fixedPageSx, bgcolor: "#0a0a0a", color: "#fff" }}>
      <Box sx={{ flexShrink: 0, px: 2, pt: 1.5, pb: 1, textAlign: "center" }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1 }}>
          <QrCodeScannerIcon sx={{ color: "#eab308", fontSize: 22 }} />
          <Typography sx={{ fontWeight: 700, fontSize: "1rem" }}>Scanner Express</Typography>
        </Box>
        <Typography variant="caption" sx={{ opacity: 0.75, display: "block", mt: 0.25 }}>
          Inquadra QR o barcode sulla SIM
        </Typography>
      </Box>

      {error && (
        <Alert severity="warning" sx={{ mx: 2, mb: 1, py: 0, flexShrink: 0 }}>
          {error}
        </Alert>
      )}

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          mx: 2,
          borderRadius: 2,
          overflow: "hidden",
          bgcolor: "#000",
          position: "relative",
          "& video": {
            width: "100%",
            height: "100%",
            display: "block",
            objectFit: "cover",
          },
          [`& #${SCANNER_ELEMENT_ID}`]: {
            width: "100%",
            height: "100%",
          },
        }}
      >
        <Box id={SCANNER_ELEMENT_ID} sx={{ width: "100%", height: "100%" }} />
        {!active && !error && (
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CircularProgress sx={{ color: "#eab308" }} />
          </Box>
        )}
      </Box>

      <Box sx={{ flexShrink: 0, px: 2, py: 1.5 }}>
        <TextField
          fullWidth
          label="Codice rilevato"
          value={iccid}
          onChange={(e) => setIccid(e.target.value)}
          size="small"
          sx={{ mb: 1, bgcolor: "background.paper", borderRadius: 1 }}
        />
        <TextField
          fullWidth
          label="Numero (opz.)"
          value={assignedNumber}
          onChange={(e) => setAssignedNumber(e.target.value)}
          size="small"
          sx={{ mb: 1, bgcolor: "background.paper", borderRadius: 1 }}
        />
        <Button
          fullWidth
          variant="contained"
          disabled={!iccid.trim() || submitting}
          onClick={() => submitScan(iccid, assignedNumber)}
          sx={{ bgcolor: "#ca8a04", "&:hover": { bgcolor: "#a16207" } }}
        >
          {submitting ? "Invio al POS…" : "Invia al POS"}
        </Button>
      </Box>
    </Box>
  );
}
