import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";
import { PLATFORM_SERVICES } from "../src/config/platform-services";

async function main() {
  const hashedPassword = await bcrypt.hash("admin123", 12);
  const patronatoPassword = await bcrypt.hash("patronato123", 12);
  const clientePassword = await bcrypt.hash("cliente123", 12);
  const operatorePassword = await bcrypt.hash("operatore123", 12);
  const managerPassword = await bcrypt.hash("manager123", 12);
  const collabPassword = await bcrypt.hash("collab123", 12);

  const client = await prisma.client.upsert({
    where: { id: "seed-client-demo" },
    update: {},
    create: {
      id: "seed-client-demo",
      name: "Mario Rossi",
      companyName: "Rossi S.r.l.",
      email: "cliente@example.it",
      phone: "+39 333 1234567",
      type: "INDIVIDUAL",
      status: "ACTIVE",
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@coresuite.it" },
    update: { role: "SUPER_ADMIN" },
    create: {
      email: "admin@coresuite.it",
      name: "Admin Coresuite",
      password: hashedPassword,
      role: "SUPER_ADMIN",
    },
  });

  await prisma.user.upsert({
    where: { email: "manager@coresuite.it" },
    update: {},
    create: {
      email: "manager@coresuite.it",
      name: "Manager Demo",
      password: managerPassword,
      role: "MANAGER",
    },
  });

  await prisma.user.upsert({
    where: { email: "operatore@coresuite.it" },
    update: {},
    create: {
      email: "operatore@coresuite.it",
      name: "Operatore Demo",
      password: operatorePassword,
      role: "OPERATORE",
    },
  });

  await prisma.user.upsert({
    where: { email: "patronato@coresuite.it" },
    update: {},
    create: {
      email: "patronato@coresuite.it",
      name: "Operatore Patronato",
      password: patronatoPassword,
      role: "PATRONATO",
    },
  });

  await prisma.user.upsert({
    where: { email: "collaboratore@coresuite.it" },
    update: {},
    create: {
      email: "collaboratore@coresuite.it",
      name: "Collaboratore Demo",
      password: collabPassword,
      role: "COLLABORATORE",
    },
  });

  const collaboratore = await prisma.user.findUniqueOrThrow({
    where: { email: "collaboratore@coresuite.it" },
  });

  await prisma.user.upsert({
    where: { email: "cliente@example.it" },
    update: { clientId: client.id },
    create: {
      email: "cliente@example.it",
      name: "Mario Rossi",
      password: clientePassword,
      role: "CLIENTE",
      clientId: client.id,
    },
  });

  console.log("✅ Utenti creati:", admin.email);

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

  await prisma.priceListItem.createMany({
    data: [
      { code: "VIS-CAM", name: "Visura camerale", category: "Visure", resellerCost: 5, clientPrice: 15, margin: 10 },
      { code: "CAF-730", name: "Dichiarazione 730", category: "CAF", resellerCost: 8, clientPrice: 35, margin: 27 },
      { code: "SPED-BRT", name: "Spedizione BRT", category: "Logistica", resellerCost: 4.5, clientPrice: 9.9, margin: 5.4 },
    ],
    skipDuplicates: true,
  });

  await prisma.emailTemplate.createMany({
    data: [
      {
        name: "Benvenuto",
        subject: "Benvenuto in AG Servizi",
        htmlBody: "<h1>Benvenuto</h1><p>Grazie per esserti registrato.</p>",
      },
    ],
    skipDuplicates: true,
  });

  await prisma.ticket.createMany({
    data: [
      {
        code: "TK-DEMO01",
        clientId: client.id,
        subject: "Richiesta informazioni servizio energia",
        customerName: client.name,
        customerEmail: client.email,
        type: "SUPPORT",
        priority: "MEDIUM",
        status: "OPEN",
        channel: "PORTAL",
        slaDueAt: new Date(Date.now() + 48 * 3600000),
      },
      {
        code: "TK-DEMO02",
        clientId: client.id,
        subject: "Problema accesso portale",
        customerName: client.name,
        customerEmail: client.email,
        type: "TECH",
        priority: "HIGH",
        status: "IN_PROGRESS",
        channel: "EMAIL",
        slaDueAt: new Date(Date.now() + 24 * 3600000),
      },
    ],
    skipDuplicates: true,
  });

  await prisma.appointment.createMany({
    data: [
      {
        clientId: client.id,
        title: "Consulenza CAF",
        serviceType: "CAF",
        startsAt: new Date(Date.now() + 86400000),
        status: "Programmato",
      },
    ],
    skipDuplicates: true,
  });

  await prisma.practice.createMany({
    data: [
      {
        code: "PR-DEMO01",
        clientId: client.id,
        category: "CAF",
        practiceType: "730/2025",
        status: "IN_LAVORAZIONE",
        year: 2025,
      },
    ],
    skipDuplicates: true,
  });

  await prisma.cashMovement.createMany({
    data: [
      {
        clientId: client.id,
        type: "ENTRATA",
        description: "Incasso visura camerale",
        amount: 15,
        quantity: 1,
        unitPrice: 15,
        status: "Completato",
        paidAt: new Date(),
      },
    ],
    skipDuplicates: true,
  });

  await prisma.notification.deleteMany({ where: { userId: admin.id } });
  await prisma.notification.createMany({
    data: [
      {
        userId: admin.id,
        title: "Ticket ad alta priorità",
        body: "TK-DEMO02 richiede attenzione — SLA in scadenza entro 24h.",
        type: "warning",
        link: "/services/tickets",
      },
      {
        userId: admin.id,
        title: "Nuova pratica CAF",
        body: "PR-DEMO01 è in lavorazione. Verifica documenti mancanti.",
        type: "info",
        link: "/services/pratiche",
      },
      {
        userId: admin.id,
        title: "Incasso registrato",
        body: "€15,00 da Rossi S.r.l. — visura camerale completata.",
        type: "success",
        read: true,
        link: "/services/cassa",
      },
      {
        userId: admin.id,
        title: "Appuntamento domani",
        body: "Consulenza CAF con Mario Rossi alle 10:00.",
        type: "info",
        link: "/services/appuntamenti",
      },
    ],
  });

  console.log("✅ Dati demo creati");

  await seedCrm(admin.id, client.id);
  await seedOpportunities(admin.id, collaboratore.id, client.id);
}

async function seedCrm(adminId: string, primaryClientId: string) {
  const pipeline = await prisma.pipeline.upsert({
    where: { id: "default-pipeline" },
    update: {},
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

  const stages = await prisma.pipelineStage.findMany({
    where: { pipelineId: pipeline.id },
    orderBy: { order: "asc" },
  });

  await prisma.client.upsert({
    where: { id: "client-crm-2" },
    update: {},
    create: {
      id: "client-crm-2",
      name: "Giulia Bianchi",
      companyName: "Studio Bianchi",
      email: "g.bianchi@studiobianchi.it",
      phone: "+39 06 9876543",
      city: "Roma",
      type: "FREELANCE",
      status: "PROSPECT",
      tags: ["design"],
    },
  });

  await prisma.client.upsert({
    where: { id: "client-crm-3" },
    update: {},
    create: {
      id: "client-crm-3",
      name: "Tech Innovate SpA",
      companyName: "Tech Innovate SpA",
      email: "info@techinnovate.it",
      phone: "+39 011 5556789",
      city: "Torino",
      type: "COMPANY",
      status: "ACTIVE",
      tags: ["enterprise", "tech"],
    },
  });

  await prisma.lead.upsert({
    where: { id: "lead-crm-1" },
    update: {},
    create: {
      id: "lead-crm-1",
      title: "Sito web corporate + SEO",
      clientId: primaryClientId,
      contactName: "Mario Rossi",
      contactEmail: "cliente@example.it",
      source: "REFERRAL",
      status: "QUALIFIED",
      priority: "HIGH",
      value: 8500,
      assigneeId: adminId,
      pipelineId: pipeline.id,
      stageId: stages[2]?.id,
      expectedClose: new Date(Date.now() + 30 * 86400000),
    },
  });

  await prisma.lead.upsert({
    where: { id: "lead-crm-2" },
    update: {},
    create: {
      id: "lead-crm-2",
      title: "Brand identity + Logo",
      clientId: "client-crm-2",
      contactName: "Giulia Bianchi",
      contactEmail: "g.bianchi@studiobianchi.it",
      source: "WEBSITE",
      status: "NEW",
      priority: "MEDIUM",
      value: 3200,
      assigneeId: adminId,
      pipelineId: pipeline.id,
      stageId: stages[0]?.id,
      expectedClose: new Date(Date.now() + 45 * 86400000),
    },
  });

  await prisma.lead.upsert({
    where: { id: "lead-crm-3" },
    update: {},
    create: {
      id: "lead-crm-3",
      title: "App mobile e-commerce",
      clientId: "client-crm-3",
      contactName: "Luca Neri",
      contactEmail: "l.neri@techinnovate.it",
      source: "EVENT",
      status: "PROPOSAL",
      priority: "URGENT",
      value: 45000,
      assigneeId: adminId,
      pipelineId: pipeline.id,
      stageId: stages[3]?.id,
      expectedClose: new Date(Date.now() + 15 * 86400000),
    },
  });

  await prisma.deal.upsert({
    where: { id: "deal-crm-1" },
    update: {},
    create: {
      id: "deal-crm-1",
      title: "Contratto manutenzione annuale",
      clientId: primaryClientId,
      value: 12000,
      status: "WON",
      probability: 100,
      closedAt: new Date(Date.now() - 20 * 86400000),
    },
  });

  await prisma.deal.upsert({
    where: { id: "deal-crm-2" },
    update: {},
    create: {
      id: "deal-crm-2",
      title: "Progetto piattaforma B2B",
      clientId: "client-crm-3",
      value: 28000,
      status: "OPEN",
      probability: 65,
      expectedClose: new Date(Date.now() + 21 * 86400000),
    },
  });

  await prisma.activity.createMany({
    data: [
      {
        type: "CALL",
        title: "Follow-up proposta SEO",
        clientId: primaryClientId,
        authorId: adminId,
        dueAt: new Date(Date.now() + 2 * 86400000),
      },
      {
        type: "MEETING",
        title: "Demo prodotto Tech Innovate",
        clientId: "client-crm-3",
        authorId: adminId,
        dueAt: new Date(Date.now() + 5 * 86400000),
      },
    ],
    skipDuplicates: true,
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: adminId,
        title: "Nuovo lead qualificato",
        body: "Sito web corporate + SEO — €8.500 in pipeline.",
        type: "info",
        link: "/business?v=lead&id=lead-crm-1",
      },
      {
        userId: adminId,
        title: "Deal vinto",
        body: "Contratto manutenzione annuale chiuso per €12.000.",
        type: "success",
        link: "/business?v=deals&id=deal-crm-1",
      },
    ],
  });

  console.log("✅ CRM Business: pipeline, lead, deal e attività demo");
}

async function seedOpportunities(
  adminId: string,
  collaboratoreId: string,
  _primaryClientId: string,
) {
  await prisma.collaboratorCustomer.upsert({
    where: {
      collaboratorId_clientId: { collaboratorId: collaboratoreId, clientId: "seed-client-demo" },
    },
    update: {},
    create: { collaboratorId: collaboratoreId, clientId: "seed-client-demo" },
  });

  await prisma.collaboratorCustomer.upsert({
    where: {
      collaboratorId_clientId: { collaboratorId: collaboratoreId, clientId: "client-crm-2" },
    },
    update: {},
    create: { collaboratorId: collaboratoreId, clientId: "client-crm-2" },
  });

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

  const tim = await prisma.opportunityProvider.upsert({
    where: { category_slug: { category: "TELEFONIA", slug: "tim" } },
    update: {},
    create: {
      category: "TELEFONIA",
      name: "TIM",
      slug: "tim",
      ordering: 1,
      defaultCommission: 45,
    },
  });
  const timOffer = await prisma.opportunityOffer.upsert({
    where: { providerId_slug: { providerId: tim.id, slug: "mobile-unlimited" } },
    update: {},
    create: {
      providerId: tim.id,
      name: "Mobile Unlimited",
      slug: "mobile-unlimited",
      commission: 55,
      ordering: 1,
    },
  });

  const enelLuce = await prisma.opportunityProvider.upsert({
    where: { category_slug: { category: "LUCE", slug: "enel-energia" } },
    update: {},
    create: {
      category: "LUCE",
      name: "Enel Energia",
      slug: "enel-energia",
      ordering: 1,
      defaultCommission: 80,
    },
  });

  const eniGas = await prisma.opportunityProvider.upsert({
    where: { category_slug: { category: "GAS", slug: "eni-plenitude" } },
    update: {},
    create: {
      category: "GAS",
      name: "Eni Plenitude",
      slug: "eni-plenitude",
      ordering: 1,
      defaultCommission: 70,
    },
  });

  const demoContracts = [
    {
      id: "opp-contract-1",
      code: "OPDEMO0001",
      category: "TELEFONIA" as const,
      statusCode: "in_verifica",
      providerId: tim.id,
      offerId: timOffer.id,
      providerLabel: "TIM",
      offerLabel: "Mobile Unlimited",
      collaboratorId: collaboratoreId,
      commissionAmount: 55,
      customerFirstName: "Mario",
      customerLastName: "Rossi",
      customerTaxCode: "RSSMRA80A01H501U",
      customerPhone: "+39 333 1234567",
      customerEmail: "cliente@example.it",
      telefoniaCurrentOperator: "Vodafone",
      telefoniaLineNumber: "3331234567",
      metadata: { telefonia_contract_type: "migrazione", telefonia_migration_code: "MIG123456" },
    },
    {
      id: "opp-contract-2",
      code: "OPDEMO0002",
      category: "LUCE" as const,
      statusCode: "documenti_ok",
      providerId: enelLuce.id,
      providerLabel: "Enel Energia",
      collaboratorId: collaboratoreId,
      managedById: adminId,
      commissionAmount: 80,
      customerFirstName: "Giulia",
      customerLastName: "Bianchi",
      customerTaxCode: "BNCGLI85C45H501X",
      customerPhone: "+39 06 9876543",
      customerEmail: "g.bianchi@studiobianchi.it",
      lucePod: "IT001E12345678",
      metadata: { luce_power_kw: "3", luce_supply_address: "Via Roma 10", luce_supply_city: "Roma" },
    },
    {
      id: "opp-contract-3",
      code: "OPDEMO0003",
      category: "GAS" as const,
      statusCode: "in_firma_otp",
      providerId: eniGas.id,
      providerLabel: "Eni Plenitude",
      collaboratorId: collaboratoreId,
      commissionAmount: 70,
      customerFirstName: "Luca",
      customerLastName: "Neri",
      customerTaxCode: "NRELCU90D12F205Z",
      customerPhone: "+39 011 5556789",
      customerEmail: "l.neri@techinnovate.it",
      gasPdr: "12345678901234",
    },
    {
      id: "opp-contract-4",
      code: "OPDEMO0004",
      category: "TELEFONIA" as const,
      statusCode: "attivato",
      providerId: tim.id,
      providerLabel: "TIM",
      collaboratorId: collaboratoreId,
      managedById: adminId,
      commissionAmount: 45,
      contractCode: "TIM-2026-001",
      customerFirstName: "Anna",
      customerLastName: "Verdi",
      customerTaxCode: "VRDNNA75E45H501Y",
      customerPhone: "+39 340 1112233",
      customerEmail: "anna.verdi@email.it",
      telefoniaLineNumber: "3401112233",
      lastStatusChange: new Date(Date.now() - 5 * 86400000),
    },
  ];

  for (const c of demoContracts) {
    await prisma.opportunity.upsert({
      where: { id: c.id },
      update: {},
      create: c,
    });
  }

  console.log("✅ Contratti opportunity demo (telefonia/luce/gas)");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
