/** Metadati UI/UX e KPI per moduli piattaforma */
export interface ModuleMeta {
  tagline: string;
  pendingLabel: string;
  completedLabel: string;
  listViewLabel?: string;
  aiScope: import("@/lib/ai/types").AiScope;
}

export const MODULE_META: Record<string, ModuleMeta> = {
  tickets: {
    tagline: "Assistenza clienti, SLA e messaggistica",
    pendingLabel: "Aperti",
    completedLabel: "Chiusi",
    listViewLabel: "Vai ai ticket",
    aiScope: "tickets",
  },
  appuntamenti: {
    tagline: "Agenda, prenotazioni e promemoria",
    pendingLabel: "Programmati",
    completedLabel: "Completati",
    aiScope: "hub",
  },
  "caf-patronato": {
    tagline: "Pratiche fiscali CAF e patronato",
    pendingLabel: "In lavorazione",
    completedLabel: "Completate",
    aiScope: "practices",
  },
  energia: {
    tagline: "Contratti luce/gas, POD/PDR e attivazioni",
    pendingLabel: "In attivazione",
    completedLabel: "Attivi",
    aiScope: "practices",
  },
  anpr: {
    tagline: "Anagrafe nazionale, certificati e appuntamenti",
    pendingLabel: "In lavorazione",
    completedLabel: "Completate",
    aiScope: "practices",
  },
  cie: {
    tagline: "Carta d'Identità Elettronica — slot e prenotazioni",
    pendingLabel: "Prenotati",
    completedLabel: "Completati",
    aiScope: "practices",
  },
  "visure-cr": {
    tagline: "Visure camerali, catastali e certificati",
    pendingLabel: "In lavorazione",
    completedLabel: "Completate",
    aiScope: "practices",
  },
  brt: {
    tagline: "Spedizioni BRT, tracking e etichette",
    pendingLabel: "In transito",
    completedLabel: "Consegnate",
    aiScope: "hub",
  },
  logistica: {
    tagline: "Pacchi in attesa, ritiri e magazzino",
    pendingLabel: "In attesa",
    completedLabel: "Ritirati",
    aiScope: "hub",
  },
  marketing: {
    tagline: "Campagne email, iscritti e invii",
    pendingLabel: "Bozze",
    completedLabel: "Inviate",
    aiScope: "marketing",
  },
  fedelta: {
    tagline: "Punti fedeltà e premi clienti",
    pendingLabel: "Movimenti",
    completedLabel: "Totale punti",
    aiScope: "hub",
  },
  curriculum: {
    tagline: "CV, bozze e consegne",
    pendingLabel: "In lavorazione",
    completedLabel: "Consegnati",
    aiScope: "curriculum",
  },
  aci: {
    tagline: "Pratiche motorizzazione e ACI",
    pendingLabel: "In lavorazione",
    completedLabel: "Completate",
    aiScope: "practices",
  },
  telegrammi: {
    tagline: "Invio telegrammi e coda consegne",
    pendingLabel: "In coda",
    completedLabel: "Inviati",
    aiScope: "hub",
  },
  "posta-telematica": {
    tagline: "Invii PEC ed email con ricevute automatiche",
    pendingLabel: "In attesa",
    completedLabel: "Inviati",
    aiScope: "practices",
  },
};

export function getModuleMeta(moduleKey: string): ModuleMeta {
  return (
    MODULE_META[moduleKey] ?? {
      tagline: "Gestione operativa",
      pendingLabel: "In sospeso",
      completedLabel: "Completati",
      aiScope: "hub",
    }
  );
}
