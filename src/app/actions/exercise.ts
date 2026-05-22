"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createExercise(data: {
  name: string;
  muscleGroup: string;
  primaryMuscle?: string;
  equipment?: string;
  instructions?: string;
  videoUrl?: string;
}) {
  const ex = await prisma.exercise.create({
    data: { ...data, isCustom: true },
  });
  revalidatePath("/exercises");
  return ex;
}

export async function deleteExercise(id: string) {
  await prisma.exercise.delete({ where: { id } });
  revalidatePath("/exercises");
}

export async function updateExercise(
  id: string,
  data: {
    name?: string;
    muscleGroup?: string;
    primaryMuscle?: string | null;
    equipment?: string | null;
    instructions?: string | null;
    videoUrl?: string | null;
  }
) {
  const ex = await prisma.exercise.update({ where: { id }, data });
  revalidatePath("/exercises");
  revalidatePath(`/exercises/${id}`);
  return ex;
}

export async function setExerciseVideo(id: string, videoUrl: string | null) {
  await prisma.exercise.update({
    where: { id },
    data: { videoUrl: videoUrl?.trim() ? videoUrl.trim() : null },
  });
  revalidatePath("/exercises");
  revalidatePath(`/exercises/${id}`);
}
