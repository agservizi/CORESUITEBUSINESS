"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getHubPreferences,
  togglePinnedService,
  reorderPinnedServices,
  setHubLayoutDensity,
  completeHubTour,
  markCommandPaletteUsed,
  type HubPreferences,
} from "@/lib/hub-preferences";
import type { HubLayoutDensity } from "@/lib/hub-layout";

export function useHubPreferences(userId: string) {
  const [prefs, setPrefs] = useState<HubPreferences>({
    pinned: [],
    recent: [],
    layoutDensity: "comfortable",
    tourCompleted: false,
    commandPaletteUsed: false,
  });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setPrefs(getHubPreferences(userId));
    setReady(true);

    function onChange(e: Event) {
      const detail = (e as CustomEvent<{ userId: string }>).detail;
      if (!detail || detail.userId === userId) {
        setPrefs(getHubPreferences(userId));
      }
    }
    window.addEventListener("hub-prefs-changed", onChange);
    window.addEventListener("focus", onChange);
    return () => {
      window.removeEventListener("hub-prefs-changed", onChange);
      window.removeEventListener("focus", onChange);
    };
  }, [userId]);

  const togglePin = useCallback(
    (slug: string) => {
      const next = togglePinnedService(userId, slug);
      setPrefs(next);
      return next;
    },
    [userId]
  );

  const reorderPinned = useCallback(
    (ordered: string[]) => {
      const next = reorderPinnedServices(userId, ordered);
      setPrefs(next);
      return next;
    },
    [userId]
  );

  const setDensity = useCallback(
    (layoutDensity: HubLayoutDensity) => {
      const next = setHubLayoutDensity(userId, layoutDensity);
      setPrefs(next);
      return next;
    },
    [userId]
  );

  const completeTour = useCallback(() => {
    const next = completeHubTour(userId);
    setPrefs(next);
    return next;
  }, [userId]);

  const markPaletteUsed = useCallback(() => {
    const next = markCommandPaletteUsed(userId);
    setPrefs(next);
    return next;
  }, [userId]);

  const refresh = useCallback(() => {
    setPrefs(getHubPreferences(userId));
  }, [userId]);

  return {
    prefs,
    ready,
    togglePin,
    reorderPinned,
    setDensity,
    completeTour,
    markPaletteUsed,
    refresh,
    isPinned: (slug: string) => prefs.pinned.includes(slug),
  };
}
