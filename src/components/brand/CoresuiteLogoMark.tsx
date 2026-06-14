"use client";

import { Box } from "@mui/material";
import { CORESUITE_BRAND, CORESUITE_LOGO_MARK_SIZE, type CoresuiteLogoSize } from "@/lib/brand";

export type CoresuiteLogoMarkProps = {
  size?: CoresuiteLogoSize | number;
  /** Ombra sotto il mark (topbar, login). */
  elevated?: boolean;
  className?: string;
};

const GRADIENT_ID = "coresuite-mark-gradient";

/**
 * Mark Coresuite: arco “C” + nucleo centrale — leggibile anche a 16px (favicon).
 */
export default function CoresuiteLogoMark({
  size = "md",
  elevated = false,
  className,
}: CoresuiteLogoMarkProps) {
  const px = typeof size === "number" ? size : CORESUITE_LOGO_MARK_SIZE[size];

  return (
    <Box
      className={className}
      sx={{
        width: px,
        height: px,
        flexShrink: 0,
        lineHeight: 0,
        borderRadius: `${Math.round(px * 0.26)}px`,
        boxShadow: elevated ? CORESUITE_BRAND.markShadow : "none",
      }}
      aria-hidden
    >
      <svg
        width={px}
        height={px}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Coresuite"
      >
        <defs>
          <linearGradient id={GRADIENT_ID} x1="6" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
            <stop stopColor={CORESUITE_BRAND.indigo} />
            <stop stopColor={CORESUITE_BRAND.purple} offset="0.52" />
            <stop stopColor={CORESUITE_BRAND.violet} offset="1" />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="8.5" fill={`url(#${GRADIENT_ID})`} />
        <path
          d="M19.6 10.4c-3.1-1.5-6.8-1.1-9.2 1.3-2.8 2.8-2.8 7.4 0 10.2 2.4 2.4 6.1 2.8 9.2 1.3"
          stroke="#fff"
          strokeWidth="2.35"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="12.4" cy="16" r="2.35" fill="#fff" />
        <circle cx="21.8" cy="11.2" r="1.35" fill="#fff" fillOpacity="0.88" />
        <path
          d="M14.2 14.4 20.6 11.8"
          stroke="#fff"
          strokeWidth="1.15"
          strokeLinecap="round"
          strokeOpacity="0.55"
        />
      </svg>
    </Box>
  );
}

/** SVG statico per favicon / file metadata (stesso design del componente). */
export const CORESUITE_MARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">
  <defs>
    <linearGradient id="coresuite-mark-gradient" x1="6" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
      <stop stop-color="#6366f1"/>
      <stop stop-color="#7c3aed" offset="0.52"/>
      <stop stop-color="#8b5cf6" offset="1"/>
    </linearGradient>
  </defs>
  <rect width="32" height="32" rx="8.5" fill="url(#coresuite-mark-gradient)"/>
  <path d="M19.6 10.4c-3.1-1.5-6.8-1.1-9.2 1.3-2.8 2.8-2.8 7.4 0 10.2 2.4 2.4 6.1 2.8 9.2 1.3" stroke="#fff" stroke-width="2.35" stroke-linecap="round" fill="none"/>
  <circle cx="12.4" cy="16" r="2.35" fill="#fff"/>
  <circle cx="21.8" cy="11.2" r="1.35" fill="#fff" fill-opacity="0.88"/>
  <path d="M14.2 14.4 20.6 11.8" stroke="#fff" stroke-width="1.15" stroke-linecap="round" stroke-opacity="0.55"/>
</svg>`;
