"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function addBodyMetric(data: {
  date?: Date;
  weight?: number | null;
  bodyFat?: number | null;
  muscle?: number | null;
  chest?: number | null;
  waist?: number | null;
  hip?: number | null;
  arm?: number | null;
  thigh?: number | null;
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
