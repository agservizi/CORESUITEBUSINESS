"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  TextField,
  InputAdornment,
} from "@mui/material";
import QRCode from "qrcode";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import SendIcon from "@mui/icons-material/Send";

interface Props {
  open: boolean;
  onClose: () => void;
  saleId: string;
  receiptToken?: string | null;
  clientPhone?: string | null;
}

export default function ExpressDigitalReceiptDialog({
  open,
  onClose,
  saleId,
  receiptToken,
  clientPhone,
}: Props) {
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const receiptUrl =
    typeof window !== "undefined" && receiptToken
      ? `${window.location.origin}/express/receipt/${saleId}?t=${receiptToken}`
      : "";

  useEffect(() => {
    if (!open || !receiptUrl) return;
    QRCode.toDataURL(receiptUrl, { width: 220, margin: 2 }).then(setQrDataUrl);
  }, [open, receiptUrl]);

  function copyLink() {
    if (!receiptUrl) return;
    navigator.clipboard.writeText(receiptUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function shareWhatsApp() {
    if (!receiptUrl) return;
    const phone = clientPhone?.replace(/\D/g, "") || "";
    const text = encodeURIComponent(`La tua ricevuta Express: ${receiptUrl}`);
    window.open(`https://wa.me/${phone}?text=${text}`, "_blank");
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Ricevuta digitale</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Il cliente può aprire la ricevuta scansionando il QR o ricevendo il link.
        </Typography>
        {qrDataUrl && (
          <Box sx={{ textAlign: "center", mb: 2 }}>
            <img src={qrDataUrl} alt="QR ricevuta" width={220} height={220} />
          </Box>
        )}
        <TextField
          fullWidth
          size="small"
          value={receiptUrl}
          slotProps={{
            input: {
              readOnly: true,
              endAdornment: (
                <InputAdornment position="end">
                  <Button size="small" onClick={copyLink} startIcon={<ContentCopyIcon />}>
                    {copied ? "Copiato" : "Copia"}
                  </Button>
                </InputAdornment>
              ),
            },
          }}
        />
      </DialogContent>
      <DialogActions>
        {clientPhone && (
          <Button startIcon={<SendIcon />} onClick={shareWhatsApp} color="success">
            WhatsApp
          </Button>
        )}
        <Button onClick={onClose}>Chiudi</Button>
      </DialogActions>
    </Dialog>
  );
}
