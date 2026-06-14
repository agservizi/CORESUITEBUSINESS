import { NextRequest } from "next/server";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || "coresuite-secret"
);

function getCookieDomain(): string | undefined {
  const root =
    process.env.PLATFORM_ROOT_DOMAIN ||
    process.env.NEXT_PUBLIC_PLATFORM_ROOT_DOMAIN;
  if (process.env.NODE_ENV === "production" && root) {
    return `.${root}`;
  }
  return undefined;
}

export function getSessionCookieBase(maxAge: number) {
  const domain = getCookieDomain();
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge,
    path: "/",
    ...(domain ? { domain } : {}),
  };
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hashed: string) {
  return bcrypt.compare(password, hashed);
}

export async function createToken(userId: string) {
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .setIssuedAt()
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as { userId: string };
  } catch {
    return null;
  }
}

export async function getSessionUser(request: NextRequest) {
  const token = request.cookies.get("coresuite-token")?.value;
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      avatar: true,
      clientId: true,
      mfaEnabled: true,
      permissions: {
        include: { service: true },
      },
    },
  });

  return user;
}
