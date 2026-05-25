import { prisma } from "@/lib/prisma";
import CalendarView from "@/components/CalendarView";
import { calculateVolume } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const since = new Date();
  since.setFullYear(since.getFullYear() - 1);

  const [workouts, foodLogs, nutritionGoals] = await Promise.all([
    prisma.workout.findMany({
      orderBy: { startedAt: "desc" },
      take: 365,
      include: {
        exercises: {
          include: { exercise: true, sets: true },
        },
      },
    }),
    prisma.foodLog.findMany({
      where: { date: { gte: since } },
      select: { date: true, calories: true },
    }),
    prisma.nutritionGoal.findMany({
      where: { date: { gte: since } },
      select: { date: true, caloriesOut: true },
    }),
  ]);

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

  // Aggregate food calories by date key yyyy-mm-dd
  function toYMD(d: Date) {
    const dd = new Date(d);
    return `${dd.getFullYear()}-${String(dd.getMonth() + 1).padStart(2, "0")}-${String(dd.getDate()).padStart(2, "0")}`;
  }

  const foodCalsByDay: Record<string, number> = {};
  for (const log of foodLogs) {
    const key = toYMD(log.date);
    foodCalsByDay[key] = (foodCalsByDay[key] ?? 0) + (log.calories ?? 0);
  }

  const caloriesOutByDay: Record<string, number> = {};
  for (const g of nutritionGoals) {
    if (g.caloriesOut != null) {
      caloriesOutByDay[toYMD(g.date)] = g.caloriesOut;
    }
  }

  return <CalendarView items={items} foodCalsByDay={foodCalsByDay} caloriesOutByDay={caloriesOutByDay} />;
}
