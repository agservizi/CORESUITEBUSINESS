"use client";

import { Box, Button, Typography } from "@mui/material";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import { motion, useReducedMotion } from "framer-motion";
import { shellPanelSx } from "@/theme/shell-tokens";
import { hubCardHeightSx, HUB_CARD_HEIGHT } from "@/lib/hub-layout";
import { hubFadeUp } from "@/lib/hub-motion";

interface HubEmptyWorkspaceProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function HubEmptyWorkspace({
  title,
  description,
  actionLabel,
  onAction,
}: HubEmptyWorkspaceProps) {
  const reduce = useReducedMotion();

  return (
    <Box
      component={motion.div}
      variants={hubFadeUp}
      initial="hidden"
      animate="show"
      sx={(theme) => ({
        ...shellPanelSx(theme),
        height: "100%",
        minHeight: HUB_CARD_HEIGHT.comfortable,
        gridColumn: { xs: "1", sm: "1 / -1", lg: "1 / -1" },
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        p: 3,
        backdropFilter: "blur(12px)",
      })}
    >
      <Box
        component={motion.div}
        animate={reduce ? {} : { y: [0, -6, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
        sx={{
          width: 48,
          height: 48,
          borderRadius: "12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          mb: 1.5,
          background: "rgba(99,102,241,0.15)",
          color: "primary.light",
        }}
      >
        <RocketLaunchIcon />
      </Box>
      <Typography sx={{ fontWeight: 700, mb: 0.5 }}>{title}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 360, mb: actionLabel ? 2 : 0 }}>
        {description}
      </Typography>
      {actionLabel && onAction && (
        <Button
          component={motion.button}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.35 }}
          whileHover={reduce ? {} : { scale: 1.03 }}
          whileTap={reduce ? {} : { scale: 0.97 }}
          variant="outlined"
          onClick={onAction}
          sx={{ textTransform: "none" }}
        >
          {actionLabel}
        </Button>
      )}
    </Box>
  );
}
