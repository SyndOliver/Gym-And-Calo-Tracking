"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { generateNutritionPlan, type NutritionPlanResult } from "@/lib/gemini";

export async function addBodyMetric(data: {
  date?: Date;
  weight?: number | null;
  height?: number | null;
  age?: number | null;
  gender?: string | null;
  bodyFat?: number | null;
  muscle?: number | null;
  chest?: number | null;
  waist?: number | null;
  hip?: number | null;
  arm?: number | null;
  thigh?: number | null;
  waterPercent?: number | null;
  visceralFat?: number | null;
  boneMineralKg?: number | null;
  proteinKg?: number | null;
  skeletalMuscleKg?: number | null;
  notes?: string;
}) {
  const bm = await prisma.bodyMetric.create({ data: { ...data, date: data.date ?? new Date() } });
  revalidatePath("/body");
  revalidatePath("/stats");
  return bm;
}

export async function deleteBodyMetric(id: string) {
  await prisma.bodyMetric.delete({ where: { id } });
  revalidatePath("/body");
  revalidatePath("/stats");
}

export async function suggestNutritionGoal(metricId: string): Promise<
  { ok: true; data: NutritionPlanResult } | { ok: false; error: string }
> {
  try {
    const m = await prisma.bodyMetric.findUnique({ where: { id: metricId } });
    if (!m) throw new Error("Không tìm thấy bản ghi chỉ số");
    const result = await generateNutritionPlan({
      weight: m.weight,
      height: m.height,
      age: m.age,
      gender: m.gender,
      bodyFat: m.bodyFat,
      muscle: m.muscle,
    });
    return { ok: true, data: result };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Lỗi không xác định" };
  }
}

export async function suggestNutritionGoalFromLatest(): Promise<
  { ok: true; data: NutritionPlanResult } | { ok: false; error: string }
> {
  try {
    const latest = await prisma.bodyMetric.findFirst({ orderBy: { date: "desc" } });
    if (!latest) {
      throw new Error("Chưa có chỉ số cơ thể nào. Vui lòng thêm chỉ số cơ thể trước tại trang /body.");
    }
    const result = await generateNutritionPlan({
      weight: latest.weight,
      height: latest.height,
      age: latest.age,
      gender: latest.gender,
      bodyFat: latest.bodyFat,
      muscle: latest.muscle,
    });
    return { ok: true, data: result };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Lỗi không xác định" };
  }
}
