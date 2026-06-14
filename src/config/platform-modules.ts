export type FieldType = "text" | "email" | "number" | "date" | "datetime" | "select" | "textarea";

export interface ModuleField {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: { value: string; label: string }[];
}

export interface ModuleColumn {
  key: string;
  label: string;
  format?: "date" | "currency" | "status";
}

export interface ModuleDefinition {
  entityLabel: string;
  entityLabelPlural: string;
  apiPath: string;
  columns: ModuleColumn[];
  createFields: ModuleField[];
  codePrefix?: string;
  listFilter?: (viewId: string) => Record<string, unknown> | undefined;
}

export const PLATFORM_MODULES: Record<string, ModuleDefinition> = {
  tickets: {
    entityLabel: "Ticket",
    entityLabelPlural: "Ticket",
    apiPath: "/api/platform/tickets",
    codePrefix: "TK",
    columns: [
      { key: "code", label: "Codice" },
      { key: "subject", label: "Oggetto" },
      { key: "status", label: "Stato", format: "status" },
      { key: "priority", label: "Priorità" },
      { key: "createdAt", label: "Creato", format: "date" },
    ],
    createFields: [
      { key: "subject", label: "Oggetto", type: "text", required: true },
      { key: "customerName", label: "Cliente", type: "text" },
      { key: "customerEmail", label: "Email", type: "email" },
      { key: "customerPhone", label: "Telefono", type: "text" },
      {
        key: "type",
        label: "Tipo",
        type: "select",
        options: [
          { value: "SUPPORT", label: "Supporto" },
          { value: "TECH", label: "Tecnico" },
          { value: "ADMIN", label: "Amministrativo" },
          { value: "SALES", label: "Commerciale" },
        ],
      },
      {
        key: "priority",
        label: "Priorità",
        type: "select",
        options: [
          { value: "LOW", label: "Bassa" },
          { value: "MEDIUM", label: "Media" },
          { value: "HIGH", label: "Alta" },
          { value: "URGENT", label: "Urgente" },
        ],
      },
    ],
    listFilter: (viewId) => {
      const open = { status: { in: ["OPEN", "IN_PROGRESS", "WAITING_CLIENT", "WAITING_PARTNER"] } };
      switch (viewId) {
        case "aperti":
          return open;
        case "urgenti":
          return { ...open, priority: "URGENT" };
        case "in_lavorazione":
          return { status: "IN_PROGRESS" };
        case "chiusi":
          return { status: { in: ["RESOLVED", "CLOSED", "ARCHIVED"] } };
        case "portale":
          return { channel: "PORTAL" };
        case "email":
          return { channel: "EMAIL" };
        case "telefono":
          return { channel: "PHONE" };
        default:
          return undefined;
      }
    },
  },
  appuntamenti: {
    entityLabel: "Appuntamento",
    entityLabelPlural: "Appuntamenti",
    apiPath: "/api/platform/appuntamenti",
    columns: [
      { key: "title", label: "Titolo" },
      { key: "serviceType", label: "Servizio" },
      { key: "status", label: "Stato", format: "status" },
      { key: "startsAt", label: "Inizio", format: "date" },
    ],
    createFields: [
      { key: "title", label: "Titolo", type: "text", required: true },
      { key: "serviceType", label: "Tipo servizio", type: "text", required: true },
      { key: "startsAt", label: "Data/ora inizio", type: "datetime", required: true },
      { key: "location", label: "Luogo", type: "text" },
      { key: "assignee", label: "Responsabile", type: "text" },
    ],
  },
  "caf-patronato": {
    entityLabel: "Pratica",
    entityLabelPlural: "Pratiche",
    apiPath: "/api/platform/caf-patronato",
    codePrefix: "PR",
    columns: [
      { key: "code", label: "Codice" },
      { key: "practiceType", label: "Tipo" },
      { key: "category", label: "Categoria" },
      { key: "status", label: "Stato", format: "status" },
      { key: "createdAt", label: "Creato", format: "date" },
    ],
    createFields: [
      { key: "practiceType", label: "Tipo pratica", type: "text", required: true },
      {
        key: "category",
        label: "Categoria",
        type: "select",
        required: true,
        options: [
          { value: "CAF", label: "CAF" },
          { value: "PATRONATO", label: "Patronato" },
        ],
      },
      {
        key: "status",
        label: "Stato",
        type: "select",
        options: [
          { value: "BOZZA", label: "Bozza" },
          { value: "IN_LAVORAZIONE", label: "In lavorazione" },
          { value: "INVIATA", label: "Inviata" },
          { value: "COMPLETATA", label: "Completata" },
          { value: "ANNULLATA", label: "Annullata" },
        ],
      },
      { key: "year", label: "Anno", type: "number" },
      { key: "notes", label: "Note", type: "textarea" },
    ],
    listFilter: (viewId) => {
      if (viewId === "caf") return { category: "CAF" };
      if (viewId === "patronato") return { category: "PATRONATO" };
      return undefined;
    },
  },
  "entrate-uscite": {
    entityLabel: "Movimento",
    entityLabelPlural: "Movimenti",
    apiPath: "/api/platform/entrate-uscite",
    columns: [
      { key: "description", label: "Descrizione" },
      { key: "type", label: "Tipo" },
      { key: "amount", label: "Importo", format: "currency" },
      { key: "status", label: "Stato", format: "status" },
      { key: "dueDate", label: "Scadenza", format: "date" },
    ],
    createFields: [
      { key: "description", label: "Descrizione", type: "text", required: true },
      {
        key: "type",
        label: "Tipo",
        type: "select",
        required: true,
        options: [
          { value: "ENTRATA", label: "Entrata" },
          { value: "USCITA", label: "Uscita" },
        ],
      },
      { key: "amount", label: "Importo", type: "number", required: true },
      { key: "method", label: "Metodo", type: "text" },
      { key: "dueDate", label: "Scadenza", type: "date" },
    ],
    listFilter: (viewId) => {
      if (viewId === "entrate") return { type: "ENTRATA" };
      if (viewId === "uscite") return { type: "USCITA" };
      if (viewId === "scadenze") return { status: { notIn: ["Pagato", "Completato", "Annullato"] } };
      return undefined;
    },
  },
  energia: {
    entityLabel: "Contratto",
    entityLabelPlural: "Contratti energia",
    apiPath: "/api/platform/energia",
    columns: [
      { key: "supplier", label: "Fornitore" },
      { key: "contractType", label: "Tipo" },
      { key: "pod", label: "POD" },
      { key: "status", label: "Stato", format: "status" },
    ],
    createFields: [
      { key: "supplier", label: "Fornitore", type: "text" },
      { key: "contractType", label: "Tipo contratto", type: "text" },
      { key: "pod", label: "POD", type: "text" },
      { key: "pdr", label: "PDR", type: "text" },
      {
        key: "status",
        label: "Stato",
        type: "select",
        options: [
          { value: "In attivazione", label: "In attivazione" },
          { value: "Attivo", label: "Attivo" },
          { value: "Completato", label: "Completato" },
          { value: "Annullato", label: "Annullato" },
        ],
      },
    ],
  },
  anpr: {
    entityLabel: "Richiesta ANPR",
    entityLabelPlural: "Richieste ANPR",
    apiPath: "/api/platform/anpr",
    columns: [
      { key: "requestType", label: "Tipo" },
      { key: "status", label: "Stato", format: "status" },
      { key: "scheduledAt", label: "Appuntamento", format: "date" },
    ],
    createFields: [
      { key: "requestType", label: "Tipo richiesta", type: "text", required: true },
      {
        key: "status",
        label: "Stato",
        type: "select",
        options: [
          { value: "In attesa", label: "In attesa" },
          { value: "In lavorazione", label: "In lavorazione" },
          { value: "Completato", label: "Completato" },
          { value: "Annullato", label: "Annullato" },
        ],
      },
      { key: "scheduledAt", label: "Data appuntamento", type: "datetime" },
      { key: "notes", label: "Note", type: "textarea" },
    ],
  },
  cie: {
    entityLabel: "Prenotazione CIE",
    entityLabelPlural: "Prenotazioni CIE",
    apiPath: "/api/platform/cie",
    columns: [
      { key: "slotAt", label: "Slot", format: "date" },
      { key: "status", label: "Stato", format: "status" },
    ],
    createFields: [
      { key: "slotAt", label: "Data/ora slot", type: "datetime", required: true },
      {
        key: "status",
        label: "Stato",
        type: "select",
        options: [
          { value: "Prenotato", label: "Prenotato" },
          { value: "Completato", label: "Completato" },
          { value: "Annullato", label: "Annullato" },
        ],
      },
      { key: "notes", label: "Note", type: "textarea" },
    ],
  },
  "visure-cr": {
    entityLabel: "Pratica visura",
    entityLabelPlural: "Pratiche visure",
    apiPath: "/api/platform/visure-cr",
    columns: [
      { key: "caseType", label: "Tipo" },
      { key: "registry", label: "Registro" },
      { key: "status", label: "Stato", format: "status" },
    ],
    createFields: [
      { key: "caseType", label: "Tipo pratica", type: "text", required: true },
      { key: "registry", label: "Registro", type: "text" },
      {
        key: "status",
        label: "Stato",
        type: "select",
        options: [
          { value: "Richiesta", label: "Richiesta" },
          { value: "In lavorazione", label: "In lavorazione" },
          { value: "Completata", label: "Completata" },
          { value: "Annullata", label: "Annullata" },
        ],
      },
      { key: "notes", label: "Note", type: "textarea" },
    ],
  },
  brt: {
    entityLabel: "Spedizione",
    entityLabelPlural: "Spedizioni BRT",
    apiPath: "/api/platform/brt",
    codePrefix: "BRT",
    columns: [
      { key: "trackingCode", label: "Tracking" },
      { key: "recipientName", label: "Destinatario" },
      { key: "status", label: "Stato", format: "status" },
    ],
    createFields: [
      { key: "recipientName", label: "Destinatario", type: "text", required: true },
      { key: "recipientAddress", label: "Indirizzo", type: "text" },
      { key: "weightKg", label: "Peso (kg)", type: "number" },
    ],
  },
  logistica: {
    entityLabel: "Pacco",
    entityLabelPlural: "Pacchi in attesa",
    apiPath: "/api/platform/logistica",
    columns: [
      { key: "senderName", label: "Mittente" },
      { key: "description", label: "Descrizione" },
      { key: "status", label: "Stato", format: "status" },
    ],
    createFields: [
      { key: "senderName", label: "Mittente", type: "text", required: true },
      { key: "description", label: "Descrizione", type: "text" },
    ],
  },
  marketing: {
    entityLabel: "Iscritto",
    entityLabelPlural: "Iscritti email",
    apiPath: "/api/platform/marketing",
    columns: [
      { key: "email", label: "Email" },
      { key: "firstName", label: "Nome" },
      { key: "status", label: "Stato", format: "status" },
    ],
    createFields: [
      { key: "email", label: "Email", type: "email", required: true },
      { key: "firstName", label: "Nome", type: "text" },
      { key: "lastName", label: "Cognome", type: "text" },
    ],
  },
  fedelta: {
    entityLabel: "Movimento punti",
    entityLabelPlural: "Movimenti fedeltà",
    apiPath: "/api/platform/fedelta",
    columns: [
      { key: "points", label: "Punti" },
      { key: "movementType", label: "Tipo" },
      { key: "description", label: "Descrizione" },
      { key: "balanceAfter", label: "Saldo" },
      { key: "movedAt", label: "Data", format: "date" },
    ],
    createFields: [
      { key: "points", label: "Punti", type: "number", required: true },
      { key: "movementType", label: "Tipo", type: "select", options: [
        { value: "accredito", label: "Accredito" },
        { value: "riscatto", label: "Riscatto" },
        { value: "rettifica", label: "Rettifica" },
      ]},
      { key: "description", label: "Descrizione", type: "text" },
      { key: "reason", label: "Motivo", type: "text" },
    ],
  },
  curriculum: {
    entityLabel: "Curriculum",
    entityLabelPlural: "Curriculum",
    apiPath: "/api/platform/curriculum",
    columns: [
      { key: "title", label: "Titolo" },
      { key: "status", label: "Stato", format: "status" },
    ],
    createFields: [
      { key: "title", label: "Titolo", type: "text", required: true },
      { key: "notes", label: "Note", type: "textarea" },
    ],
  },
  aci: {
    entityLabel: "Pratica ACI",
    entityLabelPlural: "Pratiche ACI",
    apiPath: "/api/platform/aci",
    columns: [
      { key: "practiceType", label: "Tipo" },
      { key: "plate", label: "Targa" },
      { key: "status", label: "Stato", format: "status" },
    ],
    createFields: [
      { key: "practiceType", label: "Tipo pratica", type: "text", required: true },
      { key: "plate", label: "Targa", type: "text" },
      {
        key: "status",
        label: "Stato",
        type: "select",
        options: [
          { value: "In lavorazione", label: "In lavorazione" },
          { value: "In attesa documenti", label: "In attesa documenti" },
          { value: "Completata", label: "Completata" },
          { value: "Annullata", label: "Annullata" },
        ],
      },
      { key: "notes", label: "Note", type: "textarea" },
    ],
  },
  telegrammi: {
    entityLabel: "Telegramma",
    entityLabelPlural: "Telegrammi",
    apiPath: "/api/platform/telegrammi",
    columns: [
      { key: "recipient", label: "Destinatario" },
      { key: "senderName", label: "Mittente" },
      { key: "status", label: "Stato", format: "status" },
    ],
    createFields: [
      { key: "senderName", label: "Mittente", type: "text", required: true },
      { key: "recipient", label: "Destinatario", type: "text", required: true },
      { key: "body", label: "Testo", type: "textarea", required: true },
      {
        key: "status",
        label: "Stato",
        type: "select",
        options: [
          { value: "In coda", label: "In coda" },
          { value: "Inviato", label: "Inviato" },
          { value: "Annullato", label: "Annullato" },
        ],
      },
    ],
  },
  "posta-telematica": {
    entityLabel: "Messaggio",
    entityLabelPlural: "Messaggi",
    apiPath: "/api/platform/posta-telematica",
    columns: [
      { key: "subject", label: "Oggetto" },
      { key: "recipientEmail", label: "Destinatario" },
      { key: "channel", label: "Canale" },
      { key: "status", label: "Stato", format: "status" },
    ],
    createFields: [],
  },
  express: {
    entityLabel: "Vendita Express",
    entityLabelPlural: "Vendite Express",
    apiPath: "/api/platform/express",
    columns: [
      { key: "soldAt", label: "Data", format: "date" },
      { key: "client.name", label: "Cliente" },
      { key: "total", label: "Totale", format: "currency" },
      { key: "paymentMethod", label: "Pagamento" },
      { key: "status", label: "Stato", format: "status" },
    ],
    createFields: [],
  },
  opportunities: {
    entityLabel: "Opportunità",
    entityLabelPlural: "Opportunità",
    apiPath: "/api/platform/opportunities",
    columns: [
      { key: "title", label: "Titolo" },
      { key: "client.name", label: "Cliente" },
      { key: "owner.name", label: "Owner" },
      { key: "value", label: "Valore", format: "currency" },
      { key: "commission", label: "Commissione", format: "currency" },
      { key: "status", label: "Stato", format: "status" },
      { key: "updatedAt", label: "Aggiornato", format: "date" },
    ],
    createFields: [
      { key: "title", label: "Titolo", type: "text", required: true },
      { key: "value", label: "Valore", type: "number" },
      { key: "commission", label: "Commissione", type: "number" },
      { key: "notes", label: "Note", type: "textarea" },
    ],
    listFilter: (viewId) => {
      if (viewId === "aperte") return { status: "OPEN" };
      if (viewId === "vinte") return { status: "WON" };
      if (viewId === "attesa") return { status: "ON_HOLD" };
      if (viewId === "perse") return { status: "LOST" };
      return undefined;
    },
  },
  "web-projects": {
    entityLabel: "Progetto Web",
    entityLabelPlural: "Progetti Web",
    apiPath: "/api/platform/web-projects",
    columns: [
      { key: "name", label: "Nome" },
      { key: "domain", label: "Dominio" },
      { key: "status", label: "Stato", format: "status" },
    ],
    createFields: [
      { key: "name", label: "Nome progetto", type: "text", required: true },
      { key: "domain", label: "Dominio", type: "text" },
      { key: "notes", label: "Note", type: "textarea" },
    ],
  },
};

export function getModuleDefinition(moduleKey: string) {
  return PLATFORM_MODULES[moduleKey];
}
