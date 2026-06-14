/** Etichetta compatta per liste vendite (dashboard, notifiche). */
export function formatRecentSaleLabel(sale: {
  client?: { name: string } | null;
  lines?: { description: string }[];
  _count?: { lines: number };
}): string {
  const descriptions = (sale.lines ?? []).map((l) => l.description.trim()).filter(Boolean);
  const lineCount = descriptions.length || sale._count?.lines || 0;

  if (descriptions.length === 1) {
    return sale.client?.name ? `${descriptions[0]} · ${sale.client.name}` : descriptions[0];
  }
  if (descriptions.length === 2) {
    const base = `${descriptions[0]} · ${descriptions[1]}`;
    return sale.client?.name ? `${base} · ${sale.client.name}` : base;
  }
  if (descriptions.length > 2) {
    const base = `${descriptions[0]} (+${descriptions.length - 1})`;
    return sale.client?.name ? `${base} · ${sale.client.name}` : base;
  }

  if (lineCount > 0) return `Vendita · ${lineCount} righe`;
  return sale.client?.name ?? "Vendita";
}
