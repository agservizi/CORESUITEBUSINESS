"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Box, Typography, Button, TextField, Select, MenuItem,
  FormControl, IconButton, Chip, CircularProgress,
} from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";
import AddTaskIcon from "@mui/icons-material/AddTask";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import DeleteIcon from "@mui/icons-material/Delete";
import FilterListIcon from "@mui/icons-material/FilterList";
import { AppDateField } from "@/components/layout/app-shell";
import { getShellTokens, shellPanelSx } from "@/theme/shell-tokens";

interface Activity {
  id: string;
  type: string;
  title: string;
  description?: string;
  isDone: boolean;
  dueAt?: string;
  createdAt: string;
  author: { name: string | null };
  client?: { name: string; companyName?: string };
  lead?: { title: string };
}

const TYPE_ICONS: Record<string, string> = { CALL: "📞", EMAIL: "✉️", MEETING: "🤝", TASK: "✅", NOTE: "📝", DEMO: "🖥️" };
const TYPE_LABELS: Record<string, string> = { CALL: "Chiamata", EMAIL: "Email", MEETING: "Meeting", TASK: "Task", NOTE: "Nota", DEMO: "Demo" };

export default function AttivitaView() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "todo" | "done">("all");
  const [newAct, setNewAct] = useState({ title: "", type: "TASK", description: "", dueAt: "" });
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter === "todo") params.set("done", "false");
    if (filter === "done") params.set("done", "true");
    const res = await fetch(`/api/business/attivita?${params}`);
    const data = await res.json();
    setActivities(data);
    setLoading(false);
  }, [filter]);

  useEffect(() => { fetchActivities(); }, [fetchActivities]);

  async function handleAdd() {
    if (!newAct.title.trim()) return;
    setAdding(true);
    await fetch("/api/business/attivita", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newAct),
    });
    setNewAct({ title: "", type: "TASK", description: "", dueAt: "" });
    setShowForm(false);
    await fetchActivities();
    setAdding(false);
  }

  async function toggle(id: string, isDone: boolean) {
    await fetch(`/api/business/attivita/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDone }),
    });
    setActivities((prev) => prev.map((a) => a.id === id ? { ...a, isDone, doneAt: isDone ? new Date().toISOString() : undefined } : a));
  }

  async function remove(id: string) {
    await fetch(`/api/business/attivita/${id}`, { method: "DELETE" });
    setActivities((prev) => prev.filter((a) => a.id !== id));
  }

  const todo = activities.filter((a) => !a.isDone);
  const done = activities.filter((a) => a.isDone);
  const displayed = filter === "todo" ? todo : filter === "done" ? done : activities;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 3 }}>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Typography sx={{ fontWeight: 700, fontSize: "1.5rem", letterSpacing: "-0.02em" }}>Attività</Typography>
          <Box sx={{ display: "flex", gap: 2, mt: 0.5 }}>
            <Typography color="text.secondary" sx={{ fontSize: "0.875rem" }}>{todo.length} da fare</Typography>
            <Typography sx={{ color: "#10b981", fontSize: "0.875rem", fontWeight: 600 }}>{done.length} completate</Typography>
          </Box>
        </motion.div>

        <Button
          variant="contained"
          startIcon={<AddTaskIcon />}
          onClick={() => setShowForm((p) => !p)}
          sx={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", "&:hover": { background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }, boxShadow: "0 4px 16px rgba(99,102,241,0.3)" }}
        >
          Nuova attività
        </Button>
      </Box>

      {/* New activity form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ overflow: "hidden" }}>
            <Box sx={[shellPanelSx, { border: "1px solid rgba(99,102,241,0.2)", p: 2.5, mb: 3 }]}>
              <Typography sx={{ fontWeight: 600, fontSize: "0.9rem", mb: 2 }}>Nuova attività</Typography>
              <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", mb: 2 }}>
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <Select value={newAct.type} onChange={(e) => setNewAct((p) => ({ ...p, type: e.target.value }))} sx={{ fontSize: "0.825rem" }}>
                    {Object.entries(TYPE_LABELS).map(([v, l]) => (
                      <MenuItem key={v} value={v}>{TYPE_ICONS[v]} {l}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField size="small" placeholder="Titolo *" value={newAct.title} onChange={(e) => setNewAct((p) => ({ ...p, title: e.target.value }))} sx={{ flex: 1, minWidth: 200 }} onKeyDown={(e) => e.key === "Enter" && handleAdd()} />
                <AppDateField label="Scadenza" value={newAct.dueAt} onChange={(dueAt) => setNewAct((p) => ({ ...p, dueAt }))} sx={{ width: 160 }} />
              </Box>
              <TextField fullWidth size="small" placeholder="Descrizione (opzionale)" value={newAct.description} onChange={(e) => setNewAct((p) => ({ ...p, description: e.target.value }))} sx={{ mb: 2 }} />
              <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
                <Button size="small" onClick={() => setShowForm(false)} sx={{ color: "text.secondary" }}>Annulla</Button>
                <Button size="small" variant="contained" onClick={handleAdd} disabled={adding || !newAct.title.trim()} sx={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
                  {adding ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : "Crea"}
                </Button>
              </Box>
            </Box>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter tabs */}
      <Box sx={{ display: "flex", gap: 1, mb: 3 }}>
        <FilterListIcon sx={{ color: "text.secondary", fontSize: 18, mt: 0.3 }} />
        {(["all", "todo", "done"] as const).map((f) => (
          <Chip
            key={f}
            label={f === "all" ? "Tutte" : f === "todo" ? "Da fare" : "Completate"}
            size="small"
            onClick={() => setFilter(f)}
            sx={(theme) => {
              const t = getShellTokens(theme);
              return {
                fontWeight: filter === f ? 700 : 400,
                background: filter === f ? "rgba(99,102,241,0.15)" : "transparent",
                color: filter === f ? "primary.light" : "text.secondary",
                border: filter === f ? "1px solid rgba(99,102,241,0.25)" : t.border,
                cursor: "pointer",
              };
            }}
          />
        ))}
      </Box>

      {/* List */}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress sx={{ color: "primary.main" }} /></Box>
      ) : displayed.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 8 }}>
          <Typography sx={{ fontSize: 40, mb: 1 }}>✅</Typography>
          <Typography color="text.secondary">Nessuna attività {filter === "todo" ? "da fare" : filter === "done" ? "completata" : ""}</Typography>
        </Box>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <AnimatePresence>
            {displayed.map((act, i) => (
              <motion.div
                key={act.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: i * 0.03 }}
                layout
              >
                <Box
                  sx={(theme) => {
                    const t = getShellTokens(theme);
                    return {
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 1.5,
                      p: 1.75,
                      background: t.panel,
                      border: t.border,
                      borderRadius: 2,
                      opacity: act.isDone ? 0.55 : 1,
                      transition: "opacity 0.2s",
                      "&:hover": { borderColor: t.inputBorderHover, "& .act-delete": { opacity: 1 } },
                    };
                  }}
                >
                  <IconButton size="small" onClick={() => toggle(act.id, !act.isDone)} sx={{ p: 0, mt: 0.2, color: act.isDone ? "#10b981" : "text.secondary", flexShrink: 0 }}>
                    {act.isDone ? <CheckCircleIcon sx={{ fontSize: 22 }} /> : <RadioButtonUncheckedIcon sx={{ fontSize: 22 }} />}
                  </IconButton>

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", mb: 0.25 }}>
                      <Typography sx={{ fontSize: "0.85rem" }}>{TYPE_ICONS[act.type]}</Typography>
                      <Typography sx={{ fontWeight: 600, fontSize: "0.875rem", textDecoration: act.isDone ? "line-through" : "none" }}>
                        {act.title}
                      </Typography>
                      <Chip label={TYPE_LABELS[act.type]} size="small" sx={(theme) => ({ height: 18, fontSize: "0.6rem", background: getShellTokens(theme).hoverStrong, color: "text.secondary", border: "none" })} />
                    </Box>
                    {act.description && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>{act.description}</Typography>
                    )}
                    <Box sx={{ display: "flex", gap: 1.5, mt: 0.5, flexWrap: "wrap" }}>
                      {act.client && <Typography variant="caption" color="text.secondary">🏢 {act.client.companyName || act.client.name}</Typography>}
                      {act.lead && <Typography variant="caption" color="text.secondary">📊 {act.lead.title}</Typography>}
                      <Typography variant="caption" color="text.secondary">{act.author.name}</Typography>
                    </Box>
                  </Box>

                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
                    {act.dueAt && (
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.75rem" }}>
                        📅 {new Date(act.dueAt).toLocaleDateString("it-IT", { day: "2-digit", month: "short" })}
                      </Typography>
                    )}
                    <IconButton
                      className="act-delete"
                      size="small"
                      onClick={() => remove(act.id)}
                      sx={{ opacity: 0, transition: "opacity 0.15s", color: "error.main", p: 0.5 }}
                    >
                      <DeleteIcon sx={{ fontSize: 17 }} />
                    </IconButton>
                  </Box>
                </Box>
              </motion.div>
            ))}
          </AnimatePresence>
        </Box>
      )}
    </Box>
  );
}
