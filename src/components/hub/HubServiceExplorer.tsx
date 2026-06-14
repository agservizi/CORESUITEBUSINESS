"use client";

import { Box, Typography, ToggleButton, ToggleButtonGroup } from "@mui/material";
import { AnimatePresence, motion, LayoutGroup } from "framer-motion";
import PremiumServiceCard from "./PremiumServiceCard";
import { HUB_CATEGORIES, filterByCategory, type HubCategory } from "@/lib/hub-categories";
import { getServiceCategory } from "@/lib/hub-categories";
import type { PlatformServiceConfig } from "@/config/platform-services";
import { getShellTokens } from "@/theme/shell-tokens";
import { hubGridItem } from "@/lib/hub-motion";

interface HubServiceExplorerProps {
  services: PlatformServiceConfig[];
  category: HubCategory;
  onCategoryChange: (c: HubCategory) => void;
  startIndex?: number;
  pinnedSlugs?: string[];
  onTogglePin?: (slug: string) => void;
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
}: HubServiceExplorerProps) {
  const filtered = filterByCategory(
    services.filter((s) => !["operations", "business"].includes(s.slug)),
    category
  );

  return (
    <Box>
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
        <ToggleButtonGroup
          value={category}
          exclusive
          onChange={(_, v) => v && onCategoryChange(v)}
          size="small"
          sx={{
            flexWrap: "wrap",
            gap: 0.5,
            "& .MuiToggleButton-root": {
              border: (theme) => getShellTokens(theme).border,
              borderRadius: "8px !important",
              mx: 0.25,
              py: 0.5,
              px: 1.5,
              fontSize: "0.75rem",
              textTransform: "none",
              color: "text.secondary",
              "&.Mui-selected": {
                background: "rgba(99,102,241,0.15)",
                color: "primary.light",
                borderColor: "rgba(99,102,241,0.3)",
              },
            },
          }}
        >
          {HUB_CATEGORIES.map((c) => (
            <ToggleButton key={c.id} value={c.id} component={motion.button} whileTap={{ scale: 0.96 }}>
              {c.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      <LayoutGroup>
        <Box
          component={motion.div}
          layout
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, 1fr)",
              lg: "repeat(3, 1fr)",
            },
            gap: 2,
          }}
        >
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
                  index={startIndex + i}
                  categoryLabel={CATEGORY_LABELS[getServiceCategory(service.slug)]}
                  pinned={pinnedSlugs.includes(service.slug)}
                  onTogglePin={onTogglePin}
                  animateEntrance={false}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </Box>
      </LayoutGroup>

      <AnimatePresence>
        {filtered.length === 0 && (
          <Box
            component={motion.div}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            sx={{ py: 6, textAlign: "center", color: "text.secondary" }}
          >
            Nessun servizio in questa categoria
          </Box>
        )}
      </AnimatePresence>
    </Box>
  );
}
