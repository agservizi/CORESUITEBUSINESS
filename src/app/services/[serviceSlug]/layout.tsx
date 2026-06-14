import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPlatformService } from "@/config/platform-services";
import { canAccessService } from "@/lib/roles";
import PlatformLayoutClient from "./PlatformLayoutClient";

export default async function ServiceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ serviceSlug: string }>;
}) {
  const { serviceSlug } = await params;
  const service = getPlatformService(serviceSlug);

  if (!service || service.status !== "active" || !service.url.startsWith("/services/")) {
    notFound();
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("coresuite-token")?.value;
  if (!token) redirect("/login");

  const payload = await verifyToken(token);
  if (!payload) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, name: true, role: true, avatar: true },
  });
  if (!user) redirect("/login");

  if (!canAccessService(user.role, service.roles)) {
    redirect("/dashboard");
  }

  return (
    <PlatformLayoutClient serviceSlug={serviceSlug} user={user}>
      {children}
    </PlatformLayoutClient>
  );
}
