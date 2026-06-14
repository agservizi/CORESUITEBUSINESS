import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import { auditAction } from "@/lib/api-guard";
import { prisma } from "@/lib/prisma";

export const GET = withApi(
  async (_request, { params }) => {
    const entityType = params?.entityType;
    const entityId = params?.entityId;
    if (!entityType || !entityId) {
      return NextResponse.json({ error: "Parametri richiesti" }, { status: 400 });
    }

    const documents = await prisma.document.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ documents });
  },
  { requireCsrf: false }
);

export const POST = withApi(
  async (request, { user, params }) => {
    const entityType = params?.entityType;
    const entityId = params?.entityId;
    if (!entityType || !entityId) {
      return NextResponse.json({ error: "Parametri richiesti" }, { status: 400 });
    }

    const body = await request.json();
    if (!body.fileName) {
      return NextResponse.json({ error: "Nome file richiesto" }, { status: 400 });
    }

    const fileUrl = body.fileUrl
      ? String(body.fileUrl)
      : `/uploads/${entityType}/${entityId}/${body.fileName}`;

    const document = await prisma.document.create({
      data: {
        entityType,
        entityId,
        fileName: String(body.fileName),
        fileUrl,
        mimeType: body.mimeType ? String(body.mimeType) : undefined,
        clientId: body.clientId ? String(body.clientId) : undefined,
        uploadedBy: user.id,
      },
    });

    await auditAction(request, user.id, "CREATE", "document", document.id, {
      entityType,
      entityId,
    });

    return NextResponse.json({ document }, { status: 201 });
  }
);
