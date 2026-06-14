import path from "path";
import { mkdir, writeFile } from "fs/promises";
import { prisma } from "@/lib/prisma";

function brtConfigured(): boolean {
  return Boolean(
    process.env.BRT_API_KEY?.trim() &&
      (process.env.BRT_ACCOUNT_USER_ID?.trim() || process.env.BRT_SENDER_CUSTOMER_CODE?.trim())
  );
}

function brtHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  const apiKey = process.env.BRT_API_KEY?.trim();
  if (apiKey) headers["X-API-KEY"] = apiKey;
  return headers;
}

async function brtFetch(endpoint: string, body: Record<string, unknown>) {
  const base = (process.env.BRT_REST_BASE_URL || "https://api.brt.it/rest/v1").replace(/\/$/, "");
  const url = `${base}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
  const routing = process.env.BRT_ROUTING_ENDPOINT || "/shipments/routing";
  const res = await fetch(url.endsWith("/shipments/routing") ? url : `${base}${routing}`, {
    method: "POST",
    headers: brtHeaders(),
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    throw new Error(`BRT API ${res.status}: ${String(json.message || json.error || text).slice(0, 300)}`);
  }
  return json;
}

export async function submitBrtShipment(shipment: {
  id: string;
  trackingCode: string;
  recipientName: string;
  recipientAddress?: string | null;
  weightKg?: unknown;
}) {
  const customerCode = process.env.BRT_SENDER_CUSTOMER_CODE || process.env.BRT_ACCOUNT_USER_ID;
  const depot = process.env.BRT_DEPARTURE_DEPOT || "122";
  const addressParts = (shipment.recipientAddress || "").split(",").map((s) => s.trim());
  const payload = {
    account: {
      userId: process.env.BRT_ACCOUNT_USER_ID || customerCode,
      password: process.env.BRT_ACCOUNT_PASSWORD,
    },
    shipment: {
      customerCode,
      departureDepot: depot,
      network: process.env.BRT_DEFAULT_NETWORK || "ITALIA",
      consignee: {
        name: shipment.recipientName,
        address: addressParts[0] || shipment.recipientAddress || "Indirizzo da completare",
        city: addressParts[1] || "",
        zipCode: addressParts[2] || "",
        country: process.env.BRT_DEFAULT_COUNTRY || "IT",
      },
      weightKg: shipment.weightKg ? Number(shipment.weightKg) : 1,
      reference: shipment.trackingCode,
    },
  };

  return brtFetch(process.env.BRT_ROUTING_ENDPOINT || "/shipments/routing", payload);
}

export async function saveBrtLabelPdf(shipmentId: string, pdfBase64: string): Promise<string> {
  const dir = path.join(process.cwd(), "public", "uploads", "brt", shipmentId);
  await mkdir(dir, { recursive: true });
  const fileName = `label-${Date.now()}.pdf`;
  await writeFile(path.join(dir, fileName), Buffer.from(pdfBase64, "base64"));
  return `/uploads/brt/${shipmentId}/${fileName}`;
}

export { brtConfigured };
