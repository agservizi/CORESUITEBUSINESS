import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createToken } from "@/lib/auth";
import {
  logLoginAttempt,
  checkLoginLock,
  registerFailedLogin,
  clearLoginAttempts,
} from "@/lib/audit";
import { getPostLoginRedirect } from "@/lib/roles";
import { generateCsrfToken } from "@/lib/csrf";
import { verifyMfaToken } from "@/lib/mfa";
import { SignJWT, jwtVerify } from "jose";

const MFA_PENDING_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || "coresuite-mfa-pending"
);

async function createMfaPendingToken(userId: string) {
  return new SignJWT({ userId, purpose: "mfa" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("5m")
    .sign(MFA_PENDING_SECRET);
}

async function verifyMfaPendingToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, MFA_PENDING_SECRET);
    if (payload.purpose !== "mfa") return null;
    return payload.userId as string;
  } catch {
    return null;
  }
}

function setSessionCookies(
  response: NextResponse,
  token: string,
  csrfToken: string,
  rememberMe?: boolean
) {
  const maxAge = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7;
  response.cookies.set("coresuite-token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge,
    path: "/",
  });
  response.cookies.set("coresuite-csrf", csrfToken, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24,
    path: "/",
  });
}

function getClientIp(request: NextRequest) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    undefined
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, mfaCode, mfaToken, rememberMe } = body;

    const ipAddress = getClientIp(request);
    const userAgent = request.headers.get("user-agent") || undefined;

    if (mfaToken && mfaCode) {
      const userId = await verifyMfaPendingToken(String(mfaToken));
      if (!userId) {
        return NextResponse.json({ error: "Sessione MFA scaduta. Riprova il login." }, { status: 401 });
      }

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user?.mfaSecret || !verifyMfaToken(user.mfaSecret, String(mfaCode))) {
        return NextResponse.json({ error: "Codice MFA non valido" }, { status: 401 });
      }

      await clearLoginAttempts(user.email, ipAddress);
      await logLoginAttempt({ email: user.email, success: true, userId: user.id, ipAddress, userAgent });
      await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

      const token = await createToken(user.id);
      const csrfToken = generateCsrfToken();
      const response = NextResponse.json({
        success: true,
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
        redirectTo: getPostLoginRedirect(user.role),
      });
      setSessionCookies(response, token, csrfToken, Boolean(rememberMe));
      return response;
    }

    if (!email || !password) {
      return NextResponse.json({ error: "Email e password sono richiesti" }, { status: 400 });
    }

    const lock = await checkLoginLock(email, ipAddress);
    if (lock.locked) {
      return NextResponse.json(
        { error: "Account temporaneamente bloccato. Riprova tra qualche minuto." },
        { status: 429 }
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      await logLoginAttempt({
        email,
        success: false,
        ipAddress,
        userAgent,
        reason: "user_not_found",
      });
      await registerFailedLogin(email, ipAddress);
      return NextResponse.json({ error: "Credenziali non valide" }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.password);
    if (!valid) {
      await logLoginAttempt({
        email,
        success: false,
        userId: user.id,
        ipAddress,
        userAgent,
        reason: "invalid_password",
      });
      await registerFailedLogin(email, ipAddress);
      return NextResponse.json({ error: "Credenziali non valide" }, { status: 401 });
    }

    await clearLoginAttempts(email, ipAddress);
    await logLoginAttempt({
      email,
      success: true,
      userId: user.id,
      ipAddress,
      userAgent,
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    if (user.mfaEnabled && user.mfaSecret) {
      const pending = await createMfaPendingToken(user.id);
      return NextResponse.json({
        mfaRequired: true,
        mfaToken: pending,
        email: user.email,
      });
    }

    const token = await createToken(user.id);
    const csrfToken = generateCsrfToken();
    const redirectTo = getPostLoginRedirect(user.role);

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      redirectTo,
    });

    setSessionCookies(response, token, csrfToken, Boolean(rememberMe));

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Errore interno del server" }, { status: 500 });
  }
}
