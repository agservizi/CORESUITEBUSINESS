import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import {
  assignCollaboratorClient,
  listCollaboratorLinks,
  listCollaborators,
  removeCollaboratorClient,
} from "@/lib/platform/opportunities-service";

export const GET = withApi(
  async (request, { user }) => {
    const { searchParams } = new URL(request.url);
    const collaboratorId = searchParams.get("collaboratorId") || undefined;

    if (user.role === "COLLABORATORE") {
      const links = await listCollaboratorLinks(user.id);
      return NextResponse.json({ links, collaborators: [] });
    }

    const [links, collaborators] = await Promise.all([
      listCollaboratorLinks(collaboratorId),
      listCollaborators(),
    ]);
    return NextResponse.json({ links, collaborators });
  },
  { requireCsrf: false, serviceSlug: "opportunities" }
);

export const POST = withApi(async (request, { user }) => {
  if (user.role === "COLLABORATORE") {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const body = await request.json();
  if (!body.collaboratorId || !body.clientId) {
    return NextResponse.json({ error: "collaboratorId e clientId richiesti" }, { status: 400 });
  }

  const link = await assignCollaboratorClient(String(body.collaboratorId), String(body.clientId));
  return NextResponse.json({ link }, { status: 201 });
});

export const DELETE = withApi(async (request, { user }) => {
  if (user.role === "COLLABORATORE") {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const collaboratorId = searchParams.get("collaboratorId");
  const clientId = searchParams.get("clientId");
  if (!collaboratorId || !clientId) {
    return NextResponse.json({ error: "Parametri mancanti" }, { status: 400 });
  }

  await removeCollaboratorClient(collaboratorId, clientId);
  return NextResponse.json({ success: true });
});
