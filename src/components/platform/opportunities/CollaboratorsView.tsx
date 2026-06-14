"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Box, Typography, Button, MenuItem, TextField, Stack, IconButton, CircularProgress,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import { shellPanelSx } from "@/theme/shell-tokens";
import ClientPicker from "@/components/platform/ClientPicker";
import { jsonMutationHeaders } from "@/lib/csrf-client";

interface Link {
  id: string;
  collaborator: { id: string; name: string | null; email: string };
  client: { id: string; name: string; companyName?: string | null };
}

interface Props {
  serviceColor: string;
}

export default function CollaboratorsView({ serviceColor }: Props) {
  const [links, setLinks] = useState<Link[]>([]);
  const [collaborators, setCollaborators] = useState<{ id: string; name: string | null; email: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [collaboratorId, setCollaboratorId] = useState("");
  const [clientId, setClientId] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/platform/opportunities/collaborators");
    const data = await res.json();
    setLinks(data.links || []);
    setCollaborators(data.collaborators || []);
    setCollaboratorId((prev) => prev || data.collaborators?.[0]?.id || "");
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleAssign() {
    if (!collaboratorId || !clientId) return;
    setSaving(true);
    await fetch("/api/platform/opportunities/collaborators", {
      method: "POST",
      headers: jsonMutationHeaders(),
      body: JSON.stringify({ collaboratorId, clientId }),
    });
    setClientId("");
    await load();
    setSaving(false);
  }

  async function handleRemove(link: Link) {
    await fetch(
      `/api/platform/opportunities/collaborators?collaboratorId=${link.collaborator.id}&clientId=${link.client.id}`,
      { method: "DELETE", headers: jsonMutationHeaders() }
    );
    await load();
  }

  return (
    <Box>
      <Typography sx={{ fontWeight: 700, fontSize: "1.5rem", mb: 1 }}>Rete clienti collaboratori</Typography>
      <Typography color="text.secondary" sx={{ mb: 3, fontSize: "0.875rem" }}>
        Assegna clienti ai collaboratori per limitare la visibilità delle opportunità.
      </Typography>

      {collaborators.length > 0 && (
        <Box sx={[shellPanelSx, { p: 2, mb: 3 }]}>
          <Typography sx={{ fontWeight: 600, mb: 2 }}>Nuova assegnazione</Typography>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ alignItems: { xs: "stretch", md: "flex-end" } }}>
            <TextField
              select
              label="Collaboratore"
              size="small"
              value={collaboratorId}
              onChange={(e) => setCollaboratorId(e.target.value)}
              sx={{ minWidth: 220 }}
            >
              {collaborators.map((c) => (
                <MenuItem key={c.id} value={c.id}>{c.name || c.email}</MenuItem>
              ))}
            </TextField>
            <Box sx={{ flex: 1, minWidth: 240 }}>
              <ClientPicker value={clientId} onChange={setClientId} />
            </Box>
            <Button variant="contained" startIcon={<AddIcon />} disabled={saving || !clientId} onClick={handleAssign} sx={{ background: serviceColor }}>
              Assegna
            </Button>
          </Stack>
        </Box>
      )}

      <Box sx={[shellPanelSx, { overflow: "hidden" }]}>
        {loading ? (
          <Box sx={{ py: 6, display: "flex", justifyContent: "center" }}><CircularProgress size={28} /></Box>
        ) : links.length === 0 ? (
          <Typography sx={{ py: 6, textAlign: "center", color: "text.secondary" }}>
            {collaborators.length === 0 ? "Nessun collaboratore nel sistema" : "Nessuna assegnazione"}
          </Typography>
        ) : (
          links.map((link) => (
            <Box
              key={link.id}
              sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 2, py: 1.5, borderBottom: "1px solid", borderColor: "divider" }}
            >
              <Box>
                <Typography sx={{ fontWeight: 600, fontSize: "0.875rem" }}>
                  {link.client.companyName || link.client.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {link.collaborator.name || link.collaborator.email}
                </Typography>
              </Box>
              {collaborators.length > 0 && (
                <IconButton size="small" color="error" onClick={() => handleRemove(link)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              )}
            </Box>
          ))
        )}
      </Box>
    </Box>
  );
}
