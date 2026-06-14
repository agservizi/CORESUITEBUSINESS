import { getPlatformService } from "@/config/platform-services";

export function getPlatformRootDomain(): string {
  return (
    process.env.NEXT_PUBLIC_PLATFORM_ROOT_DOMAIN ||
    process.env.PLATFORM_ROOT_DOMAIN ||
    "coresuite.it"
  );
}

export function usesSubdomainRouting(): boolean {
  const flag =
    process.env.NEXT_PUBLIC_PLATFORM_USE_SUBDOMAINS ??
    process.env.PLATFORM_USE_SUBDOMAINS;
  if (flag === "false") return false;
  if (flag === "true") return true;
  return process.env.NODE_ENV === "production";
}

export function getServiceInternalPath(slug: string): string {
  if (slug === "business") return "/business";
  if (slug === "portale") return "/portale";
  return `/services/${slug}`;
}

export function getHubPublicUrl(): string {
  const protocol =
    process.env.NODE_ENV === "production" ||
    process.env.NEXT_PUBLIC_APP_URL?.startsWith("https")
      ? "https"
      : "http";
  return `${protocol}://${getPlatformRootDomain()}`;
}

export function getServicePublicUrl(slug: string, pathSuffix = ""): string {
  const internal = getServiceInternalPath(slug) + (pathSuffix || "");
  if (!usesSubdomainRouting()) return internal;

  const protocol =
    process.env.NODE_ENV === "production" ||
    process.env.NEXT_PUBLIC_APP_URL?.startsWith("https")
      ? "https"
      : "http";
  const suffix = pathSuffix || "/";
  const normalizedSuffix = suffix.startsWith("/") ? suffix : `/${suffix}`;
  return `${protocol}://${slug}.${getPlatformRootDomain()}${normalizedSuffix}`;
}

export function getServiceLaunchUrl(slug: string): string {
  return getServicePublicUrl(slug, "/");
}

export function resolveNavigationTarget(path: string): string {
  if (!path || path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  if (!usesSubdomainRouting()) return path;

  const [pathname, query = ""] = path.split("?");
  const search = query ? `?${query}` : "";

  if (
    pathname === "/dashboard" ||
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/profile")
  ) {
    return `${getHubPublicUrl()}${pathname}${search}`;
  }

  if (pathname === "/business" || pathname.startsWith("/business/")) {
    const suffix = pathname.slice("/business".length) || "/";
    return getServicePublicUrl("business", `${suffix}${search}`);
  }

  if (pathname === "/portale" || pathname.startsWith("/portale/")) {
    const suffix = pathname.slice("/portale".length) || "/";
    return getServicePublicUrl("portale", `${suffix}${search}`);
  }

  const match = pathname.match(/^\/services\/([^/?#]+)(.*)$/);
  if (match) {
    const [, slug, rest] = match;
    if (getPlatformService(slug)) {
      return getServicePublicUrl(slug, `${rest || "/"}${search}`);
    }
  }

  return `${getHubPublicUrl()}${pathname}${search}`;
}

export function getSubdomainSlugFromHost(hostHeader: string | null): string | null {
  if (!hostHeader) return null;

  const host = hostHeader.split(":")[0]?.toLowerCase() ?? "";
  const root = getPlatformRootDomain();

  if (
    host === root ||
    host === `www.${root}` ||
    host === "localhost" ||
    host.endsWith(".localhost")
  ) {
    return null;
  }

  if (host.endsWith(`.${root}`)) {
    const sub = host.slice(0, -(root.length + 1));
    if (sub && !sub.includes(".")) return sub;
  }

  return null;
}

export function isHubHost(hostHeader: string | null): boolean {
  return getSubdomainSlugFromHost(hostHeader) === null;
}
