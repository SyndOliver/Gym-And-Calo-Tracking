import { prisma } from "@/lib/prisma";
import TemplatesView from "@/components/TemplatesView";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const [templates, exercises] = await Promise.all([
    prisma.template.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        exercises: {
          orderBy: { order: "asc" },
          include: { exercise: true },
        },
      },
    }),
    prisma.exercise.findMany({ orderBy: [{ muscleGroup: "asc" }, { name: "asc" }] }),
  ]);

  return <TemplatesView templates={templates} exercises={exercises} />;
}
