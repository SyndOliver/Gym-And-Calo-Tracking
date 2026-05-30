import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/PageHeader";
import FoodLogView from "@/components/FoodLogView";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ date?: string }>;
};

export default async function FoodPage({ searchParams }: Props) {
  const params = await searchParams;

  const target = params.date ? new Date(params.date) : new Date();
  target.setHours(0, 0, 0, 0);
  const nextDay = new Date(target);
  nextDay.setDate(nextDay.getDate() + 1);

  const [logs, goal, templates, favorites] = await Promise.all([
    prisma.foodLog.findMany({
      where: { date: { gte: target, lt: nextDay } },
      orderBy: { date: "asc" },
    }),
    prisma.nutritionGoal.findFirst({
      where: { date: { gte: target, lt: nextDay } },
    }),
    prisma.nutritionGoalTemplate.findMany(),
    prisma.favoriteMeal.findMany({
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dinh dưỡng"
        subtitle="Theo dõi calories & macros"
        emoji="🍽️"
      />
      <FoodLogView
        initialLogs={logs}
        initialDateISO={target.toISOString()}
        initialGoal={
          goal
            ? {
                calories: goal.calories,
                protein: goal.protein,
                fat: goal.fat,
                carbs: goal.carbs,
                fiber: goal.fiber,
                waterGoalMl: goal.waterGoalMl,
                waterLogMl: goal.waterLogMl,
              }
            : null
        }
        initialTemplates={templates.map((t) => ({
          id: t.id,
          type: t.type,
          name: t.name,
          calories: t.calories,
          protein: t.protein,
          fat: t.fat,
          carbs: t.carbs,
          fiber: t.fiber,
          waterGoalMl: t.waterGoalMl,
        }))}
        initialFavorites={favorites.map((f) => ({
          id: f.id,
          name: f.name,
          servingDescription: f.servingDescription,
          calories: f.calories,
          protein: f.protein,
          fat: f.fat,
          carbs: f.carbs,
          fiber: f.fiber,
          mealType: f.mealType,
        }))}
      />
    </div>
  );
}
