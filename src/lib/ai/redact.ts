/** Maschera dati sensibili prima di inviarli al modello. */
export function redactForAi(text: string): string {
  return text
    .replace(/\b[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]\b/gi, "[CF]")
    .replace(/\b\d{11}\b/g, "[PIVA/CF]")
    .replace(/\b[\w.+-]+@[\w.-]+\.\w+\b/g, "[EMAIL]")
    .replace(/\b3\d{9}\b/g, "[TEL]");
}

export function redactObject(value: unknown): unknown {
  if (typeof value === "string") return redactForAi(value);
  if (Array.isArray(value)) return value.map(redactObject);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = redactObject(v);
    }
    return out;
  }
  return value;
}
