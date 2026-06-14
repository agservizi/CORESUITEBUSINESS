import "dotenv/config";
import fs from "fs";
import path from "path";
import { prisma } from "../src/lib/prisma";
import { rowsToObjects } from "./lib/mysql-dump-parser";

const DEFAULT_DUMP = path.join(
  process.env.USERPROFILE || "",
  "Downloads",
  "u427445037_coresuitebusin.sql"
);

const DUMP_PATH = process.env.MYSQL_DUMP_PATH || DEFAULT_DUMP;

function dec(v: unknown, fallback = 0) {
  if (v === null || v === undefined || v === "") return fallback;
  return Number(v);
}

function dateOrNull(v: unknown) {
  if (!v || v === "NULL") return null;
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d;
}

function mapRole(ruolo: unknown): "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "OPERATORE" | "PATRONATO" | "CLIENTE" | "COLLABORATORE" {
  const map: Record<string, "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "OPERATORE" | "PATRONATO" | "CLIENTE" | "COLLABORATORE"> = {
    Admin: "ADMIN",
    Manager: "MANAGER",
    Operatore: "OPERATORE",
    Patronato: "PATRONATO",
    Cliente: "CLIENTE",
    Collaboratore: "COLLABORATORE",
  };
  return map[String(ruolo || "Operatore")] || "OPERATORE";
}

async function importUsers(sql: string) {
  const userMap = new Map<number, string>();
  const rows = rowsToObjects(sql, "users");
  for (const row of rows) {
    const mysqlId = Number(row.id);
    const email = String(row.email || "").trim().toLowerCase();
    if (!email) continue;
    const role = mysqlId === 1 ? "SUPER_ADMIN" : mapRole(row.ruolo);
    const user = await prisma.user.upsert({
      where: { email },
      create: {
        email,
        username: row.username ? String(row.username) : null,
        name: [row.nome, row.cognome].filter(Boolean).join(" ").trim() || String(row.username || email),
        firstName: row.nome ? String(row.nome) : null,
        lastName: row.cognome ? String(row.cognome) : null,
        password: String(row.password),
        role,
        mfaSecret: row.mfa_secret ? String(row.mfa_secret) : null,
        mfaEnabled: Number(row.mfa_enabled) === 1,
        lastLoginAt: dateOrNull(row.last_login_at),
      },
      update: {
        username: row.username ? String(row.username) : null,
        name: [row.nome, row.cognome].filter(Boolean).join(" ").trim() || String(row.username || email),
        firstName: row.nome ? String(row.nome) : null,
        lastName: row.cognome ? String(row.cognome) : null,
        password: String(row.password),
        role,
        mfaSecret: row.mfa_secret ? String(row.mfa_secret) : null,
        mfaEnabled: Number(row.mfa_enabled) === 1,
        lastLoginAt: dateOrNull(row.last_login_at),
      },
    });
    userMap.set(mysqlId, user.id);
  }
  console.log(`✅ Utenti importati: ${userMap.size}`);
  return userMap;
}

