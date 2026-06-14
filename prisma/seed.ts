import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";
import { PLATFORM_SERVICES } from "../src/config/platform-services";

/** ID/codici creati dal seed demo legacy — rimossi al run per DB puliti. */
const LEGACY = {
  clientIds: [
    "seed-client-demo",
    "client-crm-2",
    "client-crm-3",
    "client-1",
    "client-2",
    "client-3",
    "client-4",
  ],
  leadIds: [
    "lead-crm-1",
    "lead-crm-2",
    "lead-crm-3",
    "lead-1",
    "lead-2",
    "lead-3",
    "lead-4",
  ],
  dealIds: ["deal-crm-1", "deal-crm-2"],
  opportunityIds: ["opp-contract-1", "opp-contract-2", "opp-contract-3", "opp-contract-4"],
  ticketCodes: ["TK-DEMO01", "TK-DEMO02"],
  practiceCodes: ["PR-DEMO01"],
  userEmails: [
    "manager@coresuite.it",
    "operatore@coresuite.it",
    "patronato@coresuite.it",
    "collaboratore@coresuite.it",
    "cliente@example.it",
  ],
  notificationTitles: [
    "Ticket ad alta priorità",
    "Nuova pratica CAF",
    "Incasso registrato",
    "Appuntamento domani",
    "Nuovo lead qualificato",
    "Deal vinto",
  ],
  priceListCodes: ["VIS-CAM", "CAF-730", "SPED-BRT"],
  expressCampaignNames: ["Benvenuto 5€", "Promo 10%"],
  loyaltyRewardNames: ["Caffè omaggio", "Sconto 10% servizio", "Pratica prioritaria"],
} as const;

async function purgeLegacyDemoData() {
  await prisma.notification.deleteMany({
    where: { title: { in: [...LEGACY.notificationTitles] } },
  });

  await prisma.opportunity.deleteMany({ where: { id: { in: [...LEGACY.opportunityIds] } } });
  await prisma.activity.deleteMany({ where: { clientId: { in: [...LEGACY.clientIds] } } });
  await prisma.lead.deleteMany({ where: { id: { in: [...LEGACY.leadIds] } } });
  await prisma.deal.deleteMany({ where: { id: { in: [...LEGACY.dealIds] } } });
  await prisma.ticket.deleteMany({ where: { code: { in: [...LEGACY.ticketCodes] } } });
  await prisma.appointment.deleteMany({ where: { clientId: { in: [...LEGACY.clientIds] } } });
  await prisma.practice.deleteMany({ where: { code: { in: [...LEGACY.practiceCodes] } } });
  await prisma.cashMovement.deleteMany({ where: { clientId: { in: [...LEGACY.clientIds] } } });
  await prisma.loyaltyPoint.deleteMany({ where: { clientId: { in: [...LEGACY.clientIds] } } });
  await prisma.collaboratorCustomer.deleteMany({ where: { clientId: { in: [...LEGACY.clientIds] } } });
  await prisma.user.deleteMany({ where: { email: { in: [...LEGACY.userEmails] } } });
  await prisma.client.deleteMany({ where: { id: { in: [...LEGACY.clientIds] } } });

  await prisma.pecInboxMessage.deleteMany({ where: { uid: { startsWith: "demo-" } } });
  await prisma.priceListItem.deleteMany({ where: { code: { in: [...LEGACY.priceListCodes] } } });
  await prisma.emailTemplate.deleteMany({
    where: {
      name: "Benvenuto",
      subject: "Benvenuto in AG Servizi",
    },
  });
  await prisma.expressDiscountCampaign.deleteMany({
    where: { name: { in: [...LEGACY.expressCampaignNames] } },
  });
  await prisma.loyaltyReward.deleteMany({
    where: { name: { in: [...LEGACY.loyaltyRewardNames] } },
  });

  console.log("🧹 Dati demo legacy rimossi (se presenti)");
}

