import ExpressMobileScanPage from "@/components/platform/express/ExpressMobileScanPage";

export const dynamic = "force-dynamic";

export default async function ExpressScanPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return <ExpressMobileScanPage token={token?.trim() || ""} />;
}
