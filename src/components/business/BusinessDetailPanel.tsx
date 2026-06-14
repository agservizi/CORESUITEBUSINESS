"use client";

import { useCallback } from "react";
import { Box, Drawer, IconButton, Typography, useMediaQuery, useTheme } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useBusinessNavigation } from "@/context/BusinessNavigationProvider";
import { SECTION_LABELS, type BusinessSection } from "@/lib/business-navigation";
import ClienteDetailView from "@/components/business/views/ClienteDetailView";
import LeadDetailView from "@/components/business/views/LeadDetailView";
import DealDetailView from "@/components/business/views/DealDetailView";
import { getShellTokens, shellDrawerPaperSx } from "@/theme/shell-tokens";

interface Props {
  section: BusinessSection;
  detailId?: string;
}

function sectionSupportsDetail(section: BusinessSection) {
  return section === "clienti" || section === "lead" || section === "deals";
}

export default function BusinessDetailPanel({ section, detailId }: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { closeDetail } = useBusinessNavigation();

  const showClient = section === "clienti" && detailId;
  const showLead = section === "lead" && detailId;
  const showDeal = section === "deals" && detailId;
  const open = Boolean(detailId && sectionSupportsDetail(section));

  const handleClose = useCallback(() => {
    queueMicrotask(() => closeDetail());
  }, [closeDetail]);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={handleClose}
      slotProps={{
        paper: {
          sx: [
            shellDrawerPaperSx,
            {
              width: isMobile ? "100%" : { xs: "100%", md: 520, lg: 640 },
              maxWidth: "100%",
            },
          ],
        },
        backdrop: { sx: { background: "rgba(0,0,0,0.55)" } },
      }}
    >
      {open && (
        <>
          <Box
            sx={{
              height: 56,
              display: "flex",
              alignItems: "center",
              px: 2,
              gap: 1,
              borderBottom: getShellTokens(theme).border,
              flexShrink: 0,
            }}
          >
            <IconButton size="small" onClick={handleClose} sx={{ color: "text.secondary" }}>
              <CloseIcon fontSize="small" />
            </IconButton>
            <Typography variant="caption" color="text.secondary">
              {SECTION_LABELS[section]}
            </Typography>
          </Box>

          <Box sx={{ flex: 1, overflow: "auto", p: { xs: 2, md: 3 } }}>
            {showClient && <ClienteDetailView clientId={detailId!} />}
            {showLead && <LeadDetailView leadId={detailId!} />}
            {showDeal && <DealDetailView dealId={detailId!} />}
          </Box>
        </>
      )}
    </Drawer>
  );
}
