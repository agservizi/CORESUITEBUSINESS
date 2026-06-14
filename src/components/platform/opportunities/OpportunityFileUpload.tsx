"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Box, Typography, Button, IconButton, CircularProgress, Stack, LinearProgress,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import DeleteIcon from "@mui/icons-material/Delete";
import { csrfHeaders } from "@/lib/csrf-client";
import { useTheme } from "@mui/material/styles";
import { getShellTokens } from "@/theme/shell-tokens";

interface OppFile {
  id: string;
  originalName: string;
  filePath: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
}

interface Props {
  opportunityId: string;
  serviceColor?: string;
  onChange?: () => void;
}

export default function OpportunityFileUpload({ opportunityId, serviceColor = "#8b5cf6", onChange }: Props) {
  const theme = useTheme();
  const shell = getShellTokens(theme);
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<OppFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/platform/opportunities/${opportunityId}/files`);
      const data = await res.json();
      setFiles(data.files || []);
    } finally {
      setLoading(false);
    }
  }, [opportunityId]);

  useEffect(() => { load(); }, [load]);

  async function uploadFile(file: File) {
    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/platform/opportunities/${opportunityId}/files`, {
        method: "POST",
        headers: csrfHeaders(),
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Upload fallito");
        return;
      }
      await load();
      onChange?.();
    } finally {
      setUploading(false);
    }
  }

  async function removeFile(fileId: string) {
    await fetch(`/api/platform/opportunities/${opportunityId}/files/${fileId}`, {
      method: "DELETE",
      headers: csrfHeaders(),
    });
    await load();
    onChange?.();
  }

  function formatSize(n: number) {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1, fontWeight: 600, textTransform: "uppercase" }}>
        Documenti allegati
      </Typography>

      <Box
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file) uploadFile(file);
        }}
        onClick={() => inputRef.current?.click()}
        sx={{
          border: `2px dashed ${dragOver ? serviceColor : shell.borderColor}`,
          borderRadius: 2,
          p: 2,
          textAlign: "center",
          cursor: "pointer",
          mb: 1.5,
          bgcolor: dragOver ? `${serviceColor}08` : "transparent",
          transition: "all 0.2s",
          "&:hover": { borderColor: serviceColor, bgcolor: `${serviceColor}06` },
        }}
      >
        <input
          ref={inputRef}
          type="file"
          hidden
          accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) uploadFile(file);
            e.target.value = "";
          }}
        />
        {uploading ? (
          <CircularProgress size={24} sx={{ color: serviceColor }} />
        ) : (
          <>
            <CloudUploadIcon sx={{ color: serviceColor, mb: 0.5 }} />
            <Typography sx={{ fontSize: "0.85rem", fontWeight: 600 }}>Trascina o clicca per caricare</Typography>
            <Typography variant="caption" color="text.secondary">PDF, JPG, PNG · max 10 MB</Typography>
          </>
        )}
      </Box>

      {error && (
        <Typography color="error" sx={{ fontSize: "0.8rem", mb: 1 }}>{error}</Typography>
      )}

      {loading ? (
        <LinearProgress sx={{ height: 4, borderRadius: 2 }} />
      ) : files.length === 0 ? (
        <Typography variant="caption" color="text.secondary">Nessun documento caricato</Typography>
      ) : (
        <Stack spacing={1}>
          {files.map((f) => (
            <Box
              key={f.id}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                p: 1,
                borderRadius: 1.5,
                border: shell.border,
              }}
            >
              <InsertDriveFileIcon sx={{ fontSize: 18, color: serviceColor }} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  component="a"
                  href={f.filePath}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ fontSize: "0.8rem", fontWeight: 600, color: "text.primary", textDecoration: "none", display: "block" }}
                  noWrap
                >
                  {f.originalName}
                </Typography>
                <Typography variant="caption" color="text.secondary">{formatSize(f.fileSize)}</Typography>
              </Box>
              <IconButton size="small" onClick={() => removeFile(f.id)} aria-label="Elimina file">
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  );
}
