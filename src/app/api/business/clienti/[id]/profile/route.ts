import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getBusinessClientProfile } from "@/lib/business-wow";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  const { id } = await params;

  const profile = await getBusinessClientProfile(id);
  if (!profile) return NextResponse.json({ error: "Cliente non trovato" }, { status: 404 });

  return NextResponse.json({ client: profile });
}
