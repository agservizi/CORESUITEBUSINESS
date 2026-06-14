export type WebQuotePackageTier = {
  name: string;
  price: number;
  recommended?: boolean;
  features: string[];
};

export type WebQuoteMilestone = {
  phase: string;
  duration: string;
  deliverables: string;
};

export type WebQuoteItemInput = {
  id?: string;
  sortOrder?: number;
  title: string;
  description?: string;
  category?: string;
  quantity?: number;
  unitPrice?: number;
  isOptional?: boolean;
  isPremium?: boolean;
};

export type WebQuoteInput = {
  title: string;
  clientId: string;
  projectType?: string;
  validUntil?: string | null;
  introduction?: string;
  scopeNotes?: string;
  terms?: string;
  paymentPlan?: string;
  discountPercent?: number;
  taxPercent?: number;
  templateStyle?: string;
  accentColor?: string;
  showBranding?: boolean;
  includeTimeline?: boolean;
  includePackages?: boolean;
  packages?: WebQuotePackageTier[];
  milestones?: WebQuoteMilestone[];
  status?: string;
  items?: WebQuoteItemInput[];
};

export const WEB_QUOTE_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Bozza",
  SENT: "Inviato",
  ACCEPTED: "Accettato",
  REJECTED: "Rifiutato",
  EXPIRED: "Scaduto",
};

export const WEB_QUOTE_STATUS_COLORS: Record<string, string> = {
  DRAFT: "#64748b",
  SENT: "#0ea5e9",
  ACCEPTED: "#10b981",
  REJECTED: "#ef4444",
  EXPIRED: "#f59e0b",
};

export const WEB_PROJECT_TYPES: { value: string; label: string }[] = [
  { value: "website", label: "Sito web vetrina" },
  { value: "ecommerce", label: "E-commerce" },
  { value: "landing", label: "Landing page" },
  { value: "webapp", label: "Web app su misura" },
  { value: "branding", label: "Brand identity + web" },
  { value: "maintenance", label: "Manutenzione & growth" },
];

export const WEB_QUOTE_CATEGORIES = [
  "Design UX/UI",
  "Sviluppo",
  "SEO & Performance",
  "Content",
  "Hosting",
  "Marketing",
  "Consulenza",
];

export type WebQuoteTemplate = {
  title: string;
  introduction: string;
  scopeNotes?: string;
  paymentPlan?: string;
  milestones?: WebQuoteMilestone[];
  items: WebQuoteItemInput[];
};

