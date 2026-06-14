import type { AiScope } from "@/lib/ai/types";
import { scopeFromServiceSlug } from "@/lib/ai/prompts";

export function aiScopeFromPathname(pathname: string): AiScope {
  if (pathname.startsWith("/business")) return "business";
  if (pathname.startsWith("/portale")) return "portal";
  if (pathname.startsWith("/services/operations")) return "operations";
  if (pathname.startsWith("/services/")) {
    const slug = pathname.split("/")[2] || "hub";
    return scopeFromServiceSlug(slug);
  }
  if (pathname.startsWith("/dashboard")) return "hub";
  return "hub";
}

export function aiModuleKeyFromPathname(pathname: string): string | undefined {
  if (pathname.startsWith("/services/")) {
    const slug = pathname.split("/")[2];
    return slug || undefined;
  }
  return undefined;
}

export function aiTitleFromPathname(pathname: string): string {
  if (pathname.startsWith("/business")) return "Business";
  if (pathname.startsWith("/portale")) return "Portale Cliente";
  const slug = pathname.split("/")[2];
  if (slug) return slug.replace(/-/g, " ");
  return "Coresuite Hub";
}
