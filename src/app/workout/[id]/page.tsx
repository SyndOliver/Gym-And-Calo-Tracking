import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getPreviousSetsMap } from "@/app/actions/workout";
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

  // Lấy dữ liệu sets buổi tập trước cho gợi ý placeholder
  const exerciseIds = workout.exercises.map((we) => we.exercise.id);
  const previousSetsMap = await getPreviousSetsMap(exerciseIds, id);

  return (
    <WorkoutSession
      workout={workout}
      allExercises={exercises}
      previousSetsMap={previousSetsMap}
    />
  );
}
