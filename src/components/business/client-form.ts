export type ClientFormType = "INDIVIDUAL" | "COMPANY" | "FREELANCE";

export const CLIENT_TYPE_OPTIONS: {
  value: ClientFormType;
  label: string;
  hint: string;
}[] = [
  {
    value: "INDIVIDUAL",
    label: "Privato",
    hint: "Persona fisica — nome, codice fiscale e contatti.",
  },
  {
    value: "COMPANY",
    label: "Azienda",
    hint: "Società o impresa — ragione sociale, referente e P.IVA.",
  },
  {
    value: "FREELANCE",
    label: "Freelance",
    hint: "Professionista con P.IVA — nome, denominazione e dati fiscali.",
  },
];

export function getClientTypeHint(type: ClientFormType): string {
  return CLIENT_TYPE_OPTIONS.find((t) => t.value === type)?.hint ?? "";
}

export function guessClientTypeFromName(name: string): ClientFormType {
  const value = name.trim();
  if (!value) return "INDIVIDUAL";
  if (/\b(s\.?r\.?l\.?|s\.?p\.?a\.?|s\.?n\.?c\.?|s\.?a\.?s\.?|s\.?s\.?)\b/i.test(value)) {
    return "COMPANY";
  }
  return "INDIVIDUAL";
}

export function validateClientForm(form: {
  type: ClientFormType;
  name: string;
  companyName: string;
}): string | null {
  if (form.type === "COMPANY") {
    if (!form.companyName.trim()) return "La ragione sociale è obbligatoria";
    return null;
  }
  if (!form.name.trim()) return "Il nome è obbligatorio";
  return null;
}

export function applyClientTypeChange<
  T extends {
    type: ClientFormType;
    companyName: string;
    vatNumber: string;
    taxCode: string;
  },
>(form: T, nextType: ClientFormType): T {
  const next = { ...form, type: nextType };
  if (nextType === "INDIVIDUAL") {
    next.companyName = "";
    next.vatNumber = "";
  }
  if (nextType === "COMPANY") {
    next.taxCode = "";
  }
  return next;
}

export function normalizeClientIdentity(form: {
  type: ClientFormType;
  name: string;
  companyName: string;
}): { name: string; companyName: string } {
  if (form.type === "COMPANY") {
    return {
      name: form.name.trim() || form.companyName.trim(),
      companyName: form.companyName.trim(),
    };
  }
  if (form.type === "INDIVIDUAL") {
    return {
      name: form.name.trim(),
      companyName: "",
    };
  }
  return {
    name: form.name.trim(),
    companyName: form.companyName.trim(),
  };
}
