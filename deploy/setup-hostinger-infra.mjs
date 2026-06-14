#!/usr/bin/env node
/**
 * Configura DNS Hostinger + alias parked per tutti i sottodomini servizio.
 * Uso: node deploy/setup-hostinger-infra.mjs [--dns-only] [--parked-only] [--ns-hostinger]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import axios from "axios";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, "..");

const API_BASE = "https://developers.hostinger.com/";
const USERNAME = "u427445037";
const DOMAIN = "coresuite.it";
const ORIGIN_IP = "62.72.17.242";
const TTL = 300;

function loadToken() {
  const envPath = path.join(PROJECT_ROOT, ".env");
  const text = fs.readFileSync(envPath, "utf8");
  const m = text.match(/^HOSTINGER_API_TOKEN=(.+)$/m);
  if (!m) throw new Error("HOSTINGER_API_TOKEN mancante in .env");
  return m[1].trim().replace(/^"|"$/g, "");
}

function loadSubdomains() {
  const file = path.join(PROJECT_ROOT, "deploy", "service-subdomains.txt");
  return fs
    .readFileSync(file, "utf8")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .map((host) => host.replace(/\.coresuite\.it$/, ""))
    .filter((name) => name && name !== "coresuite.it" && name !== DOMAIN);
}

function headers(token) {
  return {
    Authorization: `Bearer ${token}`,
    "User-Agent": "coresuite-deploy/1.0",
    "Content-Type": "application/json",
  };
}

async function listDns(token) {
  const url = new URL(`api/dns/v1/zones/${DOMAIN}`, API_BASE).toString();
  const { data } = await axios.get(url, { headers: headers(token), timeout: 60000 });
  return data;
}

async function updateDnsRecords(token, zoneRecords, overwrite = false) {
  const url = new URL(`api/dns/v1/zones/${DOMAIN}`, API_BASE).toString();
  const { data, status } = await axios.put(
    url,
    { overwrite, zone: zoneRecords },
    { headers: headers(token), timeout: 60000 }
  );
  if (status >= 400) throw new Error(`DNS update failed: ${status} ${JSON.stringify(data)}`);
  return data;
}

async function listParked(token) {
  const url = new URL(
    `api/hosting/v1/accounts/${USERNAME}/websites/${DOMAIN}/parked-domains`,
    API_BASE
  ).toString();
  const { data } = await axios.get(url, { headers: headers(token), timeout: 60000 });
  return data?.data ?? data ?? [];
}

async function createParked(token, parkedDomain) {
  const url = new URL(
    `api/hosting/v1/accounts/${USERNAME}/websites/${DOMAIN}/parked-domains`,
    API_BASE
  ).toString();
  const { data, status } = await axios.post(
    url,
    { parked_domain: parkedDomain },
    { headers: headers(token), timeout: 60000 }
  );
  return { data, status, ok: status >= 200 && status < 300 };
}

async function updateNameservers(token) {
  const url = new URL(`api/domains/v1/portfolio/${DOMAIN}/nameservers`, API_BASE).toString();
  const { data, status } = await axios.put(
    url,
    { ns1: "ns1.dns-parking.com", ns2: "ns2.dns-parking.com" },
    { headers: headers(token), timeout: 60000 }
  );
  return { data, status };
}

async function deleteDnsRecord(token, name, type) {
  const url = new URL(`api/dns/v1/zones/${DOMAIN}`, API_BASE).toString();
  const { status, data } = await axios.delete(url, {
    headers: headers(token),
    data: { filters: [{ name, type }] },
    timeout: 60000,
  });
  return { status, data };
}

async function ensureDns(token, prefixes) {
  const existing = await listDns(token);
  const byNameType = new Map(
    existing.map((r) => [`${r.name}:${r.type}`, r])
  );

  const updates = [];
  for (const prefix of prefixes) {
    const cnameKey = `${prefix}:CNAME`;
    if (byNameType.has(cnameKey)) {
      console.log(`DNS: rimuovo CNAME ${prefix} (tunnel/legacy)`);
      await deleteDnsRecord(token, prefix, "CNAME");
    }

    const aliasTarget = `${prefix}.${DOMAIN}.cdn.hstgr.net.`;
    const aliasKey = `${prefix}:ALIAS`;
    const aliasCurrent = byNameType.get(aliasKey);
    const aliasContents = aliasCurrent?.records?.map((r) => r.content) ?? [];
    if (aliasContents.includes(aliasTarget)) continue;

    const aKey = `${prefix}:A`;
    if (byNameType.has(aKey)) {
      console.log(`DNS: rimuovo A ${prefix} → ALIAS CDN`);
      await deleteDnsRecord(token, prefix, "A");
    }

    updates.push({
      name: prefix,
      type: "ALIAS",
      ttl: TTL,
      records: [{ content: aliasTarget }],
    });
  }

  // Apex → CDN Hostinger (Node.js), come i sottodomini servizio
  const apexAliasTarget = `${DOMAIN}.cdn.hstgr.net.`;
  const apexAliasKey = "@:ALIAS";
  const apexCurrent = byNameType.get(apexAliasKey);
  const apexContents = apexCurrent?.records?.map((r) => r.content) ?? [];
  if (!apexContents.includes(apexAliasTarget)) {
    const apexAKey = "@:A";
    if (byNameType.has(apexAKey)) {
      console.log("DNS: rimuovo A @ (LiteSpeed) → ALIAS CDN Node.js");
      await deleteDnsRecord(token, "@", "A");
    }
    updates.push({
      name: "@",
      type: "ALIAS",
      ttl: TTL,
      records: [{ content: apexAliasTarget }],
    });
  }

  if (updates.length === 0) {
    console.log("DNS: nessun record da aggiornare.");
    return;
  }

  console.log(`DNS: aggiornamento ${updates.length} record`);
  for (const record of updates) {
    try {
      console.log(`  - ${record.name} ${record.type}`);
      await updateDnsRecords(token, [record], false);
    } catch (err) {
      const msg = err.response?.data?.message ?? err.message;
      console.warn(`  ! skip ${record.name}: ${msg}`);
    }
  }
  console.log("DNS: batch completato.");
}

async function ensureParked(token, prefixes) {
  const parked = await listParked(token);
  const existing = new Set(
    (Array.isArray(parked) ? parked : []).map((p) =>
      (p.domain || p.parked_domain || p.name || "").toLowerCase()
    )
  );

  for (const prefix of prefixes) {
    const fqdn = `${prefix}.${DOMAIN}`;
    if (existing.has(fqdn)) {
      console.log(`Parked: ${fqdn} già presente`);
      continue;
    }
    const { status, data, ok } = await createParked(token, fqdn);
    if (ok) {
      console.log(`Parked: creato ${fqdn}`);
    } else {
      console.warn(`Parked: ${fqdn} status=${status} ${JSON.stringify(data)}`);
    }
  }
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const token = loadToken();
  const prefixes = loadSubdomains();

  console.log(`==> Coresuite infra setup (${prefixes.length} sottodomini)`);

  if (args.has("--ns-hostinger")) {
    console.log("==> Nameserver → Hostinger dns-parking");
    const { status, data } = await updateNameservers(token);
    console.log(`NS update status=${status}`, data ?? "");
  }

  if (!args.has("--parked-only")) {
    await ensureDns(token, prefixes);
  }

  if (!args.has("--dns-only")) {
    await ensureParked(token, prefixes);
  }

  console.log("==> Fatto.");
}

main().catch((err) => {
  console.error(err.response?.data ?? err.message ?? err);
  process.exit(1);
});
