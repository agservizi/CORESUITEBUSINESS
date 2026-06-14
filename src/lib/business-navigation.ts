export const BUSINESS_SECTIONS = [
  "dashboard",
  "clienti",
  "lead",
  "pipeline",
  "deals",
  "attivita",
  "preventivi",
  "report",
] as const;

export type BusinessSection = (typeof BUSINESS_SECTIONS)[number];

export function isBusinessSection(value: string | null): value is BusinessSection {
  return BUSINESS_SECTIONS.includes(value as BusinessSection);
}

export function parseBusinessSearchParams(searchParams: URLSearchParams) {
  const raw = searchParams.get("v");
  const section: BusinessSection = isBusinessSection(raw) ? raw : "dashboard";
  const detailId = searchParams.get("id") || undefined;
  return { section, detailId };
}

export function buildBusinessUrl(
  section: BusinessSection,
  detailId?: string
): string {
  const params = new URLSearchParams();
  if (section !== "dashboard") params.set("v", section);
  if (detailId) params.set("id", detailId);
  const query = params.toString();
  return query ? `/business?${query}` : "/business";
}

export const SECTION_LABELS: Record<BusinessSection, string> = {
  dashboard: "Dashboard",
  clienti: "Clienti",
  lead: "Lead",
  pipeline: "Pipeline",
  deals: "Deal",
  attivita: "Attività",
  preventivi: "Preventivi",
  report: "Report",
};
