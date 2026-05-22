import { prisma } from "@/lib/prisma";
import ExerciseLibrary from "@/components/ExerciseLibrary";

export const dynamic = "force-dynamic";

export default async function ExercisesPage() {
  const exercises = await prisma.exercise.findMany({
    orderBy: [{ muscleGroup: "asc" }, { name: "asc" }],
  });
  return <ExerciseLibrary exercises={exercises} />;
}
