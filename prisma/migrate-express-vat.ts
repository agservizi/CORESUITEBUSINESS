import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { resolveExpressLineVatRate } from "../src/lib/platform/express-vat";
import { getExpressSettingsRecord } from "../src/lib/platform/express-admin";

async function main() {
  const settings = await getExpressSettingsRecord();
  const simVat = settings.sim_vat;
  const defaultVat = settings.default_vat;

  const lines = await prisma.expressSaleLine.findMany({
    where: { lineType: { in: ["sim", "servizio"] } },
    select: { id: true, lineType: true, vatRate: true, productId: true },
  });

  let updated = 0;
  for (const line of lines) {
    const targetVat = resolveExpressLineVatRate(line.lineType, {
      defaultVat,
      simVat,
    });
    if (Number(line.vatRate) !== targetVat) {
      await prisma.expressSaleLine.update({
        where: { id: line.id },
        data: { vatRate: targetVat },
      });
      updated++;
    }
  }

  const iccidRows = await prisma.expressIccidStock.findMany({
    where: { assignedNumber: null },
    include: {
      saleLines: { select: { assignedNumber: true }, take: 1, orderBy: { createdAt: "desc" } },
    },
  });

  let iccidUpdated = 0;
  for (const row of iccidRows) {
    const num = row.saleLines[0]?.assignedNumber;
    if (num) {
      await prisma.expressIccidStock.update({
        where: { id: row.id },
        data: { assignedNumber: num },
      });
      iccidUpdated++;
    }
  }

  console.log(`✅ Righe SIM/servizio IVA corrette: ${updated}`);
  console.log(`✅ ICCID con numero assegnato aggiornati: ${iccidUpdated}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
