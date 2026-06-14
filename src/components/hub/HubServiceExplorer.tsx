"use client";

import { Box, Typography } from "@mui/material";
import { AnimatePresence, motion, LayoutGroup } from "framer-motion";
import PremiumServiceCard from "./PremiumServiceCard";
import HubEmptyWorkspace from "./HubEmptyWorkspace";
import { HUB_CATEGORIES, filterByCategory, type HubCategory } from "@/lib/hub-categories";
import { getServiceCategory } from "@/lib/hub-categories";
import type { PlatformServiceConfig } from "@/config/platform-services";
import { getServiceLaunchUrl } from "@/lib/platform-hosts";
import { getShellTokens } from "@/theme/shell-tokens";
import { hubGridItem, hubSpring } from "@/lib/hub-motion";
import { hubGridSx } from "@/lib/hub-layout";
import type { HubLayoutDensity } from "@/lib/hub-layout";
import { getServiceHoverStats } from "@/lib/hub-service-stats";
import { useHubOperationsOptional } from "@/context/HubOperationsProvider";

interface HubServiceExplorerProps {
  services: PlatformServiceConfig[];
  category: HubCategory;
  onCategoryChange: (c: HubCategory) => void;
  startIndex?: number;
  pinnedSlugs?: string[];
  onTogglePin?: (slug: string) => void;
  density?: HubLayoutDensity;
  highlighted?: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  operativi: "Operativi",
  cittadino: "Cittadino",
  finanza: "Finanza",
  logistica: "Logistica",
  marketing: "Marketing",
};

export default function HubServiceExplorer({
  services,
  category,
  onCategoryChange,
  startIndex = 0,
  pinnedSlugs = [],
  onTogglePin,
  density = "comfortable",
  highlighted = false,
}: HubServiceExplorerProps) {
  const ops = useHubOperationsOptional();
  const filtered = filterByCategory(
    services.filter((s) => !["operations", "business"].includes(s.slug)),
    category
  );

  return (
    <Box
      component={motion.div}
      animate={
        highlighted
          ? {
              boxShadow: [
                "0 0 0 0 rgba(99,102,241,0)",
                "0 0 0 4px rgba(99,102,241,0.4)",
                "0 0 0 0 rgba(99,102,241,0)",
              ],
            }
          : { boxShadow: "0 0 0 0 rgba(99,102,241,0)" }
      }
      transition={{ duration: 1.8, ease: "easeInOut" }}
      sx={{ borderRadius: 3, p: highlighted ? 0.5 : 0 }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { xs: "stretch", sm: "center" },
          justifyContent: "space-between",
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: "1.1rem" }}>Esplora i servizi</Typography>
          <Typography variant="body2" color="text.secondary">
            {filtered.length} moduli disponibili
          </Typography>
        </Box>

        <Box
          sx={(theme) => ({
            position: "relative",
            display: "flex",
            flexWrap: "wrap",
            gap: 0.5,
            p: 0.5,
            borderRadius: 2,
            border: getShellTokens(theme).border,
            bgcolor: getShellTokens(theme).hover,
          })}
        >
          {HUB_CATEGORIES.map((c) => {
            const selected = category === c.id;
            return (
              <Box
                key={c.id}
                component="button"
                type="button"
                onClick={() => onCategoryChange(c.id)}
                sx={{
                  position: "relative",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  px: 1.5,
                  py: 0.75,
                  borderRadius: 1.5,
                  zIndex: 1,
                }}
              >
                {selected && (
                  <Box
                    component={motion.div}
                    layoutId="hub-category-pill"
                    transition={hubSpring}
                    sx={{
                      position: "absolute",
                      inset: 0,
                      borderRadius: 1.5,
                      bgcolor: "rgba(99,102,241,0.15)",
                      border: "1px solid rgba(99,102,241,0.3)",
                    }}
                  />
                )}
                <Typography
                  sx={{
                    position: "relative",
                    fontSize: "0.75rem",
                    fontWeight: selected ? 700 : 500,
                    color: selected ? "primary.light" : "text.secondary",
                  }}
                >
                  {c.label}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Box>

      <LayoutGroup>
        <Box component={motion.div} layout sx={hubGridSx()}>
          <AnimatePresence mode="popLayout">
            {filtered.map((service, i) => (
              <motion.div
                key={service.slug}
                layout
                variants={hubGridItem}
                initial="hidden"
                animate="show"
                exit="exit"
                custom={i}
                transition={{ layout: { type: "spring", stiffness: 380, damping: 32 } }}
                style={{ height: "100%" }}
              >
                <PremiumServiceCard
                  {...service}
                  url={getServiceLaunchUrl(service.slug)}
                  index={startIndex + i}
                  density={density}
                  categoryLabel={CATEGORY_LABELS[getServiceCategory(service.slug)]}
                  pinned={pinnedSlugs.includes(service.slug)}
                  onTogglePin={onTogglePin}
                  hoverStats={getServiceHoverStats(service.slug, ops?.kpi ?? null, ops?.express ?? null)}
                  animateEntrance={false}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </Box>
      </LayoutGroup>

      <AnimatePresence>
        {filtered.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <Box sx={{ ...hubGridSx(), mt: 0 }}>
              <HubEmptyWorkspace
                title="Nessun servizio in questa categoria"
                description="Prova un'altra categoria o usa Ctrl+K per trovare un modulo."
              />
            </Box>
          </motion.div>
        )}
      </AnimatePresence>
    </Box>
  );
}
