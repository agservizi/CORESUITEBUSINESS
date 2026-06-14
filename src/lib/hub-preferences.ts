const STORAGE_PREFIX = "coresuite-hub";
const MAX_PINNED = 8;
const MAX_RECENT = 10;

export interface HubPreferences {
  pinned: string[];
  recent: string[];
}

let activeUserId: string | null = null;

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}:${userId}`;
}

function readPrefs(userId: string): HubPreferences {
  if (typeof window === "undefined") return { pinned: [], recent: [] };
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return { pinned: [], recent: [] };
    const parsed = JSON.parse(raw) as HubPreferences;
    return {
      pinned: Array.isArray(parsed.pinned) ? parsed.pinned : [],
      recent: Array.isArray(parsed.recent) ? parsed.recent : [],
    };
  } catch {
    return { pinned: [], recent: [] };
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
