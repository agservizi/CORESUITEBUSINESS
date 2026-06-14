"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  buildBusinessUrl,
  parseBusinessSearchParams,
  type BusinessSection,
} from "@/lib/business-navigation";

interface NavState {
  section: BusinessSection;
  detailId?: string;
}

interface BusinessNavigationContextValue extends NavState {
  navigate: (section: BusinessSection, detailId?: string) => void;
  openDetail: (id: string) => void;
  closeDetail: () => void;
}

const DEFAULT_STATE: NavState = { section: "dashboard", detailId: undefined };

const DETAIL_SECTIONS = new Set<BusinessSection>(["clienti", "lead", "deals"]);

const BusinessNavigationContext =
  createContext<BusinessNavigationContextValue | null>(null);

function readUrlState(): NavState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  return parseBusinessSearchParams(new URLSearchParams(window.location.search));
}

export function BusinessNavigationProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<NavState>(DEFAULT_STATE);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    setState(readUrlState());

    const syncFromUrl = () => setState(readUrlState());
    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, []);

  /** Rimuove detailId stale quando la sezione corrente non supporta pannelli dettaglio. */
  useEffect(() => {
    if (!state.detailId) return;
    if (DETAIL_SECTIONS.has(state.section)) return;

    setState((prev) => ({ ...prev, detailId: undefined }));
    router.replace(buildBusinessUrl(state.section), { scroll: false });
  }, [state.section, state.detailId, router]);

  const navigate = useCallback(
    (nextSection: BusinessSection, nextDetailId?: string) => {
      setState({ section: nextSection, detailId: nextDetailId });
      router.push(buildBusinessUrl(nextSection, nextDetailId), { scroll: false });
    },
    [router]
  );

  const openDetail = useCallback(
    (id: string) => {
      const { section } = stateRef.current;
      setState({ section, detailId: id });
      router.push(buildBusinessUrl(section, id), { scroll: false });
    },
    [router]
  );

  const closeDetail = useCallback(() => {
    const { section, detailId } = stateRef.current;
    if (!detailId) return;
    setState({ section, detailId: undefined });
    router.push(buildBusinessUrl(section), { scroll: false });
  }, [router]);

  const value = useMemo(
    () => ({
      section: state.section,
      detailId: state.detailId,
      navigate,
      openDetail,
      closeDetail,
    }),
    [state.section, state.detailId, navigate, openDetail, closeDetail]
  );

  return (
    <BusinessNavigationContext.Provider value={value}>
      {children}
    </BusinessNavigationContext.Provider>
  );
}

export function useBusinessNavigation() {
  const ctx = useContext(BusinessNavigationContext);
  if (!ctx) {
    throw new Error("useBusinessNavigation must be used within BusinessNavigationProvider");
  }
  return ctx;
}
