export interface ServiceLaunchPayload {
  slug: string;
  name: string;
  color: string;
  gradient: string;
  icon: string;
}

const STORAGE_KEY = "coresuite-service-launch";

export function persistServiceLaunch(payload: ServiceLaunchPayload) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function consumeServiceLaunch(expectedSlug: string): ServiceLaunchPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const payload = JSON.parse(raw) as ServiceLaunchPayload;
    sessionStorage.removeItem(STORAGE_KEY);
    return payload.slug === expectedSlug ? payload : null;
  } catch {
    return null;
  }
}
