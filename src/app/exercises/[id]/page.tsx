import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ExerciseDetail from "@/components/ExerciseDetail";

export const dynamic = "force-dynamic";

export default async function ExerciseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const exercise = await prisma.exercise.findUnique({ where: { id } });
  if (!exercise) notFound();

  // Get all sets for this exercise to compute history
  const sets = await prisma.setEntry.findMany({
    where: {
      isCompleted: true,
      workoutExercise: { exerciseId: id },
    },
    orderBy: { completedAt: "desc" },
    take: 200,
    include: {
      workoutExercise: {
        include: { workout: true },
      },
    },
  });

  return <ExerciseDetail exercise={exercise} sets={sets} />;
}