export const WEB_QUOTE_TEMPLATES: Record<string, WebQuoteTemplate> = {
  website: {
    title: "Sito web professionale",
    introduction:
      "Proposta commerciale per la realizzazione di un sito web moderno, performante e orientato alla conversione, con design su misura e stack tecnologico aggiornato.",
    scopeNotes:
      "Include design responsive, CMS per autonomia sui contenuti, SEO tecnico di base e messa online su hosting concordato.",
    items: [
      { title: "Discovery & UX strategy", category: "Consulenza", quantity: 1, unitPrice: 450, isPremium: true },
      { title: "UI design responsive (fino a 8 sezioni)", category: "Design UX/UI", quantity: 1, unitPrice: 1800 },
      { title: "Sviluppo frontend + CMS", category: "Sviluppo", quantity: 1, unitPrice: 2400 },
      { title: "SEO tecnico di base", category: "SEO & Performance", quantity: 1, unitPrice: 650 },
      { title: "Setup hosting & SSL (1 anno)", category: "Hosting", quantity: 1, unitPrice: 280 },
    ],
  },
  ecommerce: {
    title: "E-commerce su misura",
    introduction:
      "Soluzione e-commerce completa con catalogo, checkout ottimizzato, integrazioni pagamento e dashboard di gestione ordini.",
    scopeNotes:
      "Catalogo iniziale fino a 100 SKU, gateway pagamento italiano, gestione spedizioni base. Migration dati legacy quotata a parte.",
    paymentPlan: "40% all'ordine · 35% a staging · 25% go-live",
    items: [
      { title: "Analisi flussi vendita & UX shop", category: "Consulenza", quantity: 1, unitPrice: 750, isPremium: true },
      { title: "Design shop & checkout", category: "Design UX/UI", quantity: 1, unitPrice: 2600 },
      { title: "Sviluppo catalogo + carrello", category: "Sviluppo", quantity: 1, unitPrice: 4200 },
      { title: "Integrazione pagamenti & spedizioni", category: "Sviluppo", quantity: 1, unitPrice: 980 },
      { title: "SEO prodotti + analytics", category: "SEO & Performance", quantity: 1, unitPrice: 890 },
    ],
  },
  landing: {
    title: "Landing ad alta conversione",
    introduction:
      "Landing page premium con copy persuasivo, animazioni leggere e tracciamento conversioni per campagne marketing.",
    scopeNotes:
      "Include 1 landing responsive, fino a 2 varianti hero per test A/B e integrazione form/CRM concordata. Copy definitivo fornito o redatto come extra.",
    items: [
      { title: "Workshop messaging & CTA", category: "Consulenza", quantity: 1, unitPrice: 380 },
      { title: "Design landing + varianti A/B", category: "Design UX/UI", quantity: 1, unitPrice: 1200, isPremium: true },
      { title: "Sviluppo + integrazione CRM/form", category: "Sviluppo", quantity: 1, unitPrice: 950 },
      { title: "Setup tracking & heatmap", category: "Marketing", quantity: 1, unitPrice: 320 },
    ],
  },
  webapp: {
    title: "Web app su misura",
    introduction:
      "Proposta per lo sviluppo di un'applicazione web custom con architettura scalabile, area riservata, dashboard e integrazioni API.",
    scopeNotes:
      "Stack concordato in fase di discovery. Include ambienti staging/produzione, documentazione tecnica base e handover al team cliente.",
    paymentPlan: "30% kick-off · 40% milestone MVP · 30% go-live",
    milestones: [
      { phase: "Discovery & architettura", duration: "Settimane 1-2", deliverables: "User story, wireframe, piano sprint" },
      { phase: "MVP funzionale", duration: "Settimane 3-8", deliverables: "Core feature, auth, API integrate" },
      { phase: "Hardening & QA", duration: "Settimane 9-10", deliverables: "Test, performance, security review" },
      { phase: "Deploy & formazione", duration: "Settimana 11", deliverables: "Go-live, training, runbook" },
    ],
    items: [
      { title: "Product discovery & user flow", category: "Consulenza", quantity: 1, unitPrice: 980, isPremium: true },
      { title: "UX/UI design app & dashboard", category: "Design UX/UI", quantity: 1, unitPrice: 3200 },
      { title: "Backend API & database", category: "Sviluppo", quantity: 1, unitPrice: 5400 },
      { title: "Frontend SPA + autenticazione", category: "Sviluppo", quantity: 1, unitPrice: 4800 },
      { title: "Integrazioni terze parti", category: "Sviluppo", quantity: 1, unitPrice: 1200 },
      { title: "QA, deploy & documentazione", category: "Consulenza", quantity: 1, unitPrice: 890 },
    ],
  },
  branding: {
    title: "Brand identity & presenza web",
    introduction:
      "Percorso completo di brand identity digitale: strategia, logo, guideline e sito vetrina coerente con il nuovo posizionamento.",
    scopeNotes:
      "Include fino a 3 proposte logo, brand book PDF, palette tipografia e mini-sito vetrina (fino a 5 sezioni).",
    paymentPlan: "50% avvio progetto · 50% consegna asset finali",
    milestones: [
      { phase: "Brand strategy", duration: "Settimana 1", deliverables: "Moodboard, tone of voice, direzione creativa" },
      { phase: "Identità visiva", duration: "Settimane 2-3", deliverables: "Logo, palette, typography kit" },
      { phase: "Brand guidelines", duration: "Settimana 4", deliverables: "Manuale d'uso, asset social base" },
      { phase: "Sito vetrina brand", duration: "Settimane 5-7", deliverables: "Design + sviluppo sito coerente" },
    ],
    items: [
      { title: "Workshop brand & posizionamento", category: "Consulenza", quantity: 1, unitPrice: 650, isPremium: true },
      { title: "Logo design + varianti", category: "Design UX/UI", quantity: 1, unitPrice: 1400 },
      { title: "Brand guidelines & asset kit", category: "Design UX/UI", quantity: 1, unitPrice: 980 },
      { title: "Copy tone of voice & payoff", category: "Content", quantity: 1, unitPrice: 420 },
      { title: "Sito vetrina brand (fino a 5 sezioni)", category: "Sviluppo", quantity: 1, unitPrice: 2200 },
      { title: "Social profile kit", category: "Marketing", quantity: 1, unitPrice: 380, isOptional: true },
    ],
  },
  maintenance: {
    title: "Piano manutenzione & growth",
    introduction:
      "Servizio ricorrente di manutenzione evolutiva, monitoraggio performance/SEO e supporto prioritario per il tuo ecosistema digitale.",
    scopeNotes:
      "Canone annuale prepagato o fatturazione trimestrale. Interventi extra fuori pacchetto ore concordati a consuntivo.",
    paymentPlan: "Fatturazione trimestrale anticipata · rinnovo tacito annuale",
    milestones: [
      { phase: "Onboarding tecnico", duration: "Settimana 1", deliverables: "Audit stack, backup, accessi, SLA" },
      { phase: "Ciclo operativo Q1", duration: "Mesi 1-3", deliverables: "Update, report performance, ticket supporto" },
      { phase: "Ciclo operativo Q2", duration: "Mesi 4-6", deliverables: "Ottimizzazioni, SEO check, mini-evolutive" },
      { phase: "Review annuale", duration: "Mese 12", deliverables: "Report annuale, roadmap growth" },
    ],
    items: [
      { title: "Manutenzione tecnica & security patch", category: "Sviluppo", quantity: 12, unitPrice: 180 },
      { title: "Monitoraggio uptime & backup", category: "Hosting", quantity: 12, unitPrice: 45 },
      { title: "Aggiornamenti contenuti (pacchetto ore)", category: "Content", quantity: 1, unitPrice: 960 },
      { title: "Report SEO & performance mensile", category: "SEO & Performance", quantity: 12, unitPrice: 90 },
      { title: "Supporto prioritario (SLA 24h)", category: "Consulenza", quantity: 12, unitPrice: 120, isPremium: true },
      { title: "Sessione strategia growth trimestrale", category: "Marketing", quantity: 4, unitPrice: 250, isOptional: true },
    ],
  },
};

