"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createTemplate(data: {
  name: string;
  description?: string;
  emoji?: string;
  exerciseIds: string[];
}) {
  const tpl = await prisma.template.create({
    data: {
      name: data.name,
      description: data.description,
      emoji: data.emoji || "💪",
      exercises: {
        create: data.exerciseIds.map((eid, idx) => ({
          exerciseId: eid,
          order: idx,
        })),
      },
    },
  });
  revalidatePath("/templates");
  return tpl;
}

export async function deleteTemplate(id: string) {
  await prisma.template.delete({ where: { id } });
  revalidatePath("/templates");
}

export async function updateTemplateExercise(
  id: string,
  data: { defaultSets?: number; defaultReps?: number; restSeconds?: number }
) {
  await prisma.templateExercise.update({ where: { id }, data });
}
