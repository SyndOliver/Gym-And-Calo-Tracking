import { prisma } from "@/lib/prisma";
import BodyMetricsView from "@/components/BodyMetricsView";

export const dynamic = "force-dynamic";

export default async function BodyPage() {
  const metrics = await prisma.bodyMetric.findMany({ orderBy: { date: "desc" } });
  return <BodyMetricsView metrics={metrics} />;
}
