import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads", "documents");
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/jpg",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export function sanitizeFileName(name: string) {
  return name.replace(/[^\w.\-() ]+/g, "_").slice(0, 120) || "documento";
}

export function isAllowedDocumentMime(mime: string) {
  return ALLOWED_MIME.has(mime.toLowerCase());
}

export function sanitizeEntitySegment(value: string) {
  return value.replace(/[^\w-]+/g, "_").slice(0, 64);
}

export async function saveDocumentToDisk(entityType: string, entityId: string, file: File) {
  if (file.size > MAX_DOCUMENT_BYTES) {
    throw new Error("File troppo grande (max 10 MB)");
  }
  const mime = file.type || "application/octet-stream";
  if (!isAllowedDocumentMime(mime)) {
    throw new Error("Formato non supportato. Usa PDF, JPG, PNG o DOC/DOCX.");
  }

  const safeType = sanitizeEntitySegment(entityType);
  const safeId = sanitizeEntitySegment(entityId);
  const originalName = sanitizeFileName(file.name);
  const ext = path.extname(originalName) || (mime.includes("pdf") ? ".pdf" : ".bin");
  const storedName = `${Date.now()}-${randomBytes(4).toString("hex")}${ext}`;
  const dir = path.join(UPLOAD_ROOT, safeType, safeId);
  await mkdir(dir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, storedName), buffer);

  const fileUrl = `/uploads/documents/${safeType}/${safeId}/${storedName}`;
  return { originalName, fileUrl, mimeType: mime, fileSize: file.size };
}

export async function deleteDocumentFromDisk(fileUrl: string) {
  if (!fileUrl.startsWith("/uploads/documents/")) return;
  const relative = fileUrl.replace(/^\/uploads\/documents\//, "");
  try {
    await unlink(path.join(UPLOAD_ROOT, relative));
  } catch {
    /* file may already be gone */
  }
}
