"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  Typography,
  Alert,
  Button,
  CircularProgress,
} from "@mui/material";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import QRCode from "qrcode";
import { toAbsoluteScanUrl } from "@/lib/platform/express-scan-url";

interface Props {
  open: boolean;
  onClose: () => void;
  serviceColor: string;
  onIccidScanned: (iccid: string, assignedNumber?: string | null) => void | Promise<void>;
}

export default function ExpressPosScanQrDialog({
  open,
  onClose,
  serviceColor,
  onIccidScanned,
}: Props) {
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [scanUrl, setScanUrl] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [waiting, setWaiting] = useState(false);
  const [received, setReceived] = useState(false);
  const handledRef = useRef(false);

  const reset = useCallback(() => {
    setQrDataUrl("");
    setScanUrl("");
    setToken("");
    setError("");
    setWaiting(false);
    setReceived(false);
    handledRef.current = false;
  }, []);

  useEffect(() => {
    if (!open) {
      reset();
      return;
    }

    let cancelled = false;

    async function bootstrap() {
      setError("");
      setWaiting(true);
      try {
        const res = await fetch("/api/platform/express/scan-session", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "create" }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Impossibile avviare la sessione");

        if (cancelled) return;

        setToken(data.token);
        const absoluteUrl = toAbsoluteScanUrl(data.scanUrl);
        setScanUrl(absoluteUrl);
        const qr = await QRCode.toDataURL(absoluteUrl, { width: 260, margin: 2 });
        if (!cancelled) setQrDataUrl(qr);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Errore avvio scanner remoto");
        }
      } finally {
        if (!cancelled) setWaiting(false);
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [open, reset]);

  useEffect(() => {
    if (!open || !token || received) return;

    const interval = window.setInterval(async () => {
      try {
        const res = await fetch("/api/platform/express/scan-session", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "consume", token }),
        });
        const data = await res.json();
        if (data.scanned && data.iccid && !handledRef.current) {
          handledRef.current = true;
          setReceived(true);
          await onIccidScanned(data.iccid, data.assignedNumber);
          onClose();
        }
      } catch {
        /* ignore transient poll errors */
      }
    }, 1500);

    return () => window.clearInterval(interval);
  }, [open, token, received, onIccidScanned, onClose]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <QrCodeScannerIcon sx={{ color: serviceColor }} />
        Scansiona ICCID con smartphone
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          1. Inquadra questo QR con lo smartphone (non serve login)
          <br />
          2. Si aprirà lo scanner — punta la fotocamera sul codice ICCID della SIM
          <br />
          3. Il codice verrà inserito automaticamente nel carrello POS
        </Typography>

        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: 280,
            mb: 2,
            borderRadius: 2,
            border: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
            p: 2,
          }}
        >
          {waiting && <CircularProgress sx={{ color: serviceColor }} />}
          {!waiting && qrDataUrl && (
            <Box sx={{ textAlign: "center" }}>
              <img src={qrDataUrl} alt="QR scanner ICCID" width={260} height={260} />
              {!received && (
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                  In attesa della scansione dal telefono…
                </Typography>
              )}
            </Box>
          )}
        </Box>

        {scanUrl && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", mb: 2, wordBreak: "break-all", textAlign: "center" }}
          >
            {scanUrl}
          </Typography>
        )}

        <Button onClick={onClose} fullWidth variant="outlined">
          Chiudi
        </Button>
      </DialogContent>
    </Dialog>
  );
}
