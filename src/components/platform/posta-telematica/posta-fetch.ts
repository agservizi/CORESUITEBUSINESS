import { readJsonResponse } from "@/lib/fetch-client";

export async function fetchPostaJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "include", ...init });
  const data = await readJsonResponse<T & { error?: string }>(res);
  if (!data) {
    throw new Error(res.ok ? "Risposta vuota dal server" : `Errore ${res.status}`);
  }
  if (!res.ok) {
    throw new Error(data.error || `Errore ${res.status}`);
  }
  return data;
}
