"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Box, Typography, Button, Chip, CircularProgress,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import LocalFireDepartmentIcon from "@mui/icons-material/LocalFireDepartment";
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent, useDroppable, useDraggable,
} from "@dnd-kit/core";
import { motion } from "framer-motion";
import { useTheme } from "@mui/material/styles";
import { getShellTokens } from "@/theme/shell-tokens";
import { jsonMutationHeaders } from "@/lib/csrf-client";
import { customerLabel, money, type OpportunityRow } from "./opportunities-utils";
import OpportunityHealthBadge from "./OpportunityHealthBadge";
import { oppCardEnter } from "./opportunities-motion";
import OpportunityDetailDrawer from "./OpportunityDetailDrawer";
import OpportunityWinBurst from "./OpportunityWinBurst";

interface Column {
  status: string;
  label: string;
  color: string;
  opportunities: OpportunityRow[];
}

function OppCard({ row, onOpen, hot, index }: { row: OpportunityRow; onOpen: (r: OpportunityRow) => void; hot?: boolean; index?: number }) {
  const theme = useTheme();
  const t = getShellTokens(theme);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: row.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;

  return (
    <Box
      component={motion.div}
      variants={oppCardEnter}
      initial="hidden"
      animate="show"
      custom={index ?? 0}
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onDoubleClick={() => onOpen(row)}
      sx={{
        background: hot ? `linear-gradient(135deg, rgba(139,92,246,0.12) 0%, ${t.panelElevated} 100%)` : t.panelElevated,
        border: hot ? "1px solid rgba(139,92,246,0.45)" : `1px solid ${t.inputBorder}`,
        borderRadius: 2,
        p: 1.25,
        mb: 1,
        cursor: "grab",
        opacity: isDragging ? 0.5 : 1,
        minWidth: 0,
        position: "relative",
        "&:hover": { borderColor: hot ? "rgba(139,92,246,0.65)" : t.inputBorderHover },
      }}
    >
      {hot && (
        <LocalFireDepartmentIcon sx={{ position: "absolute", top: 6, right: 6, fontSize: 14, color: "#f97316" }} />
      )}
      <Typography sx={{ fontWeight: 700, fontSize: "0.75rem", fontFamily: "monospace", mb: 0.25, pr: hot ? 2 : 0 }} noWrap>
        {row.code}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {customerLabel(row)}
      </Typography>
      <Typography variant="caption" sx={{ display: "block", mb: 0.5, fontSize: "0.7rem" }} noWrap>
        {row.providerLabel}
      </Typography>
      <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: "#10b981", mb: 0.75 }}>{money(row.commission)}</Typography>
      <OpportunityHealthBadge row={row} showScore={false} />
    </Box>
  );
}

