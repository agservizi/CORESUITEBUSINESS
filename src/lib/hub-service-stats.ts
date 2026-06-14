import type { HubExpressSnapshot, HubKpiSnapshot } from "@/lib/hub-spotlight";

export interface ServiceHoverStat {
  label: string;
  value: string;
}

export function getServiceHoverStats(
  slug: string,
  kpi: HubKpiSnapshot | null,
  express: HubExpressSnapshot | null
): ServiceHoverStat[] | null {
  if (!kpi && !express) return null;

  switch (slug) {
    case "express":
      if (!express) return null;
      return [
        { label: "Vendite oggi", value: String(express.salesToday) },
        { label: "SIM in stock", value: String(express.iccidInStock) },
      ];
    case "tickets":
      if (!kpi) return null;
      return [
        { label: "Ticket aperti", value: String(kpi.openTickets) },
        { label: "Appuntamenti", value: String(kpi.todayAppointments) },
      ];
    case "business":
      if (!kpi) return null;
      return [
        { label: "Clienti attivi", value: String(kpi.activeClients) },
        { label: "Pratiche", value: String(kpi.pendingPractices) },
      ];
    case "operations":
      if (!kpi) return null;
      return [
        { label: "Incassi oggi", value: `€${Math.round(kpi.dailyRevenue).toLocaleString("it-IT")}` },
        { label: "Ticket", value: String(kpi.openTickets) },
      ];
    case "payments":
    case "cassa":
      if (!kpi) return null;
      return [{ label: "Incassi oggi", value: `€${Math.round(kpi.dailyRevenue).toLocaleString("it-IT")}` }];
    default:
      return null;
  }
}
