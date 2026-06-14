import { redirect } from "next/navigation";

export default async function ClienteDetailRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/business?v=clienti&id=${id}`);
}
