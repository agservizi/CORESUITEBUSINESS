import { prisma } from "@/lib/prisma";

export async function getClientLoyaltyBalance(clientId: string): Promise<number> {
  const agg = await prisma.loyaltyPoint.aggregate({
    where: { clientId },
    _sum: { points: true },
  });
  return agg._sum.points ?? 0;
}

export async function listClientBalances(limit = 50) {
  const clients = await prisma.client.findMany({
    take: limit,
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true },
  });

  const rows = await Promise.all(
    clients.map(async (c) => ({
      clientId: c.id,
      clientName: c.name,
      clientEmail: c.email,
      balance: await getClientLoyaltyBalance(c.id),
    }))
  );

  return rows.sort((a, b) => b.balance - a.balance);
}

export async function listLoyaltyRewards(activeOnly = true) {
  return prisma.loyaltyReward.findMany({
    where: activeOnly ? { isActive: true } : undefined,
    orderBy: [{ pointsCost: "asc" }, { name: "asc" }],
  });
}

export async function createLoyaltyReward(data: {
  name: string;
  description?: string;
  pointsCost: number;
  isActive?: boolean;
}) {
  return prisma.loyaltyReward.create({
    data: {
      name: data.name,
      description: data.description,
      pointsCost: data.pointsCost,
      isActive: data.isActive ?? true,
    },
  });
}

export async function addLoyaltyMovement(
  data: {
    clientId: string;
    points: number;
    movementType: string;
    description?: string;
    reason?: string;
    reward?: string;
    notes?: string;
    movedAt?: Date;
  },
  user: { id: string; name?: string | null; email?: string }
) {
  const current = await getClientLoyaltyBalance(data.clientId);
  const next = current + data.points;
  if (next < 0) throw new Error(`Saldo insufficiente (${current} punti disponibili)`);

  return prisma.loyaltyPoint.create({
    data: {
      clientId: data.clientId,
      points: data.points,
      movementType: data.movementType,
      description: data.description,
      reason: data.reason,
      reward: data.reward,
      notes: data.notes,
      balanceAfter: next,
      operatorId: user.id,
      operatorName: user.name || user.email || user.id,
      movedAt: data.movedAt ?? new Date(),
    },
    include: { client: { select: { name: true } } },
  });
}

export async function redeemLoyaltyReward(
  clientId: string,
  rewardId: string,
  user: { id: string; name?: string | null; email?: string }
) {
  const reward = await prisma.loyaltyReward.findUnique({ where: { id: rewardId } });
  if (!reward || !reward.isActive) throw new Error("Premio non disponibile");

  const balance = await getClientLoyaltyBalance(clientId);
  if (balance < reward.pointsCost) {
    throw new Error(`Punti insufficienti: servono ${reward.pointsCost}, disponibili ${balance}`);
  }

  return addLoyaltyMovement(
    {
      clientId,
      points: -reward.pointsCost,
      movementType: "riscatto",
      description: `Riscatto premio: ${reward.name}`,
      reason: reward.name,
      reward: reward.name,
    },
    user
  );
}

export async function seedDefaultRewards() {
  const count = await prisma.loyaltyReward.count();
  if (count > 0) return { seeded: 0 };
  await prisma.loyaltyReward.createMany({
    data: [
      { name: "Caffè omaggio", description: "Un caffè in sede", pointsCost: 50 },
      { name: "Sconto 10% servizio", description: "Sconto 10% sul prossimo servizio", pointsCost: 200 },
      { name: "Pratica prioritaria", description: "Gestione prioritaria entro 24h", pointsCost: 500 },
    ],
  });
  return { seeded: 3 };
}
