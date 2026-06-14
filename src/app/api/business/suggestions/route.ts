import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getBusinessNextActions } from "@/lib/business-wow";

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

  const mine = request.nextUrl.searchParams.get("mine") === "1";
  const items = await getBusinessNextActions(mine ? user.id : undefined);
  return NextResponse.json({ items });
}
