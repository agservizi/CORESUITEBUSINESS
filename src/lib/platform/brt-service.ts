import { prisma } from "@/lib/prisma";
import { brtConfigured, submitBrtShipment, saveBrtLabelPdf } from "@/lib/platform/brt-api-client";

export async function listBrtLogs(limit = 50) {
  return prisma.brtLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { shipment: { select: { trackingCode: true, recipientName: true } } },
  });
}

export async function listBrtRecipients() {
  return prisma.brtSavedRecipient.findMany({ orderBy: { name: "asc" }, take: 200 });
}

export async function saveBrtRecipient(data: Record<string, unknown>) {
  return prisma.brtSavedRecipient.create({
    data: {
      name: String(data.name),
      address: data.address ? String(data.address) : undefined,
      zip: data.zip ? String(data.zip) : undefined,
      city: data.city ? String(data.city) : undefined,
      province: data.province ? String(data.province) : undefined,
      country: data.country ? String(data.country) : "IT",
      email: data.email ? String(data.email) : undefined,
      phone: data.phone ? String(data.phone) : undefined,
    },
  });
}

export async function createBrtCustomsDoc(shipmentId: string, data: Record<string, unknown>) {
  return prisma.brtCustomsDocument.create({
    data: {
      shipmentId,
      goodsDescription: String(data.goodsDescription || "Merce"),
      hsCode: String(data.hsCode || "000000"),
      incoterm: String(data.incoterm || "DAP"),
      goodsValue: Number(data.goodsValue) || 0,
      status: "pending",
    },
  });
}

export async function confirmBrtShipment(shipmentId: string, userId: string) {
  const shipment = await prisma.shipment.findUnique({ where: { id: shipmentId } });
  if (!shipment) throw new Error("Spedizione non trovata");

  const useRealApi = brtConfigured();
  let labelUrl: string | undefined;
  let brtParcelId: string | undefined;
  let metadata: Record<string, unknown> = { confirmedBy: userId, simulated: !useRealApi };

  if (useRealApi) {
    try {
      const apiResult = await submitBrtShipment(shipment);
      brtParcelId =
        String(
          (apiResult as { parcelId?: string }).parcelId ||
            (apiResult as { shipmentId?: string }).shipmentId ||
            (apiResult as { trackingNumber?: string }).trackingNumber ||
            ""
        ) || `BRT-${Date.now()}`;

      const labelBase64 = (apiResult as { labelPdf?: string }).labelPdf;
      if (labelBase64 && typeof labelBase64 === "string") {
        labelUrl = await saveBrtLabelPdf(shipmentId, labelBase64);
      } else {
        labelUrl = `/api/platform/brt/${shipmentId}/pdf`;
      }
      metadata = { ...metadata, simulated: false, apiResponse: apiResult };
    } catch (e) {
      const error = e instanceof Error ? e.message : "Errore BRT API";
      await prisma.brtLog.create({
        data: { level: "warning", message: "BRT API fallita — fallback simulazione", context: { error }, shipmentId, createdBy: userId },
      });
      brtParcelId = `SIM-${shipment.trackingCode}`;
      labelUrl = `/api/platform/brt/${shipmentId}/pdf`;
      metadata = { ...metadata, apiError: error };
    }
  } else {
    brtParcelId = `SIM-${shipment.trackingCode}`;
    labelUrl = `/api/platform/brt/${shipmentId}/pdf`;
  }

  try {
    const updated = await prisma.shipment.update({
      where: { id: shipmentId },
      data: {
        status: "IN_CORSO",
        shippedAt: new Date(),
        labelUrl,
        brtParcelId,
        metadata: metadata as never,
      },
    });
    await prisma.brtLog.create({
      data: {
        level: "info",
        message: useRealApi && !metadata.apiError ? "Spedizione confermata su BRT" : "Spedizione confermata",
        shipmentId,
        createdBy: userId,
      },
    });
    return updated;
  } catch (e) {
    const error = e instanceof Error ? e.message : "Errore conferma";
    await prisma.brtLog.create({
      data: { level: "warning", message: "Operazione BRT non riuscita", context: { error }, shipmentId, createdBy: userId },
    });
    throw new Error(error);
  }
}

export async function trackBrtShipment(shipmentId: string) {
  const shipment = await prisma.shipment.findUnique({ where: { id: shipmentId } });
  if (!shipment) throw new Error("Spedizione non trovata");
  return {
    trackingCode: shipment.trackingCode,
    status: shipment.status,
    brtParcelId: shipment.brtParcelId,
    shippedAt: shipment.shippedAt,
    deliveredAt: shipment.deliveredAt,
    events: [
      { at: shipment.createdAt, label: "Registrata" },
      ...(shipment.shippedAt ? [{ at: shipment.shippedAt, label: "Spedita" }] : []),
      ...(shipment.deliveredAt ? [{ at: shipment.deliveredAt, label: "Consegnata" }] : []),
    ],
  };
}
