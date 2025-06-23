import HistoryDetailWrapper from "@/src/components/customer/estimate/HistoryDetailWrapper";

export const dynamic = "force-dynamic";

export default async function HistoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <HistoryDetailWrapper requestId={id} />;
}
