import { NextResponse } from "next/server";
import { getSessionCookieBase } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json({ success: true });
  const cookieBase = getSessionCookieBase(0);
  response.cookies.set("coresuite-token", "", { ...cookieBase, maxAge: 0 });
  response.cookies.set("coresuite-csrf", "", { ...cookieBase, maxAge: 0, httpOnly: false });
  return response;
}
