export type HubCategory =
  | "all"
  | "operativi"
  | "cittadino"
  | "finanza"
  | "logistica"
  | "marketing";

export const HUB_CATEGORIES: { id: HubCategory; label: string }[] = [
  { id: "all", label: "Tutti" },
  { id: "operativi", label: "Operativi" },
  { id: "cittadino", label: "Servizi al cittadino" },
  { id: "finanza", label: "Finanza" },
  { id: "logistica", label: "Logistica" },
  { id: "marketing", label: "Marketing" },
];

const SLUG_CATEGORY: Record<string, HubCategory> = {
  operations: "operativi",
  business: "operativi",
  tickets: "operativi",
  appuntamenti: "operativi",
  "caf-patronato": "operativi",
  opportunities: "operativi",
  "entrate-uscite": "finanza",
  energia: "finanza",
  express: "finanza",
  anpr: "cittadino",
  cie: "cittadino",
  "visure-cr": "cittadino",
  aci: "cittadino",
  "posta-telematica": "cittadino",
  brt: "logistica",
  logistica: "logistica",
  telegrammi: "logistica",
  marketing: "marketing",
  fedelta: "marketing",
  curriculum: "marketing",
};

export function getServiceCategory(slug: string): HubCategory {
  return SLUG_CATEGORY[slug] || "operativi";
}

export function filterByCategory<T extends { slug: string }>(
  items: T[],
  category: HubCategory
): T[] {
  if (category === "all") return items;
  return items.filter((s) => getServiceCategory(s.slug) === category);
}
