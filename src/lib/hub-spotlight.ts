import type { PlatformServiceConfig } from "@/config/platform-services";
import { getServiceLaunchUrl, getServicePublicUrl } from "@/lib/platform-hosts";

function serviceDeepLink(slug: string, view?: string): string {
  if (!view) return getServiceLaunchUrl(slug);
  return getServicePublicUrl(slug, `/?view=${view}`);
}

export interface HubKpiSnapshot {
  openTickets: number;
  todayAppointments: number;
  dailyRevenue: number;
  activeClients: number;
  pendingPractices: number;
}

export interface HubExpressSnapshot {
  salesToday: number;
  lowStockOperators: number;
  iccidInStock: number;
}

export interface SpotlightRecommendation {
  slug: string;
  name: string;
  description: string;
  reason: string;
  cta: string;
  url: string;
  icon: string;
  color: string;
  gradient: string;
  stats: string[];
  priority: number;
  alertLevel?: "critical" | "warning" | "info";
}

function findService(services: PlatformServiceConfig[], slug: string) {
  return services.find((s) => s.slug === slug);
}

function fromService(
  service: PlatformServiceConfig,
  partial: Omit<SpotlightRecommendation, keyof PlatformServiceConfig | "url"> & {
    url?: string;
  }
): SpotlightRecommendation {
  return {
    slug: service.slug,
    name: service.name,
    description: service.description,
    icon: service.icon,
    color: service.color,
    gradient: service.gradient,
    url: partial.url ?? getServiceLaunchUrl(service.slug),
    reason: partial.reason,
    cta: partial.cta,
    stats: partial.stats,
    priority: partial.priority,
    alertLevel: partial.alertLevel,
  };
}

export function buildSpotlightRecommendation(input: {
  role: string;
  recent: string[];
  services: PlatformServiceConfig[];
  kpi: HubKpiSnapshot | null;
  express: HubExpressSnapshot | null;
}): SpotlightRecommendation | null {
  const { role, recent, services, kpi, express } = input;
  const candidates: SpotlightRecommendation[] = [];

  const expressService = findService(services, "express");
  if (express && express.lowStockOperators > 0 && expressService) {
    candidates.push(
      fromService(expressService, {
        reason: "Stock SIM sotto soglia",
        cta: "Apri magazzino Express",
        url: serviceDeepLink("express", "magazzino"),
        stats: [
          `${express.lowStockOperators} operatori in alert`,
          `${express.iccidInStock} SIM in stock`,
        ],
        priority: 100,
        alertLevel: express.iccidInStock === 0 ? "critical" : "warning",
      })
    );
  }

  const ticketsService = findService(services, "tickets");
  if (kpi && kpi.openTickets > 0 && ticketsService) {
    candidates.push(
      fromService(ticketsService, {
        reason: "Ticket aperti in coda",
        cta: kpi.openTickets === 1 ? "Gestisci 1 ticket" : `Gestisci ${kpi.openTickets} ticket`,
        stats: [`${kpi.openTickets} aperti`, `${kpi.todayAppointments} appuntamenti oggi`],
        priority: 90,
        alertLevel: kpi.openTickets >= 5 ? "warning" : "info",
      })
    );
  }

  if (express && express.salesToday > 0 && expressService) {
    candidates.push(
      fromService(expressService, {
        reason: "Vendite Express in corso",
        cta: "Apri Express POS",
        url: serviceDeepLink("express", "pos"),
        stats: [`${express.salesToday} vendite oggi`, "POS pronto"],
        priority: 70,
      })
    );
  }

  const businessService = findService(services, "business");
  if (kpi && kpi.activeClients > 0 && businessService && role !== "OPERATORE") {
    candidates.push(
      fromService(businessService, {
        reason: "Pipeline clienti attiva",
        cta: "Apri Business CRM",
        stats: [`${kpi.activeClients} clienti attivi`, `${kpi.pendingPractices} pratiche`],
        priority: 60,
      })
    );
  }

  for (let i = 0; i < recent.length; i++) {
    const slug = recent[i];
    const service = findService(services, slug);
    if (!service || service.status !== "active") continue;
    candidates.push(
      fromService(service, {
        reason: "Usato di recente",
        cta: `Apri ${service.name}`,
        stats: ["Riprendi da dove hai lasciato"],
        priority: 50 - i,
      })
    );
    break;
  }

  const operationsService = findService(services, "operations");
  const roleDefaultSlug =
    role === "OPERATORE" ? "express" : role === "ADMIN" || role === "SUPER_ADMIN" ? "operations" : recent[0];

  const fallback = findService(services, roleDefaultSlug ?? "operations") ?? operationsService ?? expressService;
  if (fallback) {
    candidates.push(
      fromService(fallback, {
        reason: role === "OPERATORE" ? "Consigliato per il tuo ruolo" : "Panoramica operativa",
        cta:
          fallback.slug === "express"
            ? "Apri Express POS"
            : fallback.slug === "operations"
              ? "Apri Centrale Operativa"
              : `Apri ${fallback.name}`,
        url: fallback.slug === "express" ? serviceDeepLink("express", "pos") : getServiceLaunchUrl(fallback.slug),
        stats: ["Personalizzato per te"],
        priority: 10,
      })
    );
  }

  if (candidates.length === 0) return null;
  return candidates.sort((a, b) => b.priority - a.priority)[0];
}
