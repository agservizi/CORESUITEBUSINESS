import { PrismaClient } from "../src/generated/prisma/index.js";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // Pipeline default
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
  console.log("✅ Pipeline creata:", pipeline.name);

  // Clienti demo
  const clients = await Promise.all([
    prisma.client.upsert({
      where: { id: "client-1" },
      update: {},
      create: {
        id: "client-1",
        name: "Mario Rossi",
        companyName: "Rossi & Partners Srl",
        email: "mario.rossi@example.com",
        phone: "+39 02 1234567",
        website: "https://rossipartners.it",
        city: "Milano",
        type: "COMPANY",
        status: "ACTIVE",
        tags: ["premium", "tech"],
      },
    }),
    prisma.client.upsert({
      where: { id: "client-2" },
      update: {},
      create: {
        id: "client-2",
        name: "Giulia Bianchi",
        companyName: "Studio Bianchi",
        email: "g.bianchi@studiobianchi.it",
        phone: "+39 06 9876543",
        city: "Roma",
        type: "FREELANCE",
        status: "PROSPECT",
        tags: ["design"],
      },
    }),
    prisma.client.upsert({
      where: { id: "client-3" },
      update: {},
      create: {
        id: "client-3",
        name: "Tech Innovate SpA",
        companyName: "Tech Innovate SpA",
        email: "info@techinnovate.it",
        phone: "+39 011 5556789",
        website: "https://techinnovate.it",
        city: "Torino",
        type: "COMPANY",
        status: "ACTIVE",
        tags: ["enterprise", "tech", "priority"],
      },
    }),
    prisma.client.upsert({
      where: { id: "client-4" },
      update: {},
      create: {
        id: "client-4",
        name: "Laura Verdi",
        companyName: "Verdi Consulting",
        email: "laura@verdiconsulting.com",
        phone: "+39 055 1112233",
        city: "Firenze",
        type: "COMPANY",
        status: "ACTIVE",
        tags: ["consulting"],
      },
    }),
  ]);
  console.log(`✅ ${clients.length} clienti creati`);

  // Stages
  const stages = await prisma.pipelineStage.findMany({
    where: { pipelineId: "default-pipeline" },
    orderBy: { order: "asc" },
  });

  const admin = await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" } });

  // Lead demo
  const leads = await Promise.all([
    prisma.lead.upsert({
      where: { id: "lead-1" },
      update: {},
      create: {
        id: "lead-1",
        title: "Sito web corporate + SEO",
        clientId: "client-1",
        contactName: "Mario Rossi",
        contactEmail: "mario.rossi@example.com",
        source: "REFERRAL",
        status: "QUALIFIED",
        priority: "HIGH",
        value: 8500,
        assigneeId: admin?.id,
        pipelineId: "default-pipeline",
        stageId: stages[2]?.id,
        expectedClose: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.lead.upsert({
      where: { id: "lead-2" },
      update: {},
      create: {
        id: "lead-2",
        title: "Brand identity + Logo",
        clientId: "client-2",
        contactName: "Giulia Bianchi",
        contactEmail: "g.bianchi@studiobianchi.it",
        source: "WEBSITE",
        status: "NEW",
        priority: "MEDIUM",
        value: 3200,
        assigneeId: admin?.id,
        pipelineId: "default-pipeline",
        stageId: stages[0]?.id,
        expectedClose: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.lead.upsert({
      where: { id: "lead-3" },
      update: {},
      create: {
        id: "lead-3",
        title: "App mobile e-commerce",
        clientId: "client-3",
        contactName: "Luca Neri",
        contactEmail: "l.neri@techinnovate.it",
        source: "EVENT",
        status: "PROPOSAL",
        priority: "URGENT",
        value: 45000,
        assigneeId: admin?.id,
        pipelineId: "default-pipeline",
        stageId: stages[3]?.id,
        expectedClose: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.lead.upsert({
      where: { id: "lead-4" },
      update: {},
      create: {
        id: "lead-4",
        title: "Consulenza strategia digitale",
        clientId: "client-4",
        contactName: "Laura Verdi",
        contactEmail: "laura@verdiconsulting.com",
        source: "REFERRAL",
        status: "NEGOTIATION",
        priority: "HIGH",
        value: 12000,
        assigneeId: admin?.id,
        pipelineId: "default-pipeline",
        stageId: stages[4]?.id,
        expectedClose: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    }),
  ]);
  console.log(`✅ ${leads.length} lead creati`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
