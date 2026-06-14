"use client";

import { useMemo } from "react";
import { Box, Typography } from "@mui/material";
import { motion, useReducedMotion } from "framer-motion";
import PremiumServiceCard from "./PremiumServiceCard";
import { HubCardShimmer } from "./HubShimmer";
import { buildSpotlightRecommendation } from "@/lib/hub-spotlight";
import { useHubOperationsOptional } from "@/context/HubOperationsProvider";
import { hubGridSx } from "@/lib/hub-layout";
import type { HubLayoutDensity } from "@/lib/hub-layout";
import { hubFadeUp } from "@/lib/hub-motion";
import type { PlatformServiceConfig } from "@/config/platform-services";

interface HubSpotlightProps {
  role: string;
  recent: string[];
  services: PlatformServiceConfig[];
  density: HubLayoutDensity;
}

export default function HubSpotlight({ role, recent, services, density }: HubSpotlightProps) {
  const ops = useHubOperationsOptional();
  const reduce = useReducedMotion();

  const recommendation = useMemo(
    () =>
      buildSpotlightRecommendation({
        role,
        recent,
        services,
        kpi: ops?.kpi ?? null,
        express: ops?.express ?? null,
      }),
    [role, recent, services, ops?.kpi, ops?.express]
  );

  const service = recommendation
    ? services.find((s) => s.slug === recommendation.slug)
    : null;

  return (
    <Box component={motion.div} variants={hubFadeUp} sx={{ mb: 4 }}>
      <Typography sx={{ fontWeight: 700, fontSize: "1rem", mb: 1.5 }}>Consigliato per te</Typography>

      <Box sx={hubGridSx()}>
        {ops?.loading && !recommendation ? (
          <HubCardShimmer density={density} />
        ) : recommendation && service ? (
          <Box
            component={motion.div}
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            sx={{ height: "100%" }}
          >
            <PremiumServiceCard
              {...service}
              url={recommendation.url}
              index={0}
              density={density}
              animateEntrance={false}
              spotlight={{
                reason: recommendation.reason,
                cta: recommendation.cta,
                stats: recommendation.stats,
                alertLevel: recommendation.alertLevel,
              }}
            />
          </Box>
        ) : (
          <Box sx={{ gridColumn: "1 / -1", py: 2, color: "text.secondary", fontSize: "0.875rem" }}>
            Nessun suggerimento disponibile al momento.
          </Box>
        )}
      </Box>
    </Box>
  );
}
