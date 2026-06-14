"use client";

import { useEffect, useRef, useState } from "react";
import { Box, Dialog, DialogContent, DialogTitle, Button, Typography, Alert } from "@mui/material";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import { Html5Qrcode } from "html5-qrcode";
import {
  EXPRESS_BARCODE_FORMATS,
  isScannableCode,
  normalizeBarcodeScan,
} from "@/lib/platform/express-scan-formats";

const SCANNER_ELEMENT_ID = "express-iccid-scanner";

interface Props {
  open: boolean;
  onClose: () => void;
  onScan: (value: string) => void;
  serviceColor: string;
}

export default function ExpressCameraScanner({ open, onClose, onScan, serviceColor }: Props) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState("");
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!open) return;

    let stopped = false;

    async function startScanner() {
      setError("");
      setActive(false);

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
            onScan(value);
            onClose();
          },
          () => undefined
        );
        if (!stopped) setActive(true);
      } catch (e) {
        if (!stopped) {
          setError(
            e instanceof Error
              ? e.message
              : "Impossibile avviare lo scanner. Consenti l'accesso alla fotocamera."
          );
        }
      }
    }

    const timer = window.setTimeout(startScanner, 150);

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
  }, [open, onClose, onScan]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <QrCodeScannerIcon sx={{ color: serviceColor }} />
        Scansiona codice
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Box
          sx={{
            borderRadius: 2,
            overflow: "hidden",
            bgcolor: "#000",
            minHeight: 280,
            mb: 2,
            "& #express-iccid-scanner": { width: "100%" },
            "& #express-iccid-scanner video": {
              width: "100%",
              height: "auto",
              display: "block",
              objectFit: "cover",
            },
          }}
        >
          <Box id={SCANNER_ELEMENT_ID} sx={{ width: "100%", minHeight: 280 }} />
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {active
            ? "Inquadra QR, barcode 1D/2D o Data Matrix — fotocamera posteriore attiva"
            : "Avvio scanner…"}
        </Typography>
        <Button onClick={onClose} fullWidth variant="outlined">
          Chiudi
        </Button>
      </DialogContent>
    </Dialog>
  );
}