async function seedBootstrapAdmin() {
  const existing = await prisma.user.count();
  if (existing > 0) {
    console.log("ℹ️  Utenti già presenti — skip admin bootstrap");
    return;
  }

  const email = process.env.SEED_ADMIN_EMAIL?.trim() || "admin@coresuite.it";
  const password = process.env.SEED_ADMIN_PASSWORD || "admin123";
  const hashedPassword = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: {
      email,
      name: process.env.SEED_ADMIN_NAME?.trim() || "Amministratore",
      password: hashedPassword,
      role: "SUPER_ADMIN",
    },
  });

  console.log(`✅ Admin iniziale creato: ${email}`);
}

async function seedPlatformServices() {
  for (const [i, svc] of PLATFORM_SERVICES.entries()) {
    await prisma.service.upsert({
      where: { slug: svc.slug },
      update: { name: svc.name, color: svc.color, order: i + 1 },
      create: {
        slug: svc.slug,
        name: svc.name,
        color: svc.color,
        order: i + 1,
      },
    });
  }
  console.log("✅ Servizi piattaforma registrati");
}

async function seedDefaultPipeline() {
  const pipeline = await prisma.pipeline.upsert({
    where: { id: "default-pipeline" },
    update: { name: "Pipeline Vendite", isDefault: true },
    create: {
      id: "default-pipeline",
      name: "Pipeline Vendite",
      isDefault: true,
      stages: {
        create: [
          { name: "Nuovo Lead", order: 1, color: "#6366f1" },
          { name: "Contattato", order: 2, color: "#0ea5e9" },
          { name: "Qualificato", order: 3, color: "#f59e0b" },
          { name: "Proposta Inviata", order: 4, color: "#8b5cf6" },
          { name: "Negoziazione", order: 5, color: "#ec4899" },
          { name: "Chiuso Vinto", order: 6, color: "#10b981" },
        ],
      },
    },
  });

  const stageCount = await prisma.pipelineStage.count({ where: { pipelineId: pipeline.id } });
  if (stageCount === 0) {
    await prisma.pipelineStage.createMany({
      data: [
        { pipelineId: pipeline.id, name: "Nuovo Lead", order: 1, color: "#6366f1" },
        { pipelineId: pipeline.id, name: "Contattato", order: 2, color: "#0ea5e9" },
        { pipelineId: pipeline.id, name: "Qualificato", order: 3, color: "#f59e0b" },
        { pipelineId: pipeline.id, name: "Proposta Inviata", order: 4, color: "#8b5cf6" },
        { pipelineId: pipeline.id, name: "Negoziazione", order: 5, color: "#ec4899" },
        { pipelineId: pipeline.id, name: "Chiuso Vinto", order: 6, color: "#10b981" },
      ],
    });
  }

  console.log("✅ Pipeline CRM di default");
}

async function seedOpportunityStatuses() {
  const statuses = [
    { code: "in_verifica", label: "In verifica", color: "#f59e0b", ordering: 10 },
    { code: "documenti_ok", label: "Documenti ok", color: "#0ea5e9", ordering: 20 },
    { code: "in_firma_otp", label: "In firma OTP", color: "#6366f1", ordering: 30 },
    { code: "annullato", label: "Annullato", color: "#ef4444", ordering: 40 },
    { code: "attivato", label: "Attivato", color: "#10b981", ordering: 50 },
  ];

  for (const s of statuses) {
    await prisma.opportunityStatusDef.upsert({
      where: { code: s.code },
      update: { label: s.label, color: s.color, ordering: s.ordering },
      create: s,
    });
  }

  console.log("✅ Stati opportunity (catalogo)");
}

async function main() {
  await purgeLegacyDemoData();
  await seedBootstrapAdmin();
  await seedPlatformServices();
  await seedDefaultPipeline();
  await seedOpportunityStatuses();
  console.log("✅ Seed completato — solo configurazione di sistema, nessun dato mock");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
