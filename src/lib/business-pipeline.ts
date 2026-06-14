/** Mappa lo stage pipeline allo stato lead coerente con il report. */
export function leadStatusFromStageName(stageName: string): string {
  const n = stageName.toLowerCase();
  if (n.includes("vinto") || n.includes("chiuso vinto")) return "WON";
  if (n.includes("perso") || n.includes("lost")) return "LOST";
  if (n.includes("negozia")) return "NEGOTIATION";
  if (n.includes("proposta")) return "PROPOSAL";
  if (n.includes("qualific")) return "QUALIFIED";
  if (n.includes("contatt")) return "CONTACTED";
  return "NEW";
}
