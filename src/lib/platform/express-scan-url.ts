import { getHubPublicUrl, getServicePublicUrl, usesSubdomainRouting } from "@/lib/platform-hosts";

export function getExpressMobileScanUrl(token: string): string {
  const query = `token=${encodeURIComponent(token)}`;
  if (usesSubdomainRouting()) {
    return getServicePublicUrl("express", `/scan?${query}`);
  }

  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    process.env.APP_URL?.replace(/\/$/, "") ||
    getHubPublicUrl();

  return `${base}/express/scan?${query}`;
}

/** Garantisce URL assoluto per QR e link (anche se l'API restituisce un path relativo). */
export function toAbsoluteScanUrl(url: string, origin?: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const base = (origin || (typeof window !== "undefined" ? window.location.origin : "")).replace(
    /\/$/,
    ""
  );
  if (!base) return url;
  return `${base}${url.startsWith("/") ? url : `/${url}`}`;
}
