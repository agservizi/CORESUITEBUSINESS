"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Chip,
  Alert,
  Stack,
  Button,
  CircularProgress,
  alpha,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import AddTaskIcon from "@mui/icons-material/AddTask";
import HandshakeIcon from "@mui/icons-material/Handshake";
import { useRouter } from "next/navigation";
import { useBusinessNavigation } from "@/context/BusinessNavigationProvider";
import { getShellTokens, shellPanelSx } from "@/theme/shell-tokens";

interface ClientProfile {
  id: string;
  name: string;
  companyName?: string | null;
  morosityScore: string;
  morosityFlag: boolean;
  portalActive?: boolean;
  stats: {
    expressSales: number;
    expressSpend: number;
    dealsWon: number;
    lifetimeValue: number;
    openTickets: number;
    openLeads: number;
    openDeals: number;
  };
  lastContact: string;
}

interface Props {
  clientId: string;
  onActivityCreated?: () => void;
}

function money(n: number) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);
}

export default function BusinessClientInsightPanel({ clientId, onActivityCreated }: Props) {
  const router = useRouter();
  const { navigate } = useBusinessNavigation();
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [creatingAct, setCreatingAct] = useState(false);

  useEffect(() => {
    if (!clientId) {
      setProfile(null);
      return;
    }
    setLoading(true);
    fetch(`/api/business/clienti/${clientId}/profile`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setProfile(d?.client ?? null))
      .finally(() => setLoading(false));
  }, [clientId]);

  if (!clientId) return null;

  async function createFollowUp() {
    setCreatingAct(true);
    await fetch("/api/business/attivita", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId,
        type: "CALL",
        title: "Follow-up cliente",
        dueAt: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      }),
    });
    setCreatingAct(false);
    onActivityCreated?.();
  }

  async function createDeal() {
    const title = profile?.companyName || profile?.name || "Nuovo deal";
    const res = await fetch("/api/business/deals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, clientId, value: 0, status: "OPEN", probability: 50 }),
    });
    if (res.ok) {
      const deal = await res.json();
      navigate("deals", deal.id);
    }
  }

  const morosityColor =
    profile?.morosityScore === "BLOCCATO"
      ? "error"
      : profile?.morosityScore === "ATTENZIONE"
        ? "warning"
        : "success";

  return (
    <Box sx={[shellPanelSx, { p: 2, mb: 3, borderColor: alpha("#6366f1", 0.25) }]}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
        <PersonIcon sx={{ color: "primary.main" }} />
        <Typography sx={{ fontWeight: 700 }}>Cliente 360°</Typography>
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
          <CircularProgress size={22} />
        </Box>
      ) : profile ? (
        <>
          {profile.morosityScore === "BLOCCATO" && (
            <Alert severity="error" sx={{ mb: 1.5 }}>
              Cliente bloccato per morosità — verifica prima di chiudere deal o vendite Express
            </Alert>
          )}

          <Stack direction="row" spacing={1} sx={{ mb: 1.5, flexWrap: "wrap" }}>
            <Chip label={`Morosità: ${profile.morosityScore}`} size="small" color={morosityColor} />
            {profile.portalActive && <Chip label="Portale attivo" size="small" color="info" />}
            <Chip label={`LTV ${money(profile.stats.lifetimeValue)}`} size="small" />
            <Chip label={`${profile.stats.expressSales} vendite Express`} size="small" variant="outlined" />
            <Chip label={`${profile.stats.openTickets} ticket aperti`} size="small" variant="outlined" />
            <Chip
              label={`Ultimo contatto ${new Date(profile.lastContact).toLocaleDateString("it-IT")}`}
              size="small"
              variant="outlined"
            />
          </Stack>

          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<OpenInNewIcon />}
              onClick={() => router.push(`/services/express?v=pos&clientId=${clientId}`)}
            >
              Apri in Express
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<AddTaskIcon />}
              disabled={creatingAct}
              onClick={createFollowUp}
            >
              {creatingAct ? "…" : "Crea attività follow-up"}
            </Button>
            <Button size="small" variant="contained" startIcon={<HandshakeIcon />} onClick={createDeal}>
              Nuovo deal
            </Button>
          </Stack>
        </>
      ) : (
        <Typography color="text.secondary" variant="body2">
          Profilo non disponibile
        </Typography>
      )}
    </Box>
  );
}