export const DEFAULT_PACKAGES: WebQuotePackageTier[] = [
  {
    name: "Essential",
    price: 2490,
    features: ["Design responsive", "Fino a 5 pagine", "CMS base", "SEO starter", "30 gg assistenza"],
  },
  {
    name: "Growth",
    price: 4490,
    recommended: true,
    features: ["Design premium", "Fino a 12 pagine", "CMS avanzato", "SEO + analytics", "90 gg assistenza", "Copywriting base"],
  },
  {
    name: "Scale",
    price: 7900,
    features: ["Design su misura", "Pagine illimitate", "Integrazioni custom", "CRO & A/B test", "6 mesi assistenza", "Account dedicato"],
  },
];

export const DEFAULT_MILESTONES: WebQuoteMilestone[] = [
  { phase: "Kick-off & discovery", duration: "Settimana 1", deliverables: "Brief, wireframe, piano contenuti" },
  { phase: "Design & prototipo", duration: "Settimane 2-3", deliverables: "UI kit, mockup approvati" },
  { phase: "Sviluppo & QA", duration: "Settimane 4-6", deliverables: "Staging, test cross-browser" },
  { phase: "Go-live & handover", duration: "Settimana 7", deliverables: "Deploy, formazione, documentazione" },
];

export const DEFAULT_TERMS =
  "Validità offerta 30 giorni. Prezzi IVA esclusa salvo diversa indicazione. Acconto 40% all'ordine, saldo a consegna. Eventuali extra fuori scope concordati per iscritto.";
