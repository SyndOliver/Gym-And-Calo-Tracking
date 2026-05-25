import { prisma } from "@/lib/prisma";
import BodyMetricsView from "@/components/BodyMetricsView";

export const dynamic = "force-dynamic";

export default async function BodyPage() {
  const metrics = await prisma.bodyMetric.findMany({
    orderBy: { date: "desc" },
    select: {
      id: true,
      date: true,
      weight: true,
      height: true,
      age: true,
      gender: true,
      bodyFat: true,
      muscle: true,
      chest: true,
      waist: true,
      hip: true,
      arm: true,
      thigh: true,
      waterPercent: true,
      visceralFat: true,
      boneMineralKg: true,
      proteinKg: true,
      skeletalMuscleKg: true,
      notes: true,
    },
  });
  return <BodyMetricsView metrics={metrics} />;
}
