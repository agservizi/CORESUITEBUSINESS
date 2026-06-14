export function buildPlatformUrl(serviceSlug: string, viewId = "dashboard", extra?: Record<string, string>) {
  const params = new URLSearchParams({ v: viewId, ...extra });
  return `/services/${serviceSlug}?${params.toString()}`;
}

export function parsePlatformSearchParams(params: URLSearchParams) {
  const viewId = params.get("v") || params.get("view") || "dashboard";
  return { viewId };
}
