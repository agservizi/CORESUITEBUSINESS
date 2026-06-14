import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "./api-guard";
import { validateCsrfToken } from "./csrf";
import { userHasServiceAccess } from "./permissions";
import { getSessionUser } from "./auth";

type SessionUser = NonNullable<Awaited<ReturnType<typeof getSessionUser>>>;

type Handler = (
  request: NextRequest,
  context: { user: SessionUser; params?: Record<string, string> }
) => Promise<NextResponse>;

interface ApiOptions {
  requireCsrf?: boolean;
  serviceSlug?: string;
  roles?: string[];
}

export function withApi(handler: Handler, options: ApiOptions = {}) {
  return async (request: NextRequest, routeContext?: { params?: Promise<Record<string, string>> }) => {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    if (options.requireCsrf !== false && ["POST", "PATCH", "PUT", "DELETE"].includes(request.method)) {
      const csrfHeader = request.headers.get("x-csrf-token");
      const valid = await validateCsrfToken(csrfHeader);
      if (!valid) {
        return NextResponse.json({ error: "Token CSRF non valido" }, { status: 403 });
      }
    }

    if (options.roles?.length && auth.user.role !== "SUPER_ADMIN") {
      if (!options.roles.includes(auth.user.role)) {
        return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
      }
    }

    if (options.serviceSlug) {
      const allowed = await userHasServiceAccess(auth.user.id, auth.user.role, options.serviceSlug);
      if (!allowed) {
        return NextResponse.json({ error: "Accesso al servizio negato" }, { status: 403 });
      }
    }

    const params = routeContext?.params ? await routeContext.params : undefined;
    return handler(request, { user: auth.user, params });
  };
}

export async function getClientIdForUser(user: { id: string; role: string; email: string; clientId?: string | null }) {
  if (user.clientId) return user.clientId;
  const u = await import("./prisma").then((m) =>
    m.prisma.user.findUnique({ where: { id: user.id }, select: { clientId: true } })
  );
  if (u?.clientId) return u.clientId;
  const byEmail = await import("./prisma").then((m) =>
    m.prisma.client.findFirst({ where: { email: user.email }, select: { id: true } })
  );
  return byEmail?.id ?? null;
}
