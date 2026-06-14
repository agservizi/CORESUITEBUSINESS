"use client";

import { Box, Typography } from "@mui/material";
import Link from "next/link";
import CoresuiteLogoMark from "./CoresuiteLogoMark";
import { CORESUITE_BRAND, type CoresuiteLogoSize } from "@/lib/brand";

export type CoresuiteLogoProps = {
  size?: CoresuiteLogoSize;
  /** Sottotitolo sotto il wordmark (es. Service Hub). */
  showTagline?: boolean;
  href?: string;
  /** Se false, render statico senza link. */
  link?: boolean;
  /** Wordmark chiaro per sfondi scuri / gradient (login). */
  variant?: "default" | "onDark";
};

export default function CoresuiteLogo({
  size = "md",
  showTagline = false,
  href = "/dashboard",
  link = true,
  variant = "default",
}: CoresuiteLogoProps) {
  const wordmarkSize = size === "sm" ? "0.925rem" : size === "lg" ? "1.125rem" : "1.05rem";
  const onDark = variant === "onDark";

  const content = (
    <>
      <CoresuiteLogoMark size={size} elevated={!onDark} />
      <Box sx={{ minWidth: 0 }}>
        <Typography
          component="span"
          sx={{
            display: "block",
            fontWeight: 800,
            fontSize: wordmarkSize,
            letterSpacing: "-0.03em",
            lineHeight: 1.15,
            color: onDark ? "#fff" : undefined,
          }}
        >
          {onDark ? (
            "Coresuite"
          ) : (
            <>
              <Box component="span" sx={{ color: "text.primary" }}>
                Core
              </Box>
              <Box
                component="span"
                sx={{
                  background: CORESUITE_BRAND.gradient,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                suite
              </Box>
            </>
          )}
        </Typography>
        {showTagline && (
          <Typography
            variant="caption"
            sx={{
              display: "block",
              color: onDark ? "rgba(255,255,255,0.72)" : "text.secondary",
              fontSize: "0.68rem",
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              lineHeight: 1.2,
              mt: 0.15,
            }}
          >
            Service Hub
          </Typography>
        )}
      </Box>
    </>
  );

  const sx = {
    display: "inline-flex",
    alignItems: "center",
    gap: size === "sm" ? 1 : 1.25,
    textDecoration: "none",
    color: "inherit",
    flexShrink: 0,
    "&:hover .coresuite-wordmark": {
      opacity: 0.92,
    },
  };

  if (!link) {
    return (
      <Box sx={sx} className="coresuite-logo">
        {content}
      </Box>
    );
  }

  return (
    <Box
      component={Link}
      href={href}
      sx={sx}
      className="coresuite-logo"
      aria-label="Coresuite — torna alla dashboard"
    >
      <Box className="coresuite-wordmark" sx={{ display: "contents" }}>
        {content}
      </Box>
    </Box>
  );
}
