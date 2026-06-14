"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Box, Typography, Paper, Button, TextField, Stack, Table, TableHead, TableRow, TableCell, TableBody,
  Chip, CircularProgress, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions,
} from "@mui/material";
import { usePlatformNavigation } from "@/context/PlatformNavigationProvider";
import { getModuleDefinition } from "@/config/platform-modules";
import GenericModuleView from "../GenericModuleView";
import ModuleDashboard from "../service-shell/ModuleDashboard";
import ServicePremiumSubView from "../service-shell/ServicePremiumSubView";
import { getPlatformService } from "@/config/platform-services";
import { shellPaperSx } from "@/theme/shell-tokens";
import { jsonMutationHeaders } from "@/lib/csrf-client";

type Balance = { clientId: string; clientName: string; clientEmail?: string | null; balance: number };
type Reward = { id: string; name: string; description?: string | null; pointsCost: number; isActive: boolean };

type FormState = {
  clientId: string;
  points: string;
  movementType: string;
  description: string;
  reason: string;
  rewardName: string;
  rewardCost: string;
  rewardDesc: string;
  rewardId: string;
};

const INITIAL_FORM: FormState = {
  clientId: "",
  points: "100",
  movementType: "accredito",
  description: "",
  reason: "",
  rewardName: "",
  rewardCost: "100",
  rewardDesc: "",
  rewardId: "",
};

export default function FedeltaModuleView({ viewId, serviceColor = "#14b8a6" }: { viewId: string; serviceColor?: string }) {
  const { navigate, serviceSlug } = usePlatformNavigation();
  const service = getPlatformService(serviceSlug);
  const module = getModuleDefinition("fedelta")!;
  const [balances, setBalances] = useState<Balance[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialog, setDialog] = useState<"movement" | "reward" | "redeem" | null>(null);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);

  const loadBalances = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/platform/fedelta/extras?view=balances");
      const data = await res.json();
      setBalances(data.balances ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRewards = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/platform/fedelta/extras?view=rewards");
      const data = await res.json();
      setRewards(data.rewards ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (viewId === "saldi") loadBalances();
    if (viewId === "premi") loadRewards();
  }, [viewId, loadBalances, loadRewards]);

  useEffect(() => {
    if (dialog === "movement" || dialog === "redeem") {
      loadBalances();
      if (dialog === "redeem") loadRewards();
    }
  }, [dialog, loadBalances, loadRewards]);

  async function submitMovement() {
    await fetch("/api/platform/fedelta/extras", {
      method: "POST",
      headers: jsonMutationHeaders(),
      body: JSON.stringify({
        clientId: form.clientId,
        points: Number(form.points),
        movementType: form.movementType,
        description: form.description,
        reason: form.reason,
      }),
    });
    setDialog(null);
    window.dispatchEvent(new CustomEvent("coresuite:data-mutated", { detail: { moduleKey: "fedelta" } }));
    if (viewId === "saldi") await loadBalances();
  }

  async function submitReward() {
    await fetch("/api/platform/fedelta/extras", {
      method: "POST",
      headers: jsonMutationHeaders(),
      body: JSON.stringify({
        action: "createReward",
        name: form.rewardName,
        description: form.rewardDesc,
        pointsCost: Number(form.rewardCost),
      }),
    });
    setDialog(null);
    await loadRewards();
  }

  async function submitRedeem() {
    await fetch("/api/platform/fedelta/extras", {
      method: "POST",
      headers: jsonMutationHeaders(),
      body: JSON.stringify({ action: "redeem", clientId: form.clientId, rewardId: form.rewardId }),
    });
    setDialog(null);
    window.dispatchEvent(new CustomEvent("coresuite:data-mutated", { detail: { moduleKey: "fedelta" } }));
    await loadBalances();
  }

  if (viewId === "dashboard") {
    return (
      <ModuleDashboard
        moduleKey="fedelta"
        serviceColor={serviceColor}
        serviceName="Programma Fedeltà"
        listViewId="elenco"
        onNavigate={navigate}
        serviceSlug={serviceSlug}
      />
    );
  }

  if (viewId === "saldi") {
    return (
      <ServicePremiumSubView
        moduleKey="fedelta"
        viewId={viewId}
        serviceName="Programma Fedeltà"
        serviceColor={serviceColor}
        serviceGradient={service?.gradient}
        badge={`${balances.length} clienti`}
        actions={
          <Button variant="contained" sx={{ bgcolor: "#fff", color: serviceColor, fontWeight: 700 }} onClick={() => setDialog("movement")}>Nuovo movimento</Button>
        }
      >
        {loading ? <CircularProgress /> : (
          <Paper sx={[shellPaperSx, { overflow: "auto" }]}>
            <Table size="small">
              <TableHead>
                <TableRow><TableCell>Cliente</TableCell><TableCell>Email</TableCell><TableCell align="right">Saldo punti</TableCell><TableCell /></TableRow>
              </TableHead>
              <TableBody>
                {balances.map((b) => (
                  <TableRow key={b.clientId}>
                    <TableCell>{b.clientName}</TableCell>
                    <TableCell>{b.clientEmail ?? "—"}</TableCell>
                    <TableCell align="right"><Chip label={b.balance} color={b.balance >= 200 ? "success" : "default"} size="small" /></TableCell>
                    <TableCell align="right">
                      <Button size="small" onClick={() => { setForm((f) => ({ ...f, clientId: b.clientId })); setDialog("redeem"); }}>Riscatta</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        )}
        <MovementDialog open={dialog === "movement"} onClose={() => setDialog(null)} form={form} setForm={setForm} onSubmit={submitMovement} balances={balances} serviceColor={serviceColor} />
        <RedeemDialog open={dialog === "redeem"} onClose={() => setDialog(null)} form={form} setForm={setForm} onSubmit={submitRedeem} rewards={rewards.filter((r) => r.isActive)} serviceColor={serviceColor} />
      </ServicePremiumSubView>
    );
  }

  if (viewId === "premi") {
    return (
      <ServicePremiumSubView
        moduleKey="fedelta"
        viewId={viewId}
        serviceName="Programma Fedeltà"
        serviceColor={serviceColor}
        serviceGradient={service?.gradient}
        badge={`${rewards.length} premi`}
        actions={
          <Button variant="contained" sx={{ bgcolor: "#fff", color: serviceColor, fontWeight: 700 }} onClick={() => setDialog("reward")}>Nuovo premio</Button>
        }
      >
        {loading ? <CircularProgress /> : (
          <Stack spacing={1}>
            {rewards.map((r) => (
              <Paper key={r.id} sx={[shellPaperSx, { p: 2 }]}>
                <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
                  <Box>
                    <Typography sx={{ fontWeight: 700 }}>{r.name}</Typography>
                    <Typography variant="body2" color="text.secondary">{r.description ?? "—"}</Typography>
                  </Box>
                  <Chip label={`${r.pointsCost} pt`} sx={{ bgcolor: serviceColor, color: "#fff" }} />
                </Stack>
              </Paper>
            ))}
            {!rewards.length && <Typography color="text.secondary">Nessun premio configurato.</Typography>}
          </Stack>
        )}
        <RewardDialog open={dialog === "reward"} onClose={() => setDialog(null)} form={form} setForm={setForm} onSubmit={submitReward} serviceColor={serviceColor} />
      </ServicePremiumSubView>
    );
  }

  return (
    <Box>
      <GenericModuleView
        module={module}
        viewId="elenco"
        serviceColor={serviceColor}
        showToolbar
        moduleKeyOverride="fedelta"
        serviceNameOverride="Programma Fedeltà"
      />
      <MovementDialog open={dialog === "movement"} onClose={() => setDialog(null)} form={form} setForm={setForm} onSubmit={submitMovement} balances={balances} serviceColor={serviceColor} />
    </Box>
  );
}

function MovementDialog({
  open, onClose, form, setForm, onSubmit, balances, serviceColor,
}: {
  open: boolean; onClose: () => void;
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  onSubmit: () => void; balances: Balance[]; serviceColor: string;
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Nuovo movimento punti</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField select size="small" label="Cliente" value={form.clientId} onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value }))}>
            {balances.map((b) => <MenuItem key={b.clientId} value={b.clientId}>{b.clientName} ({b.balance} pt)</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Tipo" value={form.movementType} onChange={(e) => setForm((f) => ({ ...f, movementType: e.target.value }))}>
            <MenuItem value="accredito">Accredito</MenuItem>
            <MenuItem value="riscatto">Riscatto</MenuItem>
            <MenuItem value="rettifica">Rettifica</MenuItem>
          </TextField>
          <TextField size="small" type="number" label="Punti (+/-)" value={form.points} onChange={(e) => setForm((f) => ({ ...f, points: e.target.value }))} />
          <TextField size="small" label="Descrizione" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          <TextField size="small" label="Motivo" value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annulla</Button>
        <Button variant="contained" sx={{ bgcolor: serviceColor }} onClick={onSubmit} disabled={!form.clientId}>Salva</Button>
      </DialogActions>
    </Dialog>
  );
}