function StatusColumn({ col, over, onOpen, hotIds }: { col: Column; over: boolean; onOpen: (r: OpportunityRow) => void; hotIds: Set<string> }) {
  const theme = useTheme();
  const t = getShellTokens(theme);
  const { setNodeRef } = useDroppable({ id: col.status });
  const total = col.opportunities.reduce((s, o) => s + o.commission, 0);

  return (
    <Box sx={{ minWidth: 0, display: "flex", flexDirection: "column" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 1, minWidth: 0 }}>
        <Box sx={{ width: 8, height: 8, borderRadius: "50%", background: col.color, flexShrink: 0 }} />
        <Typography sx={{ fontWeight: 600, fontSize: "0.8rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{col.label}</Typography>
        <Chip label={col.opportunities.length} size="small" sx={{ height: 18, fontSize: "0.65rem", flexShrink: 0, background: `${col.color}18`, color: col.color }} />
        {total > 0 && (
          <Typography sx={{ ml: "auto", fontSize: "0.65rem", color: "#10b981", fontWeight: 600, flexShrink: 0 }}>{money(total)}</Typography>
        )}
      </Box>
      <Box
        ref={setNodeRef}
        sx={{
          background: over ? "rgba(139,92,246,0.06)" : t.rowHover,
          border: `1px dashed ${over ? "rgba(139,92,246,0.35)" : t.inputBorder}`,
          borderRadius: 2,
          p: 1,
          minHeight: 120,
          flex: 1,
          minWidth: 0,
        }}
      >
        {col.opportunities.map((o, i) => (
          <OppCard key={o.id} row={o} onOpen={onOpen} hot={hotIds.has(o.id)} index={i} />
        ))}
      </Box>
    </Box>
  );
}

interface Props {
  serviceColor: string;
  onRefresh?: () => void;
  onNew?: () => void;
}

export default function OpportunitiesPipelineView({ serviceColor, onRefresh, onNew }: Props) {
  const [columns, setColumns] = useState<Column[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<OpportunityRow | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [detail, setDetail] = useState<OpportunityRow | null>(null);
  const [hotIds, setHotIds] = useState<Set<string>>(new Set());
  const [winBurst, setWinBurst] = useState(0);
  const [winMeta, setWinMeta] = useState<{ title?: string; commission?: number }>({});

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const load = useCallback(async () => {
    setLoading(true);
    const [pipeRes, insightsRes] = await Promise.all([
      fetch("/api/platform/opportunities/pipeline"),
      fetch("/api/platform/opportunities/insights"),
    ]);
    const data = await pipeRes.json();
    const insights = await insightsRes.json();
    setColumns(data.columns || []);
    setHotIds(new Set((insights.hot || []).map((h: { id: string }) => h.id)));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function findOpp(id: string) {
    for (const col of columns) {
      const found = col.opportunities.find((o) => o.id === id);
      if (found) return found;
    }
    return null;
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active: dragActive, over } = event;
    setActive(null);
    setOverId(null);
    if (!over) return;

    const oppId = String(dragActive.id);
    const newStatusCode = String(over.id);
    const opp = findOpp(oppId);
    if (!opp || opp.statusCode === newStatusCode) return;

    setColumns((prev) =>
      prev.map((col) => ({
        ...col,
        opportunities:
          col.status === opp.statusCode
            ? col.opportunities.filter((o) => o.id !== oppId)
            : col.status === newStatusCode
              ? [...col.opportunities, { ...opp, statusCode: newStatusCode }]
              : col.opportunities,
      }))
    );

    await fetch(`/api/platform/opportunities/${oppId}`, {
      method: "PATCH",
      headers: jsonMutationHeaders(),
      body: JSON.stringify({ statusCode: newStatusCode }),
    });

    if (newStatusCode === "attivato") {
      setWinMeta({ title: opp.code, commission: opp.commission });
      setWinBurst((n) => n + 1);
    }

    onRefresh?.();
  }

  async function handleStatusChange(id: string, statusCode: string) {
    await fetch(`/api/platform/opportunities/${id}`, {
      method: "PATCH",
      headers: jsonMutationHeaders(),
      body: JSON.stringify({ statusCode }),
    });
    if (statusCode === "attivato" && detail?.id === id) {
      setWinMeta({ title: detail.code, commission: detail.commission });
      setWinBurst((n) => n + 1);
    }
    load();
    onRefresh?.();
  }

  const stageCount = columns.length || 4;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, minWidth: 0, overflow: "hidden" }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3, flexWrap: "wrap", gap: 2 }}>
        <Typography sx={{ fontWeight: 700, fontSize: "1.5rem" }}>Pipeline contratti</Typography>
        {onNew && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={onNew} sx={{ background: serviceColor }}>
            Nuovo contratto
          </Button>
        )}
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress /></Box>
      ) : (
        <DndContext
          sensors={sensors}
          onDragStart={(e: DragStartEvent) => setActive(findOpp(String(e.active.id)))}
          onDragOver={(e) => setOverId(e.over?.id ? String(e.over.id) : null)}
          onDragEnd={handleDragEnd}
        >
          <Box sx={{
            display: "grid",
            flex: 1,
            minHeight: 0,
            minWidth: 0,
            overflowY: "auto",
            overflowX: "hidden",
            gap: { xs: 1.5, md: 2 },
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, minmax(0, 1fr))",
              lg: stageCount <= 5 ? `repeat(${stageCount}, minmax(0, 1fr))` : "repeat(5, minmax(0, 1fr))",
            },
          }}>
            {columns.map((col) => (
              <StatusColumn key={col.status} col={col} over={overId === col.status} onOpen={setDetail} hotIds={hotIds} />
            ))}
          </Box>
          <DragOverlay>
            {active && <Box sx={{ width: 220, opacity: 0.95 }}><OppCard row={active} onOpen={() => {}} /></Box>}
          </DragOverlay>
        </DndContext>
      )}

      <OpportunityWinBurst trigger={winBurst} title={winMeta.title} commission={winMeta.commission} />

      <OpportunityDetailDrawer
        open={Boolean(detail)}
        row={detail}
        onClose={() => setDetail(null)}
        onStatusChange={handleStatusChange}
        onUpdated={load}
      />
    </Box>
  );
}
