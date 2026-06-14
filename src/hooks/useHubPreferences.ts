"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getHubPreferences,
  togglePinnedService,
  type HubPreferences,
} from "@/lib/hub-preferences";

export function useHubPreferences(userId: string) {
  const [prefs, setPrefs] = useState<HubPreferences>({ pinned: [], recent: [] });
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

  const refresh = useCallback(() => {
    setPrefs(getHubPreferences(userId));
  }, [userId]);

  return { prefs, ready, togglePin, refresh, isPinned: (slug: string) => prefs.pinned.includes(slug) };
}
