"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  buildPlatformUrl,
  parsePlatformSearchParams,
} from "@/lib/platform-navigation";

interface NavState {
  viewId: string;
}

interface PlatformNavigationContextValue extends NavState {
  serviceSlug: string;
  navigate: (viewId: string) => void;
}

const DEFAULT_STATE: NavState = { viewId: "dashboard" };

const PlatformNavigationContext =
  createContext<PlatformNavigationContextValue | null>(null);

function readUrlState(): NavState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  return parsePlatformSearchParams(new URLSearchParams(window.location.search));
}

export function PlatformNavigationProvider({
  serviceSlug,
  children,
}: {
  serviceSlug: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [state, setState] = useState<NavState>(DEFAULT_STATE);

  useEffect(() => {
    setState(readUrlState());
    const syncFromUrl = () => setState(readUrlState());
    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, []);

  const navigate = useCallback(
    (viewId: string) => {
      setState({ viewId });
      router.push(buildPlatformUrl(serviceSlug, viewId), { scroll: false });
    },
    [router, serviceSlug]
  );

  const value = useMemo(
    () => ({
      serviceSlug,
      viewId: state.viewId,
      navigate,
    }),
    [serviceSlug, state.viewId, navigate]
  );

  return (
    <PlatformNavigationContext.Provider value={value}>
      {children}
    </PlatformNavigationContext.Provider>
  );
}

export function usePlatformNavigation() {
  const ctx = useContext(PlatformNavigationContext);
  if (!ctx) {
    throw new Error("usePlatformNavigation must be used within PlatformNavigationProvider");
  }
  return ctx;
}
