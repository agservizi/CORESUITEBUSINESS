/** Stati pipeline contratti (fallback statico; preferire `getStatusOptions()` dal DB). */
export const OPPORTUNITY_STATUSES = [
  "in_verifica",
  "documenti_ok",
  "in_firma_otp",
  "attivato",
  "annullato",
] as const;

export type OpportunityStatusCode = (typeof OPPORTUNITY_STATUSES)[number];

export const STATUS_LABELS: Record<string, string> = {
  in_verifica: "In verifica",
  documenti_ok: "Documenti ok",
  in_firma_otp: "In firma OTP",
  attivato: "Attivato",
  annullato: "Annullato",
};

export const STATUS_COLORS: Record<string, string> = {
  in_verifica: "#f59e0b",
  documenti_ok: "#0ea5e9",
  in_firma_otp: "#6366f1",
  attivato: "#10b981",
  annullato: "#ef4444",
};
