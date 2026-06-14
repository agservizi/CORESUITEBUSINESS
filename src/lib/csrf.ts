import { randomBytes } from "crypto";
import { cookies } from "next/headers";

const CSRF_COOKIE = "coresuite-csrf";

export function generateCsrfToken() {
  return randomBytes(32).toString("hex");
}

export async function setCsrfCookie(token: string) {
  const store = await cookies();
  store.set(CSRF_COOKIE, token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24,
  });
}

export async function validateCsrfToken(headerToken?: string | null) {
  const store = await cookies();
  const cookieToken = store.get(CSRF_COOKIE)?.value;
  if (!cookieToken || !headerToken) return false;
  return cookieToken === headerToken;
}
