import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads", "opportunities");
export const MAX_OPPORTUNITY_FILE_BYTES = 10 * 1024 * 1024;

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/jpg",
]);

export function sanitizeFileName(name: string) {
  return name.replace(/[^\w.\-() ]+/g, "_").slice(0, 120) || "documento";
}

export function isAllowedOpportunityMime(mime: string) {
  return ALLOWED_MIME.has(mime.toLowerCase());
}

export async function saveOpportunityFileToDisk(opportunityId: string, file: File) {
  if (file.size > MAX_OPPORTUNITY_FILE_BYTES) {
    throw new Error("File troppo grande (max 10 MB)");
  }
  const mime = file.type || "application/octet-stream";
  if (!isAllowedOpportunityMime(mime)) {
    throw new Error("Formato non supportato. Usa PDF, JPG o PNG.");
  }

  const originalName = sanitizeFileName(file.name);
  const ext = path.extname(originalName) || (mime.includes("pdf") ? ".pdf" : ".jpg");
  const storedName = `${Date.now()}-${randomBytes(4).toString("hex")}${ext}`;
  const dir = path.join(UPLOAD_ROOT, opportunityId);
  await mkdir(dir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  const absolutePath = path.join(dir, storedName);
  await writeFile(absolutePath, buffer);

  const filePath = `/uploads/opportunities/${opportunityId}/${storedName}`;
  return { originalName, storedName, filePath, mimeType: mime, fileSize: file.size };
}

export async function deleteOpportunityFileFromDisk(filePath: string) {
  if (!filePath.startsWith("/uploads/opportunities/")) return;
  const relative = filePath.replace(/^\/uploads\/opportunities\//, "");
  const absolute = path.join(UPLOAD_ROOT, relative);
  try {
    await unlink(absolute);
  } catch {
    /* file may already be gone */
  }
}
