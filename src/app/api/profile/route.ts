import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withApi } from "@/lib/api-handler";

const PROFILE_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  avatar: true,
  mfaEnabled: true,
  createdAt: true,
  lastLoginAt: true,
  passwordChangedAt: true,
} as const;

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

    const profile = await prisma.user.findUnique({
      where: { id: user.id },
      select: PROFILE_SELECT,
    });

    if (!profile) {
      return NextResponse.json({ error: "Profilo non trovato" }, { status: 404 });
    }

    return NextResponse.json({ user: profile });
  } catch (error) {
    console.error("GET /api/profile:", error);
    return NextResponse.json(
      { error: "Errore caricamento profilo. Riavvia il server dev dopo aggiornamenti schema." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  return withApi(async (req, { user }) => {
    const body = await req.json();
    const rawName = typeof body.name === "string" ? body.name.trim() : "";

    if (rawName.length < 2) {
      return NextResponse.json({ error: "Il nome deve contenere almeno 2 caratteri" }, { status: 400 });
    }
    if (rawName.length > 120) {
      return NextResponse.json({ error: "Il nome non può superare 120 caratteri" }, { status: 400 });
    }

    const parts = rawName.split(/\s+/);
    const firstName = parts[0] ?? null;
    const lastName = parts.length > 1 ? parts.slice(1).join(" ") : null;

    const profile = await prisma.user.update({
      where: { id: user.id },
      data: { name: rawName, firstName, lastName },
      select: PROFILE_SELECT,
    });

    return NextResponse.json({ user: profile });
  })(request);
}
