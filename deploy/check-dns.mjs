#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import axios from "axios";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOMAIN = "coresuite.it";
const API_BASE = "https://developers.hostinger.com/";

function loadToken() {
  const envPath = path.join(__dirname, "..", ".env");
  const text = fs.readFileSync(envPath, "utf8");
  const m = text.match(/^HOSTINGER_API_TOKEN=(.+)$/m);
  if (!m) throw new Error("HOSTINGER_API_TOKEN mancante");
  return m[1].trim().replace(/^"|"$/g, "");
}

const token = loadToken();
const { data } = await axios.get(new URL(`api/dns/v1/zones/${DOMAIN}`, API_BASE).toString(), {
  headers: { Authorization: `Bearer ${token}` },
  timeout: 60000,
});

const subs = fs
  .readFileSync(path.join(__dirname, "service-subdomains.txt"), "utf8")
  .split(/\r?\n/)
  .map((l) => l.trim().replace(/\.coresuite\.it$/, ""))
  .filter((l) => l && !l.startsWith("#"));

const byName = new Map(data.map((r) => [r.name, r]));
console.log("=== Apex ===");
for (const name of ["@", "www"]) {
  const r = byName.get(name);
  if (!r) {
    console.log(`${name}: MISSING`);
    continue;
  }
  console.log(`${name} ${r.type} ${r.records?.map((x) => x.content).join(", ")}`);
}

console.log("\n=== Subdomains ===");
for (const name of subs) {
  const r = byName.get(name);
  if (!r) {
    console.log(`${name}: MISSING`);
    continue;
  }
  const contents = r.records?.map((x) => x.content).join(", ") ?? "";
  const ok = r.type === "ALIAS" && contents.includes(".cdn.hstgr.net");
  console.log(`${ok ? "OK" : "!!"} ${name} ${r.type} ${contents}`);
}
