"use client";

import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { resolveNavigationTarget } from "@/lib/platform-hosts";

/** Navigate to a path, crossing subdomain boundaries when needed (hub ↔ services). */
export function navigateResolved(router: AppRouterInstance, path: string) {
  const destination = resolveNavigationTarget(path);
  if (destination.startsWith("http://") || destination.startsWith("https://")) {
    window.location.assign(destination);
    return;
  }
  router.push(destination);
}
