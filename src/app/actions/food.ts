"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { analyzeFoodImage, analyzeFoodText, type FoodAnalysisResult } from "@/lib/gemini";

const MAX_CALORIES = 10000;
const MAX_MACRO_GRAMS = 1000;
const MAX_HEALTH_SCORE = 10;

function parseFoodDate(input: string): Date {
  // Keep local day stable when receiving yyyy-mm-dd from date input.
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return new Date(`${input}T12:00:00`);
  }
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Ngày không hợp lệ");
  }
  return parsed;
}

function sanitizeNutritionValue(
  value: number | undefined,
  label: string,
  max: number
): number | null {
  if (value === undefined) return null;
  if (!Number.isFinite(value)) {
    throw new Error(`${label} không hợp lệ`);
  }
  if (value < 0) {
    throw new Error(`${label} không được âm`);
  }
  if (value > max) {
    throw new Error(`${label} vượt quá giới hạn cho phép`);
  }
  return value;
}

export async function analyzeFood(
  imageBase64: string,
  mimeType: string
): Promise<{ ok: true; data: FoodAnalysisResult } | { ok: false; error: string }> {
  try {
    const data = await analyzeFoodImage(imageBase64, mimeType);
    return { ok: true, data };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Lỗi không xác định",
    };
  }
}

export async function analyzeFoodByText(
  foodName: string
): Promise<{ ok: true; data: FoodAnalysisResult } | { ok: false; error: string }> {
  try {
    const data = await analyzeFoodText(foodName);
    return { ok: true, data };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Lỗi không xác định",
    };
  }
}

export async function addFoodLog(data: {
  name: string;
  servingDescription?: string;
  calories?: number;
  protein?: number;
  fat?: number;
  carbs?: number;
  fiber?: number;
  healthyScore?: number;
  mealType?: string;
  notes?: string;
  date: string;
}) {
  const name = data.name.trim();
  if (!name) {
    throw new Error("Tên món ăn là bắt buộc");
  }

  const log = await prisma.foodLog.create({
    data: {
      name,
      servingDescription: data.servingDescription?.trim() || null,
      calories: sanitizeNutritionValue(data.calories, "Calories", MAX_CALORIES),
      protein: sanitizeNutritionValue(data.protein, "Protein", MAX_MACRO_GRAMS),
      fat: sanitizeNutritionValue(data.fat, "Fat", MAX_MACRO_GRAMS),
      carbs: sanitizeNutritionValue(data.carbs, "Carbs", MAX_MACRO_GRAMS),
      fiber: sanitizeNutritionValue(data.fiber, "Fiber", MAX_MACRO_GRAMS),
      healthyScore: sanitizeNutritionValue(data.healthyScore, "Healthy score", MAX_HEALTH_SCORE),
      mealType: data.mealType ?? "other",
      notes: data.notes?.trim() || null,
      date: parseFoodDate(data.date),
    },
  });
  revalidatePath("/food");
  revalidatePath("/stats");
  return log;
}

export async function deleteFoodLog(id: string) {
  await prisma.foodLog.delete({ where: { id } });
  revalidatePath("/food");
  revalidatePath("/stats");
}

export async function saveNutritionGoal(data: {
  date: string;
  calories?: number;
  protein?: number;
  fat?: number;
  carbs?: number;
  fiber?: number;
  waterGoalMl?: number;
}) {
  const date = parseFoodDate(data.date);

  const MAX_WATER_ML = 10000;
  const waterGoalMl =
    data.waterGoalMl !== undefined
      ? Math.max(0, Math.min(MAX_WATER_ML, Math.round(data.waterGoalMl)))
      : undefined;

  const fields = {
    calories: sanitizeNutritionValue(data.calories, "Mục tiêu calories", MAX_CALORIES),
    protein: sanitizeNutritionValue(data.protein, "Mục tiêu protein", MAX_MACRO_GRAMS),
    fat: sanitizeNutritionValue(data.fat, "Mục tiêu fat", MAX_MACRO_GRAMS),
    carbs: sanitizeNutritionValue(data.carbs, "Mục tiêu carbs", MAX_MACRO_GRAMS),
    fiber: sanitizeNutritionValue(data.fiber, "Mục tiêu fiber", MAX_MACRO_GRAMS),
    ...(waterGoalMl !== undefined ? { waterGoalMl } : {}),
  };

  const goal = await prisma.nutritionGoal.upsert({
    where: { date },
    create: { date, ...fields },
    update: fields,
  });

  revalidatePath("/food");
  revalidatePath("/stats");
  return goal;
}

export async function logWater(date: string, ml: number) {
  if (!Number.isFinite(ml) || Math.abs(ml) > 10000) {
    throw new Error("Lượng nước không hợp lệ");
  }
  const delta = Math.round(ml);
  if (delta === 0) return;
  const parsedDate = parseFoodDate(date);

  const existing = await prisma.nutritionGoal.findFirst({
    where: {
      date: {
        gte: new Date(parsedDate.toDateString()),
        lt: new Date(new Date(parsedDate.toDateString()).getTime() + 86400000),
      },
    },
  });

  if (existing) {
    const newWater = Math.max(0, (existing.waterLogMl ?? 0) + delta);
    await prisma.nutritionGoal.update({
      where: { id: existing.id },
      data: { waterLogMl: Math.min(newWater, 10000) },
    });
  } else {
    await prisma.nutritionGoal.create({
      data: {
        date: parsedDate,
        waterLogMl: Math.min(Math.max(0, delta), 10000),
      },
    });
  }

  revalidatePath("/food");
}

export async function getNutritionGoalTemplates() {
  const templates = await prisma.nutritionGoalTemplate.findMany();
  return templates;
}

export async function saveNutritionGoalTemplate(data: {
  type: "workout_day" | "rest_day";
  name: string;
  calories?: number;
  protein?: number;
  fat?: number;
  carbs?: number;
  fiber?: number;
  waterGoalMl?: number;
}) {
  const MAX_WATER_ML = 10000;

  const fields = {
    name: data.name.trim(),
    calories: sanitizeNutritionValue(data.calories, "Calories", MAX_CALORIES),
    protein: sanitizeNutritionValue(data.protein, "Protein", MAX_MACRO_GRAMS),
    fat: sanitizeNutritionValue(data.fat, "Fat", MAX_MACRO_GRAMS),
    carbs: sanitizeNutritionValue(data.carbs, "Carbs", MAX_MACRO_GRAMS),
    fiber: sanitizeNutritionValue(data.fiber, "Fiber", MAX_MACRO_GRAMS),
    waterGoalMl:
      data.waterGoalMl !== undefined
        ? Math.max(0, Math.min(MAX_WATER_ML, Math.round(data.waterGoalMl)))
        : 2000,
  };

  const tpl = await prisma.nutritionGoalTemplate.upsert({
    where: { type: data.type },
    create: { type: data.type, ...fields },
    update: fields,
  });

  revalidatePath("/food");
  return tpl;
}

export async function saveCaloriesOut(date: string, caloriesOut: number) {
  if (!Number.isFinite(caloriesOut) || caloriesOut < 0 || caloriesOut > 20000) {
    throw new Error("Calories tiêu thụ không hợp lệ");
  }
  const parsedDate = parseFoodDate(date);
  const value = Math.round(caloriesOut);

  await prisma.nutritionGoal.upsert({
    where: { date: parsedDate },
    create: { date: parsedDate, caloriesOut: value },
    update: { caloriesOut: value },
  });

  revalidatePath("/calendar");
  revalidatePath("/stats");
}
