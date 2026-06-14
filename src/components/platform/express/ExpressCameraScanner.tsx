"use client";

import { useEffect, useRef, useState } from "react";
import { Box, Dialog, DialogContent, DialogTitle, Button, Typography, Alert } from "@mui/material";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import { Html5Qrcode } from "html5-qrcode";

interface Props {
  open: boolean;
  onClose: () => void;
  onScan: (value: string) => void;
  serviceColor: string;
}

export default function ExpressCameraScanner({ open, onClose, onScan, serviceColor }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const html5Ref = useRef<Html5Qrcode | null>(null);
  const html5ContainerId = "express-iccid-scanner";
  const [error, setError] = useState("");
  const [active, setActive] = useState(false);
  const [mode, setMode] = useState<"native" | "html5">("native");

  useEffect(() => {
    if (!open) return;

    let stream: MediaStream | null = null;
    let raf = 0;
    let detector: BarcodeDetector | null = null;
    let stopped = false;

    async function startHtml5Fallback() {
      setMode("html5");
      const scanner = new Html5Qrcode(html5ContainerId);
      html5Ref.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 8, qrbox: { width: 280, height: 160 } },
        (decoded) => {
          if (decoded.length >= 8) {
            onScan(decoded.trim());
            onClose();
          }
        },
        () => undefined
      );
      setActive(true);
    }

    async function start() {
      setError("");
      try {
        if ("BarcodeDetector" in window) {
          setMode("native");
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" },
            audio: false,
          });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            await videoRef.current.play();
          }
          setActive(true);
          detector = new BarcodeDetector({ formats: ["code_128", "code_39", "qr_code", "ean_13"] });
          const tick = async () => {
            if (!videoRef.current || !detector || stopped) return;
            try {
              const codes = await detector.detect(videoRef.current);
              const hit = codes.find((c) => c.rawValue && c.rawValue.length >= 8);
              if (hit?.rawValue) {
                onScan(hit.rawValue.trim());
                onClose();
                return;
              }
            } catch {
              /* ignore frame errors */
            }
            raf = requestAnimationFrame(tick);
          };
          raf = requestAnimationFrame(tick);
          return;
        }

        await startHtml5Fallback();
      } catch (e) {
        if (!stopped && !html5Ref.current) {
          try {
            await startHtml5Fallback();
            return;
          } catch {
            /* fall through */
          }
        }
        setError(e instanceof Error ? e.message : "Impossibile accedere alla fotocamera");
      }
    }

    start();

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      if (html5Ref.current) {
        html5Ref.current.stop().catch(() => undefined);
        html5Ref.current.clear();
        html5Ref.current = null;
      }
      setActive(false);
    };
  }, [open, onClose, onScan]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <QrCodeScannerIcon sx={{ color: serviceColor }} />
        Scansiona ICCID
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
            aspectRatio: "4/3",
            mb: 2,
            display: mode === "html5" ? "block" : undefined,
          }}
        >
          {mode === "native" ? (
            <video ref={videoRef} playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <Box id={html5ContainerId} sx={{ width: "100%", minHeight: 240 }} />
          )}
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {active ? "Inquadra il codice a barre ICCID sulla SIM" : "Avvio fotocamera…"}
        </Typography>
        <Button onClick={onClose} fullWidth variant="outlined">
          Chiudi
        </Button>
      </DialogContent>
    </Dialog>
  );
}

declare global {
  interface BarcodeDetector {
    detect(source: ImageBitmapSource): Promise<{ rawValue?: string }[]>;
  }
  var BarcodeDetector: {
    new (options?: { formats?: string[] }): BarcodeDetector;
  };
}
