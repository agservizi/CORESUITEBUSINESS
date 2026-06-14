import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import { auditAction } from "@/lib/api-guard";
import { prisma } from "@/lib/prisma";
import { deleteDocumentFromDisk } from "@/lib/documents/document-uploads";

export const DELETE = withApi(
  async (request, { user, params }) => {
    const entityType = params?.entityType;
    const entityId = params?.entityId;
    const documentId = params?.documentId;
    if (!entityType || !entityId || !documentId) {
      return NextResponse.json({ error: "Parametri richiesti" }, { status: 400 });
    }

    const document = await prisma.document.findFirst({
      where: { id: documentId, entityType, entityId },
    });
    if (!document) {
      return NextResponse.json({ error: "Documento non trovato" }, { status: 404 });
    }

    await deleteDocumentFromDisk(document.fileUrl);
    await prisma.document.delete({ where: { id: documentId } });
    await auditAction(request, user.id, "DELETE", "document", documentId, { entityType, entityId });

    return NextResponse.json({ ok: true });
  }
);