function RewardDialog({ open, onClose, form, setForm, onSubmit, serviceColor }: {
  open: boolean; onClose: () => void;
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  onSubmit: () => void; serviceColor: string;
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Nuovo premio</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField size="small" label="Nome premio" value={form.rewardName} onChange={(e) => setForm((f) => ({ ...f, rewardName: e.target.value }))} />
          <TextField size="small" type="number" label="Costo in punti" value={form.rewardCost} onChange={(e) => setForm((f) => ({ ...f, rewardCost: e.target.value }))} />
          <TextField size="small" multiline rows={2} label="Descrizione" value={form.rewardDesc} onChange={(e) => setForm((f) => ({ ...f, rewardDesc: e.target.value }))} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annulla</Button>
        <Button variant="contained" sx={{ bgcolor: serviceColor }} onClick={onSubmit}>Crea</Button>
      </DialogActions>
    </Dialog>
  );
}

function RedeemDialog({ open, onClose, form, setForm, onSubmit, rewards, serviceColor }: {
  open: boolean; onClose: () => void;
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  onSubmit: () => void; rewards: Reward[]; serviceColor: string;
}) {
  useEffect(() => {
    if (open && rewards.length && !form.rewardId) {
      setForm((f) => ({ ...f, rewardId: rewards[0].id }));
    }
  }, [open, rewards, form.rewardId, setForm]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Riscatta premio</DialogTitle>
      <DialogContent>
        <TextField select fullWidth size="small" label="Premio" value={form.rewardId} onChange={(e) => setForm((f) => ({ ...f, rewardId: e.target.value }))} sx={{ mt: 1 }}>
          {rewards.map((r) => <MenuItem key={r.id} value={r.id}>{r.name} — {r.pointsCost} pt</MenuItem>)}
        </TextField>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annulla</Button>
        <Button variant="contained" sx={{ bgcolor: serviceColor }} onClick={onSubmit} disabled={!form.rewardId}>Riscatta</Button>
      </DialogActions>
    </Dialog>
  );
}
