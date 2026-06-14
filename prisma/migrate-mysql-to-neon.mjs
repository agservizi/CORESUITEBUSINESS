#!/usr/bin/env node
/**
 * Migra dati dal dump MySQL legacy verso Neon Postgres.
 * Uso: node prisma/migrate-mysql-to-neon.mjs
 * Richiede: .env.production (DATABASE_URL Neon), dump in Downloads o MYSQL_DUMP_PATH
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const prodEnvPath = path.join(root, ".env.production");
const defaultDump = path.join(
  process.env.USERPROFILE || process.env.HOME || "",
  "Downloads",
  "u427445037_coresuitebusin.sql"
);

function loadProductionDatabaseUrl() {
  if (!fs.existsSync(prodEnvPath)) {
    throw new Error("Manca .env.production con DATABASE_URL Neon");
  }
  const text = fs.readFileSync(prodEnvPath, "utf8");
  const m = text.match(/^DATABASE_URL=(.+)$/m);
  if (!m) throw new Error("DATABASE_URL non trovato in .env.production");
  let url = m[1].trim();
  if (url.startsWith('"') && url.endsWith('"')) url = url.slice(1, -1);
  if (url.includes("localhost")) {
    throw new Error("DATABASE_URL punta a localhost — usa l'URL Neon in .env.production");
  }
  return url;
}

const dumpPath = process.env.MYSQL_DUMP_PATH || defaultDump;
if (!fs.existsSync(dumpPath)) {
  console.error(`Dump non trovato: ${dumpPath}`);
  process.exit(1);
}

const databaseUrl = loadProductionDatabaseUrl();
process.env.DATABASE_URL = databaseUrl;
process.env.MYSQL_DUMP_PATH = dumpPath;

console.log("==> Target Neon:", databaseUrl.replace(/:[^:@/]+@/, ":***@"));
console.log("==> Dump MySQL:", dumpPath);

console.log("\n==> 1/3 prisma db push (schema su Neon)...");
execSync("npx prisma db push --accept-data-loss", {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});

console.log("\n==> 2/3 seed base (admin fallback + servizi)...");
execSync("node prisma/seed.mjs", {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});

console.log("\n==> 3/3 import dati legacy (clienti, Express, utenti)...");
execSync("npx tsx prisma/import-mysql-express.ts", {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});

console.log("\n🎉 Migrazione MySQL → Neon completata.");
