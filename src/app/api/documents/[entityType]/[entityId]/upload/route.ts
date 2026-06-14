import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import { auditAction } from "@/lib/api-guard";
import { prisma } from "@/lib/prisma";
import { saveDocumentToDisk } from "@/lib/documents/document-uploads";

export const POST = withApi(
  async (request, { user, params }) => {
    const entityType = params?.entityType;
    const entityId = params?.entityId;
    if (!entityType || !entityId) {
      return NextResponse.json({ error: "Parametri richiesti" }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File mancante" }, { status: 400 });
    }

    const saved = await saveDocumentToDisk(entityType, entityId, file);
    const clientId = formData.get("clientId") ? String(formData.get("clientId")) : undefined;

    const document = await prisma.document.create({
      data: {
        entityType,
        entityId,
        fileName: saved.originalName,
        fileUrl: saved.fileUrl,
        mimeType: saved.mimeType,
        clientId,
        uploadedBy: user.id,
      },
    });

    await auditAction(request, user.id, "CREATE", "document", document.id, {
      entityType,
      entityId,
      upload: true,
    });

    return NextResponse.json({ document }, { status: 201 });
  }
);
