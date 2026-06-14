/**
 * Dati anagrafici ufficiali AG Servizi — fonte unica per default in tutta l'app.
 * Override opzionali via variabili d'ambiente (STUDIO_* / AG_SERVIZI_*).
 */
export const AG_SERVIZI_COMPANY = {
  legalName: "AG SERVIZI VIA PLINIO 72 DI CAVALIERE CARMINE",
  tradeName: "AG Servizi",
  owner: "Cavaliere Carmine",
  street: "Via Plinio Il Vecchio, 72",
  postalCode: "80053",
  city: "Castellammare di Stabia",
  province: "NA",
  country: "Italia",
  vatNumber: "08442881218",
  phone: "0810584542",
} as const;

export type AgServiziCompanyProfile = {
  legalName: string;
  tradeName: string;
  owner: string;
  street: string;
  postalCode: string;
  city: string;
  province: string;
  country: string;
  fullAddress: string;
  cityLine: string;
  expressStoreCity: string;
  pdfLetterhead: string;
  email: string;
  pecEmail: string;
  phone: string;
  vatNumber: string;
  website: string;
  tagline: string;
};

function envFirst(...keys: string[]): string {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return "";
}

/** Profilo completo con override da .env quando presenti. */
export function getAgServiziCompany(): AgServiziCompanyProfile {
  const { legalName, tradeName, owner, street, postalCode, city, province, country } = AG_SERVIZI_COMPANY;

  const resolvedStreet = envFirst("AG_SERVIZI_STREET", "STUDIO_ADDRESS_STREET") || street;
  const resolvedCity = envFirst("AG_SERVIZI_CITY", "STUDIO_ADDRESS_CITY") || city;
  const resolvedCap = envFirst("AG_SERVIZI_POSTAL_CODE", "STUDIO_ADDRESS_CAP") || postalCode;
  const resolvedProvince = envFirst("AG_SERVIZI_PROVINCE", "STUDIO_ADDRESS_PROVINCE") || province;

  const cityLine = `${resolvedCap} ${resolvedCity} (${resolvedProvince})`;
  const fullAddress = `${resolvedStreet}, ${cityLine}`;

  return {
    legalName: envFirst("AG_SERVIZI_LEGAL_NAME", "STUDIO_LEGAL_NAME") || legalName,
    tradeName: envFirst("AG_SERVIZI_TRADE_NAME", "STUDIO_NAME") || tradeName,
    owner: envFirst("AG_SERVIZI_OWNER") || owner,
    street: resolvedStreet,
    postalCode: resolvedCap,
    city: resolvedCity,
    province: resolvedProvince,
    country,
    fullAddress,
    cityLine,
    expressStoreCity: cityLine,
    pdfLetterhead: `${tradeName} — Coresuite`,
    email:
      envFirst("AG_SERVIZI_EMAIL", "STUDIO_EMAIL", "MAIL_FROM_ADDRESS") || "coresuite@coresuite.it",
    pecEmail: envFirst("PEC_FROM_ADDRESS") || "agserviziviaplinio@sicurezzapostale.it",
    phone: envFirst("AG_SERVIZI_PHONE", "STUDIO_PHONE") || AG_SERVIZI_COMPANY.phone,
    vatNumber: envFirst("AG_SERVIZI_VAT", "STUDIO_VAT") || AG_SERVIZI_COMPANY.vatNumber,
    website: envFirst("STUDIO_WEBSITE") || "www.coresuite.it",
    tagline: envFirst("STUDIO_TAGLINE") || "Telefonia · Servizi · Digital",
  };
}

/** Default impostazioni negozio Express (POS, ricevute, PDF vendita). */
export function getAgServiziExpressStoreDefaults() {
  const company = getAgServiziCompany();
  return {
    store_name: company.legalName,
    store_address: company.street,
    store_city: company.expressStoreCity,
    store_vat: company.vatNumber,
    store_phone: company.phone,
    store_email: company.email,
    receipt_footer: "Grazie per aver scelto AG Servizi",
  };
}

/** Branding emittente per preventivi web / PDF commerciali. */
export function getAgServiziStudioBranding() {
  const company = getAgServiziCompany();
  return {
    name: company.legalName,
    tagline: company.tagline,
    email: company.email,
    phone: company.phone,
    website: company.website,
    address: company.fullAddress,
    vat: company.vatNumber,
    owner: company.owner,
  };
}

/** Intestazione documenti PDF generici (ticket, movimenti, posta). */
export function getAgServiziPdfLetterhead() {
  const company = getAgServiziCompany();
  return {
    title: company.pdfLetterhead,
    subtitle: company.legalName,
    address: company.fullAddress,
    email: company.email,
    phone: company.phone,
    vatNumber: company.vatNumber,
  };
}

/** Fallback nome negozio se settings Express non valorizzati. */
export function getAgServiziExpressStoreNameFallback() {
  return getAgServiziCompany().legalName;
}
