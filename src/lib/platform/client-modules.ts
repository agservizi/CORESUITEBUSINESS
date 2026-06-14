const CLIENT_MODULE_KEYS = new Set([
  "appuntamenti",
  "caf-patronato",
  "energia",
  "anpr",
  "cie",
  "visure-cr",
  "fedelta",
  "curriculum",
  "aci",
]);

const PDF_MODULE_KEYS = new Set([
  "tickets",
  "caf-patronato",
  "entrate-uscite",
  "brt",
  "telegrammi",
]);

export function moduleNeedsClientId(moduleKey: string) {
  return CLIENT_MODULE_KEYS.has(moduleKey);
}

export function moduleSupportsPdf(moduleKey: string) {
  return PDF_MODULE_KEYS.has(moduleKey);
}

export function getModuleKeyFromApiPath(apiPath: string) {
  const slug = apiPath.replace("/api/platform/", "");
  return slug;
}
