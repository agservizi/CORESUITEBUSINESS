"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Box, Typography, Button, Stack, List, ListItem, ListItemText, IconButton, CircularProgress, LinearProgress,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DeleteIcon from "@mui/icons-material/Delete";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { csrfHeaders } from "@/lib/csrf-client";

interface Doc {
  id: string;
  fileName: string;
  fileUrl: string;
  mimeType?: string | null;
  createdAt: string;
}

export default function EntityDocumentsPanel({
  entityType,
  entityId,
  serviceColor = "#6366f1",
}: {
  entityType: string;
  entityId: string;
  serviceColor?: string;
}) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/documents/${entityType}/${entityId}`);
      const data = await res.json();
      setDocs(Array.isArray(data.documents) ? data.documents : []);
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/documents/${entityType}/${entityId}/upload`, {
        method: "POST",
        headers: csrfHeaders(),
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Upload fallito");
      }
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Errore upload");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleDelete(docId: string) {
    if (!confirm("Eliminare questo documento?")) return;
    await fetch(`/api/documents/${entityType}/${entityId}/${docId}`, {
      method: "DELETE",
      headers: csrfHeaders(),
    });
    await load();
  }

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
        Documenti allegati
      </Typography>
      {loading ? (
        <CircularProgress size={20} />
      ) : (
        <List dense disablePadding>
          {docs.map((d) => (
            <ListItem
              key={d.id}
              secondaryAction={
                <Stack direction="row" spacing={0.5}>
                  <IconButton edge="end" size="small" component="a" href={d.fileUrl} target="_blank" rel="noopener">
                    <OpenInNewIcon fontSize="small" />
                  </IconButton>
                  <IconButton edge="end" size="small" onClick={() => handleDelete(d.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>
              }
            >
              <ListItemText
                primary={d.fileName}
                secondary={`${d.mimeType ?? "file"} · ${new Date(d.createdAt).toLocaleString("it-IT")}`}
              />
            </ListItem>
          ))}
          {!docs.length && (
            <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
              Nessun documento allegato.
            </Typography>
          )}
        </List>
      )}
      {uploading && <LinearProgress sx={{ mb: 1 }} />}
      <input
        ref={inputRef}
        type="file"
        hidden
        accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,application/pdf,image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUpload(file);
        }}
      />
      <Button
        variant="outlined"
        size="small"
        startIcon={<UploadFileIcon />}
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        sx={{ mt: 1, borderColor: serviceColor, color: serviceColor }}
      >
        Carica file (PDF, immagini, DOC — max 10 MB)
      </Button>
    </Box>
  );
}
