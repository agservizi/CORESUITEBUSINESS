import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getCrmStaffLeaderboard } from "@/lib/business-wow";

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

  const period = request.nextUrl.searchParams.get("period") === "day" ? "day" : "month";
  const items = await getCrmStaffLeaderboard(period);
  return NextResponse.json({ items, period });
}
