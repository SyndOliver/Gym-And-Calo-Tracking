import { prisma } from "@/lib/prisma";
import CalendarView from "@/components/CalendarView";
import { calculateVolume } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const workouts = await prisma.workout.findMany({
    orderBy: { startedAt: "desc" },
    take: 365,
    include: {
      exercises: {
        include: { exercise: true, sets: true },
      },
    },
  });

  const items = workouts.map((w) => ({
    id: w.id,
    name: w.name,
    startedAt: w.startedAt,
    finishedAt: w.finishedAt,
    durationSec: w.durationSec,
    muscleGroups: Array.from(new Set(w.exercises.map((e) => e.exercise.muscleGroup))),
    exerciseCount: w.exercises.length,
    totalSets: w.exercises.reduce((s, e) => s + e.sets.length, 0),
    totalVolume: w.exercises.reduce(
      (s, e) => s + e.sets.reduce((ss, st) => ss + calculateVolume(st.reps, st.weight), 0),
      0
    ),
  }));

  return <CalendarView items={items} />;
}
