import { getModuleMeta } from "@/config/module-meta";
import { getModuleDefinition } from "@/config/platform-modules";

const VIEW_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  elenco: "Elenco",
  aperti: "Aperti",
  urgenti: "Urgenti",
  in_lavorazione: "In lavorazione",
  sla: "Monitor SLA",
  sla_scaduti: "SLA scaduti",
  sla_rischio: "SLA a rischio",
  canali: "Canali",
  chiusi: "Chiusi",
  report: "Report",
  aperte: "Aperte",
  caf: "Pratiche CAF",
  patronato: "Patronato",
  calendario: "Calendario",
  iscritti: "Iscritti",
  campagne: "Campagne",
  destinatari: "Destinatari salvati",
  log: "Log operativi",
  sedi: "Sedi ritiro",
  notifiche: "Notifiche",
  invio: "Nuovo invio",
  storico: "Storico invii",
  inbox: "Posta in arrivo",
  saldi: "Saldi clienti",
  premi: "Catalogo premi",
  editor: "Editor CV",
  promemoria: "Promemoria",
  kpi: "KPI operativi",
  alert: "Alert operativi",
};

export interface ServiceViewTheme {
  serviceName: string;
  title: string;
  subtitle: string;
  gradient: string;
  color: string;
}

function darkenHex(hex: string, amount = 0.15): string {
  const h = hex.replace("#", "");
  if (h.length !== 6) return hex;
  const r = Math.max(0, parseInt(h.slice(0, 2), 16) * (1 - amount));
  const g = Math.max(0, parseInt(h.slice(2, 4), 16) * (1 - amount));
  const b = Math.max(0, parseInt(h.slice(4, 6), 16) * (1 - amount));
  return `#${[r, g, b].map((n) => Math.round(n).toString(16).padStart(2, "0")).join("")}`;
}

export function getServiceViewTheme(
  moduleKey: string,
  viewId: string,
  serviceName: string,
  serviceColor: string,
  serviceGradient?: string
): ServiceViewTheme {
  const meta = getModuleMeta(moduleKey);
  const mod = getModuleDefinition(moduleKey);
  const viewLabel = VIEW_LABELS[viewId] ?? mod?.entityLabelPlural ?? "Gestione";

  return {
    serviceName,
    title: viewId === "dashboard" ? serviceName : viewLabel,
    subtitle: meta.tagline,
    gradient: serviceGradient || `linear-gradient(135deg, ${serviceColor} 0%, ${darkenHex(serviceColor, 0.22)} 100%)`,
    color: serviceColor,
  };
}

export function statusChipColor(status: unknown): "default" | "success" | "warning" | "error" | "info" {
  const s = String(status ?? "").toLowerCase();
  if (/complet|consegn|attiv|inviat|pagat|chius|firmat|ritirat|vint|sent|pront/.test(s)) return "success";
  if (/annull|error|fail|problem|scadut|rifiut/.test(s)) return "error";
  if (/attes|sosp|pending|bozza|segnalat|in coda|programm/.test(s)) return "warning";
  if (/lavoraz|corso|inviat|transit|verifica/.test(s)) return "info";
  return "default";
}
