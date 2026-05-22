import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import WorkoutSession from "@/components/WorkoutSession";

export const dynamic = "force-dynamic";

export default async function WorkoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [workout, exercises] = await Promise.all([
    prisma.workout.findUnique({
      where: { id },
      include: {
        exercises: {
          orderBy: { order: "asc" },
          include: {
            exercise: true,
            sets: { orderBy: { setNumber: "asc" } },
          },
        },
      },
    }),
    prisma.exercise.findMany({ orderBy: [{ muscleGroup: "asc" }, { name: "asc" }] }),
  ]);

  if (!workout) notFound();

  return <WorkoutSession workout={workout} allExercises={exercises} />;
}
