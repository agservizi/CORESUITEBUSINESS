import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { sanitizeEntitySegment } from "@/lib/documents/document-uploads";

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads", "documents");

export async function savePdfBufferAsDocument(options: {
  entityType: string;
  entityId: string;
  clientId: string;
  fileName: string;
  buffer: Buffer;
  uploadedBy?: string;
}) {
  const safeType = sanitizeEntitySegment(options.entityType);
  const safeId = sanitizeEntitySegment(options.entityId);
  const storedName = `${Date.now()}-${randomBytes(4).toString("hex")}.pdf`;
  const dir = path.join(UPLOAD_ROOT, safeType, safeId);
  await mkdir(dir, { recursive: true });

  const absolutePath = path.join(dir, storedName);
  await writeFile(absolutePath, options.buffer);

  const fileUrl = `/uploads/documents/${safeType}/${safeId}/${storedName}`;

  const document = await prisma.document.create({
    data: {
      entityType: options.entityType,
      entityId: options.entityId,
      clientId: options.clientId,
      fileName: options.fileName,
      fileUrl,
      mimeType: "application/pdf",
      uploadedBy: options.uploadedBy,
    },
  });

  return { fileUrl, document };
}
