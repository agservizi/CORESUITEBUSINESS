import "dotenv/config";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/index.js";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

try {
  const tables = await prisma.$queryRawUnsafe(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name ILIKE '%opportun%'
    ORDER BY table_name
  `);
  console.log("Tables:", tables);

  const oppCols = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type, udt_name
    FROM information_schema.columns
    WHERE table_name = 'Opportunity'
    ORDER BY ordinal_position
  `);
  console.log("Opportunity columns:", oppCols);

  const count = await prisma.opportunity.count().catch((e) => e.message);
  console.log("Opportunity count:", count);

  if (typeof count === "number" && count > 0) {
    const sample = await prisma.opportunity.findMany({ take: 2 });
    console.log("Sample:", JSON.stringify(sample, null, 2));
  }

  const legacy = await prisma.$queryRawUnsafe(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN ('opportunity_statuses','opportunity_providers','opportunity_offers','opportunities')
  `).catch(() => []);
  console.log("Legacy-named tables:", legacy);
} finally {
  await prisma.$disconnect();
  await pool.end();
}