async function main() {
  if (!fs.existsSync(DUMP_PATH)) {
    console.error(`Dump non trovato: ${DUMP_PATH}`);
    console.error("Imposta MYSQL_DUMP_PATH con il percorso del file .sql");
    process.exit(1);
  }

  console.log(`📂 Lettura dump: ${DUMP_PATH}`);
  const sql = fs.readFileSync(DUMP_PATH, "utf8");

  const userMap = await importUsers(sql);

  const clientRows = rowsToObjects(sql, "clienti");
  console.log(`👥 Clienti nel dump: ${clientRows.length}`);

  const clientMap = new Map<number, string>();
  let importedClients = 0;

  for (const row of clientRows) {
    const mysqlId = Number(row.id);
    const nome = String(row.nome || "").trim();
    const cognome = String(row.cognome || "").trim();
    const ragione = String(row.ragione_sociale || "").trim();
    const name =
      ragione ||
      [nome, cognome].filter(Boolean).join(" ") ||
      `Cliente #${mysqlId}`;

    const morosityMap: Record<string, "OK" | "ATTENZIONE" | "BLOCCATO"> = {
      ok: "OK",
      attenzione: "ATTENZIONE",
      bloccato: "BLOCCATO",
    };
    const score = morosityMap[String(row.morosita_score || "ok").toLowerCase()] || "OK";

    const existing = await prisma.client.findUnique({ where: { mysqlId } });
    const data = {
      mysqlId,
      name,
      companyName: ragione || null,
      email: row.email ? String(row.email) : null,
      phone: row.telefono ? String(row.telefono) : null,
      address: row.indirizzo ? String(row.indirizzo) : null,
      taxCode: row.cf_piva ? String(row.cf_piva) : null,
      type: ragione ? ("COMPANY" as const) : ("INDIVIDUAL" as const),
      morosityFlag: Number(row.morosita_flag) === 1,
      morosityScore: score,
      morosityNote: row.morosita_note ? String(row.morosita_note) : null,
    };

    const client = existing
      ? await prisma.client.update({ where: { mysqlId }, data })
      : await prisma.client.create({ data });

    clientMap.set(mysqlId, client.id);
    importedClients++;
    if (importedClients % 500 === 0) {
      console.log(`  … ${importedClients} clienti`);
    }
  }
  console.log(`✅ Clienti importati: ${importedClients}`);

  const operatorMap = new Map<number, string>();
  for (const row of rowsToObjects(sql, "servizi_express_operatori")) {
    const mysqlId = Number(row.id);
    const op = await prisma.expressOperator.upsert({
      where: { mysqlId },
      create: {
        mysqlId,
        name: String(row.nome),
        reorderThreshold: Number(row.soglia_riordino) || 10,
        active: Number(row.attivo) === 1,
      },
      update: {
        name: String(row.nome),
        reorderThreshold: Number(row.soglia_riordino) || 10,
        active: Number(row.attivo) === 1,
      },
    });
    operatorMap.set(mysqlId, op.id);
  }
  console.log(`✅ Operatori Express: ${operatorMap.size}`);

  const offerMap = new Map<number, string>();
  for (const row of rowsToObjects(sql, "servizi_express_offerte")) {
    const mysqlId = Number(row.id);
    const operatorId = row.operatore_id ? operatorMap.get(Number(row.operatore_id)) : undefined;
    const offer = await prisma.expressOffer.upsert({
      where: { mysqlId },
      create: {
        mysqlId,
        operatorId,
        title: String(row.titolo),
        description: row.descrizione ? String(row.descrizione) : null,
        price: dec(row.prezzo),
        status: String(row.stato || "Active"),
        validFrom: dateOrNull(row.valid_from),
        validTo: dateOrNull(row.valid_to),
      },
      update: {
        operatorId,
        title: String(row.titolo),
        description: row.descrizione ? String(row.descrizione) : null,
        price: dec(row.prezzo),
        status: String(row.stato || "Active"),
        validFrom: dateOrNull(row.valid_from),
        validTo: dateOrNull(row.valid_to),
      },
    });
    offerMap.set(mysqlId, offer.id);
  }
  console.log(`✅ Offerte Express: ${offerMap.size}`);

  const productMap = new Map<number, string>();
  for (const row of rowsToObjects(sql, "servizi_express_prodotti")) {
    const mysqlId = Number(row.id);
    const product = await prisma.expressProduct.upsert({
      where: { mysqlId },
      create: {
        mysqlId,
        name: String(row.nome),
        sku: row.sku ? String(row.sku) : null,
        imei: row.imei ? String(row.imei) : null,
        category: row.categoria ? String(row.categoria) : null,
        price: dec(row.prezzo),
        vatRate: dec(row.aliquota_iva, 22),
        stockQty: Number(row.stock_quantita) || 0,
        reorderThreshold: Number(row.soglia_riordino) || 0,
        notes: row.note ? String(row.note) : null,
        active: Number(row.attivo) === 1,
      },
      update: {
        name: String(row.nome),
        price: dec(row.prezzo),
        stockQty: Number(row.stock_quantita) || 0,
        active: Number(row.attivo) === 1,
      },
    });
    productMap.set(mysqlId, product.id);
  }
  console.log(`✅ Prodotti Express: ${productMap.size}`);

  const saleMap = new Map<number, string>();
  const saleRows = rowsToObjects(sql, "servizi_express_vendite");
  for (const row of saleRows) {
    const mysqlId = Number(row.id);
    const clientId = row.cliente_id ? clientMap.get(Number(row.cliente_id)) : undefined;
    const sale = await prisma.expressSale.upsert({
      where: { mysqlId },
      create: {
        mysqlId,
        clientId,
        total: dec(row.totale),
        vatRate: dec(row.iva, 22),
        discount: dec(row.sconto),
        paymentMethod: String(row.metodo_pagamento || "Contanti"),
        status: String(row.stato || "Completata"),
        soldAt: dateOrNull(row.data_vendita) || new Date(),
        notes: row.note ? String(row.note) : null,
      },
      update: {
        clientId,
        total: dec(row.totale),
        discount: dec(row.sconto),
        paymentMethod: String(row.metodo_pagamento || "Contanti"),
        status: String(row.stato || "Completata"),
        soldAt: dateOrNull(row.data_vendita) || new Date(),
        notes: row.note ? String(row.note) : null,
      },
    });
    saleMap.set(mysqlId, sale.id);
  }
  console.log(`✅ Vendite Express: ${saleMap.size}`);

  const iccidMap = new Map<number, string>();
  for (const row of rowsToObjects(sql, "servizi_express_iccid_stock")) {
    const mysqlId = Number(row.id);
    const operatorId = operatorMap.get(Number(row.operatore_id));
    if (!operatorId) continue;
    const saleId = row.vendita_id ? saleMap.get(Number(row.vendita_id)) : undefined;
    const iccid = await prisma.expressIccidStock.upsert({
      where: { mysqlId },
      create: {
        mysqlId,
        operatorId,
        saleId,
        iccid: String(row.iccid),
        status: String(row.stato || "InStock"),
        notes: row.note ? String(row.note) : null,
      },
      update: {
        operatorId,
        saleId,
        iccid: String(row.iccid),
        status: String(row.stato || "InStock"),
        notes: row.note ? String(row.note) : null,
      },
    });
    iccidMap.set(mysqlId, iccid.id);
  }
  console.log(`✅ Stock ICCID: ${iccidMap.size}`);

  let lineCount = 0;
  for (const row of rowsToObjects(sql, "servizi_express_vendita_righe")) {
    const mysqlId = Number(row.id);
    const saleId = saleMap.get(Number(row.vendita_id));
    if (!saleId) continue;
    await prisma.expressSaleLine.upsert({
      where: { mysqlId },
      create: {
        mysqlId,
        saleId,
        operatorId: row.operatore_id ? operatorMap.get(Number(row.operatore_id)) : undefined,
        iccidStockId: row.iccid_stock_id ? iccidMap.get(Number(row.iccid_stock_id)) : undefined,
        productId: row.prodotto_id ? productMap.get(Number(row.prodotto_id)) : undefined,
        offerId: row.offerta_id ? offerMap.get(Number(row.offerta_id)) : undefined,
        lineType: String(row.tipo || "sim"),
        description: String(row.descrizione),
        quantity: Number(row.quantita) || 1,
        returnedQty: Number(row.quantita_resa) || 0,
        unitPrice: dec(row.prezzo_unitario),
        vatRate: dec(row.aliquota_iva, 22),
        lineTotal: dec(row.totale_riga),
        lineDiscount: dec(row.sconto_riga),
      },
      update: {
        saleId,
        description: String(row.descrizione),
        lineTotal: dec(row.totale_riga),
      },
    });
    lineCount++;
  }
  console.log(`✅ Righe vendita: ${lineCount}`);

  let portalCount = 0;
  for (const row of rowsToObjects(sql, "servizi_express_portale_clienti")) {
    const mysqlId = Number(row.id);
    const clientId = clientMap.get(Number(row.cliente_id));
    if (!clientId) continue;
    await prisma.expressPortalClient.upsert({
      where: { mysqlId },
      create: {
        mysqlId,
        clientId,
        pickupMysqlId: row.pickup_customer_id ? Number(row.pickup_customer_id) : null,
        status: String(row.stato || "active"),
      },
      update: {
        clientId,
        pickupMysqlId: row.pickup_customer_id ? Number(row.pickup_customer_id) : null,
        status: String(row.stato || "active"),
      },
    });
    portalCount++;
  }
  console.log(`✅ Portale clienti Express: ${portalCount}`);

  let requestCount = 0;
  for (const row of rowsToObjects(sql, "servizi_express_richieste")) {
    const mysqlId = Number(row.id);
    const clientId = clientMap.get(Number(row.cliente_id));
    if (!clientId) continue;
    await prisma.expressRequest.upsert({
      where: { mysqlId },
      create: {
        mysqlId,
        clientId,
        productId: row.prodotto_id ? productMap.get(Number(row.prodotto_id)) : undefined,
        title: String(row.titolo),
        requestType: String(row.tipo_richiesta || "Purchase"),
        status: String(row.stato || "Pending"),
        depositAmount: row.importo_acconto != null ? dec(row.importo_acconto) : undefined,
        installments: row.numero_rate ? Number(row.numero_rate) : undefined,
        paymentMethod: row.metodo_pagamento ? String(row.metodo_pagamento) : undefined,
        desiredDate: row.data_desiderata ? dateOrNull(row.data_desiderata) : undefined,
        clientNotes: row.note_cliente ? String(row.note_cliente) : undefined,
        internalNotes: row.nota_interna ? String(row.nota_interna) : undefined,
      },
      update: {
        clientId,
        title: String(row.titolo),
        status: String(row.stato || "Pending"),
      },
    });
    requestCount++;
  }
  console.log(`✅ Richieste Express: ${requestCount}`);

  // Pass 2: campagne sconto, PDA, utenti vendite, numeri SIM, IVA righe, cassa
  for (const row of rowsToObjects(sql, "users")) {
    const mysqlId = Number(row.id);
    if (!userMap.has(mysqlId)) {
      const email = String(row.email || "").trim().toLowerCase();
      const user = email ? await prisma.user.findUnique({ where: { email } }) : null;
      if (user) userMap.set(mysqlId, user.id);
    }
  }

  let campaignCount = 0;
  for (const row of rowsToObjects(sql, "servizi_express_campagne_sconto")) {
    const mysqlId = Number(row.id);
    await prisma.expressDiscountCampaign.upsert({
      where: { mysqlId },
      create: {
        mysqlId,
        name: String(row.nome || row.name || `Campagna ${mysqlId}`),
        description: row.descrizione ? String(row.descrizione) : null,
        type: String(row.tipo || row.type || "Fixed"),
        value: dec(row.valore ?? row.value),
        active: Number(row.attivo ?? row.active ?? 1) === 1,
        startsAt: dateOrNull(row.data_inizio ?? row.starts_at),
        endsAt: dateOrNull(row.data_fine ?? row.ends_at),
      },
      update: {
        name: String(row.nome || row.name || `Campagna ${mysqlId}`),
        value: dec(row.valore ?? row.value),
        active: Number(row.attivo ?? row.active ?? 1) === 1,
      },
    });
    campaignCount++;
  }
  console.log(`✅ Campagne sconto: ${campaignCount}`);

  let pdaCount = 0;
  for (const row of rowsToObjects(sql, "servizi_express_pda_import")) {
    const reference = row.riferimento ? String(row.riferimento) : row.reference ? String(row.reference) : null;
    let payload: unknown = {};
    try {
      payload = row.payload ? JSON.parse(String(row.payload)) : row.dati ? JSON.parse(String(row.dati)) : {};
    } catch {
      payload = { raw: String(row.payload || row.dati || "") };
    }
    const saleId = row.vendita_id ? saleMap.get(Number(row.vendita_id)) : undefined;
    await prisma.expressPdaImport.create({
      data: {
        reference,
        payload: payload as object,
        status: saleId ? "Processed" : String(row.stato || row.status || "Pending"),
        saleId,
      },
    });
    pdaCount++;
  }
  console.log(`✅ Import PDA: ${pdaCount}`);

  for (const row of saleRows) {
    const mysqlId = Number(row.id);
    const saleId = saleMap.get(mysqlId);
    if (!saleId) continue;
    const userId = row.operatore_id || row.user_id ? userMap.get(Number(row.operatore_id ?? row.user_id)) : undefined;
    await prisma.expressSale.update({
      where: { id: saleId },
      data: {
        userId,
        receiptNumber: row.numero_scontrino ? Number(row.numero_scontrino) : undefined,
      },
    });
  }

  for (const row of rowsToObjects(sql, "servizi_express_iccid_stock")) {
    const mysqlId = Number(row.id);
    const assigned = row.numero_assegnato ?? row.assigned_number ?? row.numero;
    if (!assigned) continue;
    const iccidId = iccidMap.get(mysqlId);
    if (!iccidId) continue;
    await prisma.expressIccidStock.update({
      where: { id: iccidId },
      data: { assignedNumber: String(assigned) },
    });
  }

  for (const row of rowsToObjects(sql, "servizi_express_vendita_righe")) {
    const mysqlId = Number(row.id);
    const assigned = row.numero_assegnato ?? row.assigned_number;
    const vatCode = row.codice_iva ?? row.vat_code;
    const lineType = String(row.tipo || "sim");
    const simVat = lineType === "sim" || lineType === "servizio" ? 0 : dec(row.aliquota_iva, 22);
    await prisma.expressSaleLine.updateMany({
      where: { mysqlId },
      data: {
        assignedNumber: assigned ? String(assigned) : undefined,
        vatCode: vatCode ? String(vatCode) : undefined,
        vatRate: simVat,
        lineDiscount: dec(row.sconto_riga),
      },
    });
  }

  let cashCount = 0;
  for (const row of rowsToObjects(sql, "servizi_express_cassa_movimenti")) {
    const saleId = row.vendita_id ? saleMap.get(Number(row.vendita_id)) : undefined;
    if (!saleId) continue;
    const amount = dec(row.importo ?? row.amount);
    const cash = await prisma.cashMovement.create({
      data: {
        clientId: (await prisma.expressSale.findUnique({ where: { id: saleId }, select: { clientId: true } }))?.clientId,
        type: "ENTRATA",
        description: `Import legacy vendita #${row.vendita_id}`,
        amount,
        quantity: 1,
        unitPrice: amount,
        method: String(row.metodo ?? row.method ?? "Contanti"),
        status: "Pagato",
        paidAt: dateOrNull(row.data) || new Date(),
      },
    });
    await prisma.expressSale.update({
      where: { id: saleId },
      data: { cashMovementId: cash.id },
    });
    cashCount++;
  }
  console.log(`✅ Movimenti cassa legacy: ${cashCount}`);

  const settingsRows = rowsToObjects(sql, "configurazioni").filter(
    (r) => r.chiave === "servizi_express_settings"
  );
  if (settingsRows[0]?.valore) {
    try {
      const data = JSON.parse(String(settingsRows[0].valore));
      await prisma.expressSettings.upsert({
        where: { id: "default" },
        create: { id: "default", data },
        update: { data },
      });
      console.log("✅ Impostazioni Express");
    } catch {
      console.warn("⚠ Impostazioni Express non parseable");
    }
  }

  console.log("\n🎉 Import Express completato.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
