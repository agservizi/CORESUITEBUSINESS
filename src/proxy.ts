import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getSessionCookieBase } from "@/lib/auth";
import { getPlatformService } from "@/config/platform-services";
import {
  getHubPublicUrl,
  getPlatformRootDomain,
  getServiceInternalPath,
  getServicePublicUrl,
  getSubdomainSlugFromHost,
  isHubHost,
  usesSubdomainRouting,
} from "@/lib/platform-hosts";

const PUBLIC_PATHS = [
  "/login",
  "/api/auth/login",
  "/api/payments/stripe/webhook",
  "/express/scan",
  "/api/platform/express/scan-session/submit",
];

function redirectHubServicePaths(request: NextRequest): NextResponse | null {
  if (!usesSubdomainRouting() || !isHubHost(request.headers.get("host"))) {
    return null;
  }

  const { pathname, search } = request.nextUrl;

  if (pathname === "/business" || pathname.startsWith("/business/")) {
    const suffix = pathname.slice("/business".length) || "/";
    return NextResponse.redirect(getServicePublicUrl("business", suffix + search));
  }

  if (pathname === "/portale" || pathname.startsWith("/portale/")) {
    const suffix = pathname.slice("/portale".length) || "/";
    return NextResponse.redirect(getServicePublicUrl("portale", suffix + search));
  }

  const match = pathname.match(/^\/services\/([^/]+)(\/.*)?$/);
  if (match) {
    const slug = match[1];
    const suffix = match[2] || "/";
    if (getPlatformService(slug)) {
      return NextResponse.redirect(getServicePublicUrl(slug, suffix + search));
    }
  }

  return null;
}

function rewriteSubdomainRequest(request: NextRequest): NextResponse | null {
  const slug = getSubdomainSlugFromHost(request.headers.get("host"));
  if (!slug) return null;

  const service = getPlatformService(slug);
  if (!service) {
    return NextResponse.redirect(`${getHubPublicUrl()}/dashboard`);
  }

  const basePath = getServiceInternalPath(slug);
  const { pathname, search } = request.nextUrl;

  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  if (pathname === "/login" || pathname.startsWith("/login/")) {
    return NextResponse.next();
  }

  if (pathname === "/scan" || pathname.startsWith("/scan/")) {
    return NextResponse.rewrite(
      new URL(`/express/scan${pathname.slice("/scan".length)}${search}`, request.url)
    );
  }

  if (pathname === "/express/scan" || pathname.startsWith("/express/scan/")) {
    return NextResponse.next();
  }

  if (
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/") ||
    pathname === "/profile" ||
    pathname.startsWith("/profile/")
  ) {
    return NextResponse.redirect(`${getHubPublicUrl()}${pathname}${search}`);
  }

  if (pathname === basePath || pathname.startsWith(`${basePath}/`)) {
    return NextResponse.next();
  }

  if (pathname === "/") {
    return NextResponse.rewrite(new URL(`${basePath}${search}`, request.url));
  }

  return NextResponse.rewrite(
    new URL(`${basePath}${pathname}${search}`, request.url)
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname === "/manifest.webmanifest" ||
    pathname === "/icon.svg" ||
    pathname === "/apple-icon.svg" ||
    pathname.startsWith("/brand/")
  ) {
    return NextResponse.next();
  }

  const hubRedirect = redirectHubServicePaths(request);
  if (hubRedirect) return hubRedirect;

  const subdomainRewrite = rewriteSubdomainRequest(request);
  if (subdomainRewrite) return subdomainRewrite;

  if (
    usesSubdomainRouting() &&
    isHubHost(request.headers.get("host")) &&
    (pathname === "/express/scan" || pathname.startsWith("/express/scan/"))
  ) {
    const { search } = request.nextUrl;
    return NextResponse.redirect(getServicePublicUrl("express", `/scan${search}`));
  }

  if (pathname === "/digitali" || pathname.startsWith("/digitali/")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  if (pathname === "/services/digitali" || pathname.startsWith("/services/digitali/")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  if (isPublic) return NextResponse.next();

  const token = request.cookies.get("coresuite-token")?.value;

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    if (!isHubHost(request.headers.get("host"))) {
      loginUrl.host = getPlatformRootDomain();
    }
    return NextResponse.redirect(loginUrl);
  }

  const payload = await verifyToken(token);
  if (!payload) {
    const loginUrl = new URL("/login", request.url);
    if (!isHubHost(request.headers.get("host"))) {
      loginUrl.host = getPlatformRootDomain();
    }
    const response = NextResponse.redirect(loginUrl);
    response.cookies.set("coresuite-token", "", { ...getSessionCookieBase(0), maxAge: 0 });
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest\\.webmanifest|icon\\.svg|apple-icon\\.svg|brand/|api/auth/login|api/payments/stripe/webhook|api/platform/express/scan-session/submit).*)",
  ],
};
