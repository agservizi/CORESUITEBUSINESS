import type { HubLayoutDensity } from "@/lib/hub-layout";

const STORAGE_PREFIX = "coresuite-hub";
const MAX_PINNED = 8;
const MAX_RECENT = 10;

export interface HubPreferences {
  pinned: string[];
  recent: string[];
  layoutDensity: HubLayoutDensity;
  tourCompleted: boolean;
  commandPaletteUsed: boolean;
}

const DEFAULT_PREFS: HubPreferences = {
  pinned: [],
  recent: [],
  layoutDensity: "comfortable",
  tourCompleted: false,
  commandPaletteUsed: false,
};

let activeUserId: string | null = null;

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}:${userId}`;
}

function normalizePrefs(raw: Partial<HubPreferences> | null): HubPreferences {
  if (!raw) return { ...DEFAULT_PREFS };
  return {
    pinned: Array.isArray(raw.pinned) ? raw.pinned : [],
    recent: Array.isArray(raw.recent) ? raw.recent : [],
    layoutDensity: raw.layoutDensity === "compact" ? "compact" : "comfortable",
    tourCompleted: Boolean(raw.tourCompleted),
    commandPaletteUsed: Boolean(raw.commandPaletteUsed),
  };
}

function readPrefs(userId: string): HubPreferences {
  if (typeof window === "undefined") return { ...DEFAULT_PREFS };
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return { ...DEFAULT_PREFS };
    return normalizePrefs(JSON.parse(raw) as Partial<HubPreferences>);
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

function writePrefs(userId: string, prefs: HubPreferences) {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKey(userId), JSON.stringify(prefs));
  window.dispatchEvent(new CustomEvent("hub-prefs-changed", { detail: { userId } }));
}

export function setHubUserId(userId: string | null) {
  activeUserId = userId;
}

export function getHubUserId() {
  return activeUserId;
}

export function getHubPreferences(userId: string): HubPreferences {
  return readPrefs(userId);
}

export function updateHubPreferences(
  userId: string,
  patch: Partial<HubPreferences>
): HubPreferences {
  const next = normalizePrefs({ ...readPrefs(userId), ...patch });
  writePrefs(userId, next);
  return next;
}

export function togglePinnedService(userId: string, slug: string): HubPreferences {
  const prefs = readPrefs(userId);
  const isPinned = prefs.pinned.includes(slug);
  const pinned = isPinned
    ? prefs.pinned.filter((s) => s !== slug)
    : [slug, ...prefs.pinned.filter((s) => s !== slug)].slice(0, MAX_PINNED);
  const next = { ...prefs, pinned };
  writePrefs(userId, next);
  return next;
}

export function reorderPinnedServices(userId: string, orderedSlugs: string[]): HubPreferences {
  const prefs = readPrefs(userId);
  const valid = orderedSlugs.filter((s) => prefs.pinned.includes(s));
  const rest = prefs.pinned.filter((s) => !valid.includes(s));
  const next = { ...prefs, pinned: [...valid, ...rest].slice(0, MAX_PINNED) };
  writePrefs(userId, next);
  return next;
}

export function setHubLayoutDensity(userId: string, layoutDensity: HubLayoutDensity): HubPreferences {
  return updateHubPreferences(userId, { layoutDensity });
}

export function completeHubTour(userId: string): HubPreferences {
  return updateHubPreferences(userId, { tourCompleted: true });
}

export function markCommandPaletteUsed(userId: string): HubPreferences {
  return updateHubPreferences(userId, { commandPaletteUsed: true });
}

export function recordRecentService(slug: string, userId?: string | null) {
  const uid = userId ?? activeUserId;
  if (!uid) return;
  const prefs = readPrefs(uid);
  const recent = [slug, ...prefs.recent.filter((s) => s !== slug)].slice(0, MAX_RECENT);
  writePrefs(uid, { ...prefs, recent });
}

export function isServicePinned(userId: string, slug: string) {
  return readPrefs(userId).pinned.includes(slug);
}
