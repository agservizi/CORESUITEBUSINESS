import { prisma } from "@/lib/prisma";

export async function listPickupLocations() {
  return prisma.pickupLocation.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
}

export async function createPickupLocation(name: string, address?: string) {
  return prisma.pickupLocation.create({ data: { name, address } });
}

export async function updatePickupStatus(
  packageId: string,
  status: string,
  note: string | undefined,
  userId: string
) {
  const pkg = await prisma.pickupPackage.findUnique({ where: { id: packageId } });
  if (!pkg) throw new Error("Pacco non trovato");

  const data: Record<string, unknown> = { status };
  if (status === "RICEVUTO") data.receivedAt = new Date();
  if (status === "RITIRATO") data.pickedUpAt = new Date();

  const [updated] = await prisma.$transaction([
    prisma.pickupPackage.update({ where: { id: packageId }, data: data as never }),
    prisma.pickupPackageHistory.create({
      data: { packageId, status, note, createdBy: userId },
    }),
  ]);

  return updated;
}

export async function getPickupHistory(packageId: string) {
  return prisma.pickupPackageHistory.findMany({
    where: { packageId },
    orderBy: { createdAt: "desc" },
  });
}

export async function notifyPickupClient(packageId: string, userId: string) {
  const pkg = await prisma.pickupPackage.findUnique({
    where: { id: packageId },
    include: { client: { select: { name: true, email: true } } },
  });
  if (!pkg) throw new Error("Pacco non trovato");

  const email = pkg.notifyEmail || pkg.client?.email;
  if (!email) throw new Error("Email destinatario non disponibile");

  const notification = await prisma.pickupNotification.create({
    data: {
      packageId,
      recipientEmail: email,
      subject: `Pacco pronto per il ritiro — ${pkg.senderName}`,
      body: `Gentile cliente, il pacco da ${pkg.senderName} è pronto per il ritiro.`,
      status: "sent",
      sentAt: new Date(),
    },
  });

  await prisma.pickupPackage.update({
    where: { id: packageId },
    data: { status: "PRONTO" },
  });

  await prisma.pickupPackageHistory.create({
    data: { packageId, status: "PRONTO", note: `Notifica inviata a ${email}`, createdBy: userId },
  });

  return notification;
}

export async function listPickupNotifications(limit = 50) {
  return prisma.pickupNotification.findMany({ orderBy: { createdAt: "desc" }, take: limit });
}
