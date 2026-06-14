import { redirect } from "next/navigation";

export default async function LeadDetailRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/business?v=lead&id=${id}`);
}
