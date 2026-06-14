export interface ExpressVatOptions {
  defaultVat?: number;
  simVat?: number;
  productVatRate?: number;
}

/** IVA per tipo riga: solo i prodotti usano default_vat / aliquota prodotto. */
export function resolveExpressLineVatRate(
  lineType: string,
  options: ExpressVatOptions = {}
): number {
  const type = lineType.toLowerCase();
  if (type === "prodotto") {
    const productVat = options.productVatRate;
    if (productVat != null && !Number.isNaN(Number(productVat))) {
      return Math.max(0, Number(productVat));
    }
    return Math.max(0, Number(options.defaultVat ?? 22));
  }
  if (type === "sim" || type === "servizio") {
    return Math.max(0, Number(options.simVat ?? 0));
  }
  return Math.max(0, Number(options.simVat ?? 0));
}

export function saleHasTaxableLines(lines: Array<{ vatRate?: number | string | null }>): boolean {
  return lines.some((l) => Number(l.vatRate ?? 0) > 0.001);
}

export function saleHasExemptLines(lines: Array<{ vatRate?: number | string | null }>): boolean {
  return lines.some((l) => Number(l.vatRate ?? 0) <= 0.001);
}

export function uniqueTaxableVatRates(lines: Array<{ vatRate?: number | string | null }>): number[] {
  const rates = new Set<number>();
  for (const line of lines) {
    const rate = Number(line.vatRate ?? 0);
    if (rate > 0.001) rates.add(rate);
  }
  return [...rates].sort((a, b) => a - b);
}
