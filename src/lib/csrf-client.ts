export function getCsrfToken(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/(?:^|;\s*)coresuite-csrf=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : "";
}

export function csrfHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = getCsrfToken();
  return token ? { ...extra, "x-csrf-token": token } : extra;
}

export function jsonMutationHeaders(): Record<string, string> {
  return csrfHeaders({ "Content-Type": "application/json" });
}
