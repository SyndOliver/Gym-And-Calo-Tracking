"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { FoodItem } from "@/app/api/calories/analyze/route";

export interface SaveCalorieEntryInput {
  foods: FoodItem[];
  totalCalories: number;
  notes?: string;
  imageThumbnail?: string;
  date?: Date;
}

export async function saveCalorieEntry(data: SaveCalorieEntryInput) {
  const entry = await prisma.calorieEntry.create({
    data: {
      foods: data.foods,
      totalCalories: data.totalCalories,
      notes: data.notes ?? null,
      imageThumbnail: data.imageThumbnail ?? null,
      date: data.date ?? new Date(),
    },
  });
  revalidatePath("/calories");
  return entry;
}

export async function getCalorieEntries(date?: Date) {
  if (date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    return prisma.calorieEntry.findMany({
      where: { date: { gte: start, lte: end } },
      orderBy: { date: "desc" },
    });
  }

  return prisma.calorieEntry.findMany({
    orderBy: { date: "desc" },
    take: 50,
  });
}

export async function getCalorieSummaryByDate(days = 7) {
  const since = new Date();
  since.setDate(since.getDate() - days + 1);
  since.setHours(0, 0, 0, 0);

  const entries = await prisma.calorieEntry.findMany({
    where: { date: { gte: since } },
    select: { date: true, totalCalories: true },
    orderBy: { date: "asc" },
  });

  // Group theo ngày
  const map = new Map<string, number>();
  for (const e of entries) {
    const key = e.date.toISOString().slice(0, 10);
    map.set(key, (map.get(key) ?? 0) + e.totalCalories);
  }

  return Array.from(map.entries()).map(([date, totalCalories]) => ({
    date,
    totalCalories,
  }));
}

export async function deleteCalorieEntry(id: string) {
  await prisma.calorieEntry.delete({ where: { id } });
  revalidatePath("/calories");
}
