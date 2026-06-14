import { PrismaClient } from "../src/generated/prisma/index.js";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const hashedPassword = await bcrypt.hash("admin123", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@coresuite.it" },
    update: {},
    create: {
      email: "admin@coresuite.it",
      name: "Admin Coresuite",
      password: hashedPassword,
      role: "SUPER_ADMIN",
    },
  });

  console.log("✅ Admin creato:", admin.email);

  const services = [
    { slug: "business", name: "Coresuite Business", color: "#6366f1", order: 1 },
    { slug: "analytics", name: "Coresuite Analytics", color: "#0ea5e9", order: 2 },
    { slug: "projects", name: "Coresuite Projects", color: "#10b981", order: 3 },
    { slug: "finance", name: "Coresuite Finance", color: "#f59e0b", order: 4 },
    { slug: "hr", name: "Coresuite HR", color: "#ec4899", order: 5 },
    { slug: "docs", name: "Coresuite Docs", color: "#64748b", order: 6 },
  ];

  for (const svc of services) {
    await prisma.service.upsert({
      where: { slug: svc.slug },
      update: {},
      create: svc,
    });
  }

  console.log("✅ Servizi creati");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
