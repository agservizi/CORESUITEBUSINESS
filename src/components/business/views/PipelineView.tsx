"use client";

import { useEffect, useState, useCallback } from "react";
import { Box, Typography, Chip, CircularProgress, Button } from "@mui/material";
import { motion } from "framer-motion";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  useDroppable,
} from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import EuroIcon from "@mui/icons-material/Euro";
import AddIcon from "@mui/icons-material/Add";
import NewLeadDialog from "@/components/business/NewLeadDialog";
import { useTheme } from "@mui/material/styles";
import { getShellTokens } from "@/theme/shell-tokens";
import { useBusinessNavigation } from "@/context/BusinessNavigationProvider";

interface Lead {
  id: string;
  title: string;
  value?: number;
  priority: string;
  client?: { name: string; companyName?: string };
  contactName?: string;
  expectedClose?: string;
}

interface Stage {
  id: string;
  name: string;
  color: string;
  order: number;
  leads: Lead[];
}

interface Pipeline {
  id: string;
  name: string;
  isDefault: boolean;
  stages: Stage[];
}

const PRIORITY_COLOR: Record<string, string> = {
  LOW: "#64748b", MEDIUM: "#0ea5e9", HIGH: "#f59e0b", URGENT: "#ef4444",
};

function DraggableLeadCard({ lead, isDragging, onOpen }: { lead: Lead; isDragging?: boolean; onOpen: (id: string) => void }) {
  const theme = useTheme();
  const t = getShellTokens(theme);
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: lead.id });
  const clientName = lead.client?.companyName || lead.client?.name || lead.contactName || "—";

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <Box
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onDoubleClick={() => onOpen(lead.id)}
      sx={{
        background: isDragging ? "rgba(99,102,241,0.15)" : t.panelElevated,
        border: `1px solid ${isDragging ? "rgba(99,102,241,0.4)" : t.inputBorder}`,
        borderRadius: 2,
        p: { xs: 1, sm: 1.25, md: 1.5 },
        mb: 1,
        cursor: "grab",
        "&:active": { cursor: "grabbing" },
        "&:hover": { borderColor: t.inputBorderHover, boxShadow: "0 4px 16px rgba(0,0,0,0.3)" },
        transition: "border-color 0.15s, box-shadow 0.15s",
        opacity: isDragging ? 0.5 : 1,
        userSelect: "none",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 1, gap: 0.5, minWidth: 0 }}>
        <Typography
          sx={{
            fontWeight: 600,
            fontSize: "0.8rem",
            lineHeight: 1.3,
            flex: 1,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {lead.title}
        </Typography>
        <Box sx={{ width: 8, height: 8, borderRadius: "50%", background: PRIORITY_COLOR[lead.priority] || "#64748b", flexShrink: 0, mt: 0.3 }} />
      </Box>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{
          display: "block",
          mb: 1,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {clientName}
      </Typography>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {lead.value ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.3 }}>
            <EuroIcon sx={{ fontSize: 11, color: "#10b981" }} />
            <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: "#10b981" }}>
              {lead.value.toLocaleString("it-IT")}
            </Typography>
          </Box>
        ) : <Box />}
        {lead.expectedClose && (
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem" }}>
            {new Date(lead.expectedClose).toLocaleDateString("it-IT", { day: "2-digit", month: "short" })}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

function DroppableColumn({ stage, isDragOver, onOpenLead }: { stage: Stage; isDragOver: boolean; onOpenLead: (id: string) => void }) {
  const theme = useTheme();
  const t = getShellTokens(theme);
  const { setNodeRef } = useDroppable({ id: stage.id });
  const total = stage.leads.reduce((s, l) => s + (l.value || 0), 0);

  return (
    <Box sx={{ width: "100%", minWidth: 0, display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1, px: 0.5, gap: 0.5, minWidth: 0 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, minWidth: 0, flex: 1 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: "50%", background: stage.color, flexShrink: 0 }} />
          <Typography
            sx={{
              fontWeight: 600,
              fontSize: { xs: "0.75rem", md: "0.8rem" },
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {stage.name}
          </Typography>
          <Chip
            label={stage.leads.length}
            size="small"
            sx={{
              height: 18,
              fontSize: "0.65rem",
              fontWeight: 700,
              flexShrink: 0,
              background: `${stage.color}18`,
              color: stage.color,
              border: `1px solid ${stage.color}33`,
            }}
          />
        </Box>
        {total > 0 && (
          <Typography sx={{ fontSize: "0.65rem", fontWeight: 600, color: "#10b981", flexShrink: 0, whiteSpace: "nowrap" }}>
            €{total.toLocaleString("it-IT")}
          </Typography>
        )}
      </Box>

      {/* Drop zone */}
      <Box
        ref={setNodeRef}
        sx={{
          background: isDragOver ? "rgba(99,102,241,0.06)" : t.rowHover,
          border: `1px dashed ${isDragOver ? "rgba(99,102,241,0.3)" : t.inputBorder}`,
          borderRadius: 2,
          p: { xs: 1, md: 1.25 },
          minHeight: { xs: 100, md: 120 },
          flex: 1,
          minWidth: 0,
          transition: "background 0.15s, border-color 0.15s",
        }}
      >
        {stage.leads.length === 0 ? (
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", textAlign: "center", mt: 2, opacity: 0.5 }}>
            Nessun lead
          </Typography>
        ) : (
          stage.leads.map((lead) => <DraggableLeadCard key={lead.id} lead={lead} onOpen={onOpenLead} />)
        )}
      </Box>
    </Box>
  );
}

export default function PipelineView() {
  const theme = useTheme();
  const { navigate } = useBusinessNavigation();
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const [overStageId, setOverStageId] = useState<string | null>(null);
  const [openNew, setOpenNew] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const fetchPipeline = useCallback(async () => {
    const res = await fetch("/api/business/pipeline");
    const data = await res.json();
    setPipelines(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchPipeline(); }, [fetchPipeline]);

  const pipeline = pipelines.find((p) => p.isDefault) || pipelines[0];

  function findLead(leadId: string): Lead | null {
    for (const stage of pipeline?.stages || []) {
      const found = stage.leads.find((l) => l.id === leadId);
      if (found) return found;
    }
    return null;
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveLead(findLead(event.active.id as string));
  }

  function handleDragOver(event: DragOverEvent) {
    setOverStageId(event.over?.id as string || null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveLead(null);
    setOverStageId(null);

    if (!over || !pipeline) return;
    const leadId = active.id as string;
    const newStageId = over.id as string;

    // Find current stage
    const currentStage = pipeline.stages.find((s) => s.leads.some((l) => l.id === leadId));
    if (!currentStage || currentStage.id === newStageId) return;

    // Optimistic update
    setPipelines((prev) =>
      prev.map((p) => ({
        ...p,
        stages: p.stages.map((stage) => ({
          ...stage,
          leads:
            stage.id === currentStage.id
              ? stage.leads.filter((l) => l.id !== leadId)
              : stage.id === newStageId
              ? [...stage.leads, currentStage.leads.find((l) => l.id === leadId)!]
              : stage.leads,
        })),
      }))
    );

    // Persist
    const res = await fetch(`/api/business/lead/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stageId: newStageId }),
    });
    if (!res.ok) {
      await fetchPipeline();
    }
  }

  const totalLeads = pipeline?.stages.reduce((s, st) => s + st.leads.length, 0) || 0;
  const totalValue = pipeline?.stages.reduce((s, st) => s + st.leads.reduce((a, l) => a + (l.value || 0), 0), 0) || 0;
  const stageCount = pipeline?.stages.length ?? 0;

  function openLeadDetail(leadId: string) {
    navigate("lead", leadId);
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0,
        minWidth: 0,
        maxWidth: "100%",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          mb: 3,
          flexShrink: 0,
          gap: 2,
          flexWrap: "wrap",
          minWidth: 0,
        }}
      >
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Typography sx={{ fontWeight: 700, fontSize: "1.5rem", letterSpacing: "-0.02em" }}>Pipeline</Typography>
          {pipeline && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 0.5, flexWrap: "wrap", minWidth: 0 }}>
              <Typography color="text.secondary" sx={{ fontSize: "0.875rem" }}>{pipeline.name}</Typography>
              <Typography sx={{ color: "text.secondary" }}>•</Typography>
              <Typography color="text.secondary" sx={{ fontSize: "0.875rem" }}>{totalLeads} lead</Typography>
              <Typography sx={{ fontSize: "0.875rem", color: "#10b981", fontWeight: 600 }}>
                €{totalValue.toLocaleString("it-IT")} totali
              </Typography>
            </Box>
          )}
        </motion.div>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenNew(true)}
          sx={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", "&:hover": { background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }, boxShadow: "0 4px 16px rgba(99,102,241,0.3)" }}
        >
          Nuovo lead
        </Button>
      </Box>

      {/* Board */}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}><CircularProgress sx={{ color: "primary.main" }} /></Box>
      ) : !pipeline ? (
        <Typography color="text.secondary">Nessuna pipeline trovata</Typography>
      ) : (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
          <Box
            sx={{
              display: "grid",
              flex: 1,
              minHeight: 0,
              minWidth: 0,
              maxWidth: "100%",
              overflowY: "auto",
              overflowX: "hidden",
              alignContent: "start",
              gap: { xs: 1.5, md: 2 },
              pb: 2,
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, minmax(0, 1fr))",
                md: "repeat(3, minmax(0, 1fr))",
                lg: stageCount <= 4
                  ? `repeat(${Math.max(stageCount, 1)}, minmax(0, 1fr))`
                  : "repeat(4, minmax(0, 1fr))",
              },
              [theme.breakpoints.up("xl")]: {
                gridTemplateColumns: `repeat(${Math.max(stageCount, 1)}, minmax(0, 1fr))`,
              },
            }}
          >
            {pipeline.stages.map((stage) => (
              <DroppableColumn key={stage.id} stage={stage} isDragOver={overStageId === stage.id} onOpenLead={openLeadDetail} />
            ))}
          </Box>

          <DragOverlay>
            {activeLead && (
              <Box
                sx={{
                  width: { xs: "100%", sm: 220, md: 260 },
                  maxWidth: "min(280px, 90vw)",
                  opacity: 0.95,
                  transform: "rotate(2deg)",
                  filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.5))",
                }}
              >
                <DraggableLeadCard lead={activeLead} isDragging onOpen={openLeadDetail} />
              </Box>
            )}
          </DragOverlay>
        </DndContext>
      )}

      <NewLeadDialog open={openNew} onClose={() => setOpenNew(false)} onCreated={fetchPipeline} />
    </Box>
  );
}
