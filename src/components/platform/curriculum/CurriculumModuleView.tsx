"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Box, Typography, Paper, Button, TextField, Stack, Tabs, Tab, List, ListItem,
  ListItemText, IconButton, CircularProgress, Chip,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { usePlatformNavigation } from "@/context/PlatformNavigationProvider";
import { getModuleDefinition } from "@/config/platform-modules";
import GenericModuleView from "../GenericModuleView";
import ModuleDashboard from "../service-shell/ModuleDashboard";
import ServicePremiumSubView from "../service-shell/ServicePremiumSubView";
import { getPlatformService } from "@/config/platform-services";
import { statusChipColor } from "../service-shell/service-view-themes";
import { shellPaperSx } from "@/theme/shell-tokens";
import { jsonMutationHeaders } from "@/lib/csrf-client";

type CurriculumFull = {
  id: string;
  title: string;
  status: string;
  summary?: string | null;
  keySkills?: string | null;
  experiences: Record<string, unknown>[];
  education: Record<string, unknown>[];
  skills: Record<string, unknown>[];
  languages: Record<string, unknown>[];
};

export default function CurriculumModuleView({ viewId, serviceColor = "#6366f1" }: { viewId: string; serviceColor?: string }) {
  const { navigate, serviceSlug } = usePlatformNavigation();
  const service = getPlatformService(serviceSlug);
  const module = getModuleDefinition("curriculum")!;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cv, setCv] = useState<CurriculumFull | null>(null);
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [expForm, setExpForm] = useState({ roleTitle: "", employer: "", startDate: "", description: "" });

  const loadCv = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/platform/curriculum/${id}/full`);
      const data = await res.json();
      setCv(data.curriculum ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedId) loadCv(selectedId);
  }, [selectedId, loadCv]);

  async function saveProfile() {
    if (!selectedId || !cv) return;
    await fetch(`/api/platform/curriculum/${selectedId}/full`, {
      method: "PATCH",
      headers: jsonMutationHeaders(),
      body: JSON.stringify({ summary: cv.summary, keySkills: cv.keySkills, title: cv.title, status: cv.status }),
    });
  }

  async function addExperience() {
    if (!selectedId) return;
    await fetch(`/api/platform/curriculum/${selectedId}/full`, {
      method: "POST",
      headers: jsonMutationHeaders(),
      body: JSON.stringify({ section: "experience", ...expForm }),
    });
    setExpForm({ roleTitle: "", employer: "", startDate: "", description: "" });
    await loadCv(selectedId);
  }

  async function deleteSection(section: string, itemId: string) {
    if (!selectedId) return;
    await fetch(`/api/platform/curriculum/${selectedId}/full`, {
      method: "DELETE",
      headers: jsonMutationHeaders(),
      body: JSON.stringify({ section, itemId }),
    });
    await loadCv(selectedId);
  }

  if (viewId === "dashboard") {
    return <ModuleDashboard moduleKey="curriculum" serviceColor={serviceColor} serviceName="Curriculum" listViewId="elenco" onNavigate={navigate} serviceSlug={serviceSlug} />;
  }

  if (viewId === "editor" && !selectedId) {
    return (
      <ServicePremiumSubView
        moduleKey="curriculum"
        viewId="editor"
        serviceName="Curriculum"
        serviceColor={serviceColor}
        serviceGradient={service?.gradient}
        showKpiStrip={false}
      >
        <Paper sx={[shellPaperSx, { p: 4, textAlign: "center" }]}>
          <Typography sx={{ mb: 2 }} color="text.secondary">
            Seleziona un curriculum dall&apos;elenco per aprire l&apos;editor.
          </Typography>
          <Button variant="contained" sx={{ bgcolor: serviceColor }} onClick={() => navigate("elenco")}>
            Vai all&apos;elenco
          </Button>
        </Paper>
      </ServicePremiumSubView>
    );
  }

  if (viewId === "editor" && selectedId) {
    return (
      <ServicePremiumSubView
        moduleKey="curriculum"
        viewId="editor"
        serviceName="Curriculum"
        serviceColor={serviceColor}
        serviceGradient={service?.gradient}
        badge={cv?.status ?? "Editor"}
        showKpiStrip={false}
        actions={
          <Button
            variant="contained"
            sx={{ bgcolor: "#fff", color: serviceColor, fontWeight: 700 }}
            onClick={() => { setSelectedId(null); navigate("elenco"); }}
          >
            ← Elenco
          </Button>
        }
      >
        {loading || !cv ? <CircularProgress /> : (
          <Paper sx={[shellPaperSx, { p: 2.5 }]}>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>{cv.title}</Typography>
            <Chip size="small" label={cv.status} color={statusChipColor(cv.status)} sx={{ mb: 2 }} />
            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
              <Tab label="Profilo" /><Tab label="Esperienze" /><Tab label="Formazione" /><Tab label="Competenze" />
            </Tabs>
            {tab === 0 && (
              <Stack spacing={2}>
                <TextField label="Titolo" size="small" value={cv.title} onChange={(e) => setCv({ ...cv, title: e.target.value })} />
                <TextField label="Sommario" multiline rows={4} size="small" value={cv.summary ?? ""} onChange={(e) => setCv({ ...cv, summary: e.target.value })} />
                <TextField label="Competenze chiave" multiline rows={3} size="small" value={cv.keySkills ?? ""} onChange={(e) => setCv({ ...cv, keySkills: e.target.value })} />
                <Button variant="contained" sx={{ bgcolor: serviceColor, alignSelf: "flex-start" }} onClick={saveProfile}>Salva profilo</Button>
              </Stack>
            )}
            {tab === 1 && (
              <Stack spacing={2}>
                <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
                  <TextField size="small" label="Ruolo" value={expForm.roleTitle} onChange={(e) => setExpForm((f) => ({ ...f, roleTitle: e.target.value }))} />
                  <TextField size="small" label="Azienda" value={expForm.employer} onChange={(e) => setExpForm((f) => ({ ...f, employer: e.target.value }))} />
                  <TextField size="small" type="date" label="Inizio" slotProps={{ inputLabel: { shrink: true } }} value={expForm.startDate} onChange={(e) => setExpForm((f) => ({ ...f, startDate: e.target.value }))} />
                  <Button variant="contained" sx={{ bgcolor: serviceColor }} onClick={addExperience}>Aggiungi</Button>
                </Stack>
                <List dense>
                  {cv.experiences.map((e) => (
                    <ListItem key={String(e.id)} secondaryAction={
                      <IconButton edge="end" onClick={() => deleteSection("experience", String(e.id))}><DeleteIcon /></IconButton>
                    }>
                      <ListItemText primary={String(e.roleTitle)} secondary={`${String(e.employer)} · ${String(e.startDate).slice(0, 10)}`} />
                    </ListItem>
                  ))}
                </List>
              </Stack>
            )}
            {tab === 2 && (
              <List dense>
                {cv.education.map((e) => (
                  <ListItem key={String(e.id)}>
                    <ListItemText primary={String(e.title)} secondary={String(e.institution)} />
                  </ListItem>
                ))}
                {!cv.education.length && <Typography color="text.secondary">Aggiungi formazione dal profilo cliente.</Typography>}
              </List>
            )}
            {tab === 3 && (
              <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                {cv.skills.map((s) => <Chip key={String(s.id)} label={`${String(s.name)}${s.level ? ` (${String(s.level)})` : ""}`} />)}
                {cv.languages.map((l) => <Chip key={String(l.id)} label={`${String(l.language)} — ${String(l.level)}`} variant="outlined" />)}
              </Stack>
            )}
          </Paper>
        )}
      </ServicePremiumSubView>
    );
  }

  return (
    <GenericModuleView
      module={module}
      viewId="elenco"
      serviceColor={serviceColor}
      showToolbar
      moduleKeyOverride="curriculum"
      serviceNameOverride="Curriculum"
      onRowClick={(id) => { setSelectedId(id); navigate("editor"); }}
    />
  );
}
