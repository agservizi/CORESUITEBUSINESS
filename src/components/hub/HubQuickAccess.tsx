"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { HTMLAttributes } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Box, Typography } from "@mui/material";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import PushPinIcon from "@mui/icons-material/PushPin";
import HistoryIcon from "@mui/icons-material/History";
import PremiumServiceCard from "./PremiumServiceCard";
import HubEmptyWorkspace from "./HubEmptyWorkspace";
import { hubGridSx } from "@/lib/hub-layout";
import type { HubLayoutDensity } from "@/lib/hub-layout";
import { getServiceHoverStats } from "@/lib/hub-service-stats";
import { useHubOperationsOptional } from "@/context/HubOperationsProvider";
import type { PlatformServiceConfig } from "@/config/platform-services";
import { getServiceLaunchUrl } from "@/lib/platform-hosts";
import { hubScaleIn } from "@/lib/hub-motion";

interface HubQuickAccessProps {
  services: PlatformServiceConfig[];
  pinned: string[];
  recent: string[];
  density: HubLayoutDensity;
  onTogglePin: (slug: string) => void;
  onReorderPinned: (ordered: string[]) => void;
  onExplore?: () => void;
}

function SortablePinnedCard({
  service,
  index,
  density,
  onTogglePin,
  hoverStats,
}: {
  service: PlatformServiceConfig;
  index: number;
  density: HubLayoutDensity;
  onTogglePin: (slug: string) => void;
  hoverStats: ReturnType<typeof getServiceHoverStats>;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: service.slug,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : 1,
    zIndex: isDragging ? 2 : 1,
  };

  const mergedRef = useCallback(
    (node: HTMLDivElement | null) => {
      setNodeRef(node);
    },
    [setNodeRef]
  );

  return (
    <motion.div
      ref={mergedRef}
      layout
      layoutId={`hub-card-${service.slug}`}
      style={style}
      variants={hubScaleIn}
      initial="hidden"
      animate="show"
      exit="exit"
    >
      <PremiumServiceCard
        {...service}
        url={getServiceLaunchUrl(service.slug)}
        index={index}
        density={density}
        pinned
        onTogglePin={onTogglePin}
        hoverStats={hoverStats}
        dragHandle
        dragHandleProps={{ attributes: attributes as HTMLAttributes<HTMLElement>, listeners }}
        animateEntrance={false}
      />
    </motion.div>
  );
}

export default function HubQuickAccess({
  services,
  pinned,
  recent,
  density,
  onTogglePin,
  onReorderPinned,
  onExplore,
}: HubQuickAccessProps) {
  const ops = useHubOperationsOptional();
  const serviceMap = useMemo(() => new Map(services.map((s) => [s.slug, s])), [services]);

  const pinnedServices = pinned
    .map((slug) => serviceMap.get(slug))
    .filter(Boolean) as PlatformServiceConfig[];

  const recentServices = recent
    .filter((slug) => !pinned.includes(slug))
    .map((slug) => serviceMap.get(slug))
    .filter(Boolean)
    .slice(0, 3) as PlatformServiceConfig[];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = pinned.indexOf(String(active.id));
    const newIndex = pinned.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    onReorderPinned(arrayMove(pinned, oldIndex, newIndex));
  }

  const showEmpty = pinnedServices.length === 0 && recentServices.length === 0;

  return (
    <LayoutGroup id="hub-quick-access">
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
          <PushPinIcon sx={{ fontSize: 18, color: "#fbbf24" }} />
          <Typography sx={{ fontWeight: 700, fontSize: "1rem" }}>Il tuo workspace</Typography>
        </Box>

        {showEmpty ? (
          <Box sx={hubGridSx()}>
            <HubEmptyWorkspace
              title="Workspace vuoto"
              description="Fissa i servizi che usi ogni giorno con la stella, oppure esplora i moduli disponibili."
              actionLabel="Esplora i servizi"
              onAction={onExplore}
            />
          </Box>
        ) : (
          <>
            {pinnedServices.length > 0 && (
              <Box sx={{ mb: recentServices.length > 0 ? 3 : 0 }}>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: "block" }}>
                  Trascina per riordinare · {pinnedServices.length} preferiti
                </Typography>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={pinnedServices.map((s) => s.slug)} strategy={rectSortingStrategy}>
                    <Box component={motion.div} layout sx={hubGridSx()}>
                      <AnimatePresence mode="popLayout">
                        {pinnedServices.map((service, i) => (
                          <SortablePinnedCard
                            key={service.slug}
                            service={service}
                            index={i}
                            density={density}
                            onTogglePin={onTogglePin}
                            hoverStats={getServiceHoverStats(
                              service.slug,
                              ops?.kpi ?? null,
                              ops?.express ?? null
                            )}
                          />
                        ))}
                      </AnimatePresence>
                    </Box>
                  </SortableContext>
                </DndContext>
              </Box>
            )}

            {recentServices.length > 0 && (
              <Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
                  <HistoryIcon sx={{ fontSize: 18, color: "primary.light" }} />
                  <Typography sx={{ fontWeight: 600, fontSize: "0.9rem" }}>Usati di recente</Typography>
                </Box>
                <Box component={motion.div} layout sx={hubGridSx()}>
                  <AnimatePresence mode="popLayout">
                    {recentServices.map((service, i) => (
                      <motion.div
                        key={service.slug}
                        layout
                        layoutId={`hub-card-${service.slug}`}
                        variants={hubScaleIn}
                        initial="hidden"
                        animate="show"
                        exit="exit"
                      >
                        <PremiumServiceCard
                          {...service}
                          url={getServiceLaunchUrl(service.slug)}
                          index={i}
                          density={density}
                          pinned={false}
                          onTogglePin={onTogglePin}
                          hoverStats={getServiceHoverStats(
                            service.slug,
                            ops?.kpi ?? null,
                            ops?.express ?? null
                          )}
                          animateEntrance={false}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </Box>
              </Box>
            )}
          </>
        )}
      </Box>
    </LayoutGroup>
  );
}
