"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function startEmptyWorkout(name?: string) {
  const w = await prisma.workout.create({
    data: { name: name || "Buổi tập" },
  });
  revalidatePath("/");
  return w;
}

export async function startWorkoutFromTemplate(templateId: string) {
  const tpl = await prisma.template.findUnique({
    where: { id: templateId },
    include: { exercises: { orderBy: { order: "asc" } } },
  });
  if (!tpl) throw new Error("Template không tồn tại");

  const w = await prisma.workout.create({
    data: {
      name: tpl.name,
      templateId: tpl.id,
      exercises: {
        create: tpl.exercises.map((e, idx) => ({
          exerciseId: e.exerciseId,
          order: idx,
          restSeconds: e.restSeconds,
          sets: {
            create: Array.from({ length: Math.max(1, e.defaultSets) }, (_, i) => ({
              setNumber: i + 1,
              reps: e.defaultReps,
              weight: null,
              isCompleted: false,
            })),
          },
        })),
      },
    },
    include: { exercises: { include: { sets: true } } },
  });
  revalidatePath("/");
  return w;
}

export async function finishWorkout(workoutId: string) {
  const w = await prisma.workout.findUnique({ where: { id: workoutId } });
  if (!w) throw new Error("Không tìm thấy buổi tập");
  const finishedAt = new Date();
  const durationSec = Math.round((finishedAt.getTime() - new Date(w.startedAt).getTime()) / 1000);

  // Tự động hoàn thành tất cả các set của buổi tập này
  await prisma.setEntry.updateMany({
    where: {
      workoutExercise: {
        workoutId: workoutId,
      },
    },
    data: {
      isCompleted: true,
      completedAt: finishedAt,
    },
  });

  await prisma.workout.update({
    where: { id: workoutId },
    data: { finishedAt, durationSec },
  });

  revalidatePath("/");
  revalidatePath("/workout");
  revalidatePath("/stats");
  revalidatePath("/calendar");
}

export async function deleteWorkout(workoutId: string) {
  await prisma.workout.delete({ where: { id: workoutId } });
  revalidatePath("/");
  revalidatePath("/workout");
  revalidatePath("/stats");
  revalidatePath("/calendar");
}

export async function updateWorkoutName(workoutId: string, name: string) {
  await prisma.workout.update({ where: { id: workoutId }, data: { name } });
  revalidatePath(`/workout/${workoutId}`);
}

export async function updateWorkoutNotes(workoutId: string, notes: string) {
  await prisma.workout.update({ where: { id: workoutId }, data: { notes } });
}

export async function addExerciseToWorkout(
  workoutId: string,
  exerciseId: string,
  options?: { sets?: number; reps?: number | null }
) {
  const count = await prisma.workoutExercise.count({ where: { workoutId } });
  const setsCount = Math.max(1, Math.min(20, options?.sets ?? 3));
  const reps = options?.reps ?? null;

  const we = await prisma.workoutExercise.create({
    data: {
      workoutId,
      exerciseId,
      order: count,
      sets: {
        create: Array.from({ length: setsCount }, (_, i) => ({
          setNumber: i + 1,
          reps,
          weight: null,
          isCompleted: false,
        })),
      },
    },
  });
  revalidatePath(`/workout/${workoutId}`);
  return we;
}

// Điều chỉnh tổng số sets của 1 bài về N (thêm hoặc xoá từ cuối)
export async function setExerciseSetCount(workoutExerciseId: string, target: number) {
  const targetCount = Math.max(0, Math.min(20, Math.floor(target)));
  const we = await prisma.workoutExercise.findUnique({
    where: { id: workoutExerciseId },
    include: { sets: { orderBy: { setNumber: "asc" } } },
  });
  if (!we) return;
  const current = we.sets.length;

  if (targetCount > current) {
    const last = we.sets[we.sets.length - 1];
    const toAdd = targetCount - current;
    await prisma.setEntry.createMany({
      data: Array.from({ length: toAdd }, (_, i) => ({
        workoutExerciseId,
        setNumber: current + i + 1,
        reps: last?.reps ?? null,
        weight: last?.weight ?? null,
        isCompleted: false,
      })),
    });
  } else if (targetCount < current) {
    const toRemove = we.sets.slice(targetCount);
    await prisma.setEntry.deleteMany({
      where: { id: { in: toRemove.map((s) => s.id) } },
    });
  }

  revalidatePath(`/workout/${we.workoutId}`);
}

// Áp 1 giá trị reps cho TẤT CẢ sets chưa hoàn thành của 1 bài
export async function bulkSetReps(workoutExerciseId: string, reps: number | null) {
  const we = await prisma.workoutExercise.findUnique({
    where: { id: workoutExerciseId },
  });
  if (!we) return;
  await prisma.setEntry.updateMany({
    where: { workoutExerciseId, isCompleted: false },
    data: { reps },
  });
  revalidatePath(`/workout/${we.workoutId}`);
}

export async function removeExerciseFromWorkout(workoutExerciseId: string) {
  const we = await prisma.workoutExercise.findUnique({ where: { id: workoutExerciseId } });
  if (!we) return;
  await prisma.workoutExercise.delete({ where: { id: workoutExerciseId } });
  revalidatePath(`/workout/${we.workoutId}`);
}

export async function updateExerciseRest(workoutExerciseId: string, restSeconds: number) {
  await prisma.workoutExercise.update({
    where: { id: workoutExerciseId },
    data: { restSeconds },
  });
}

export async function addSet(
  workoutExerciseId: string,
  data?: { reps?: number | null; weight?: number | null }
) {
  const count = await prisma.setEntry.count({ where: { workoutExerciseId } });
  const last = await prisma.setEntry.findFirst({
    where: { workoutExerciseId },
    orderBy: { setNumber: "desc" },
  });
  const set = await prisma.setEntry.create({
    data: {
      workoutExerciseId,
      setNumber: count + 1,
      reps: data?.reps ?? last?.reps ?? null,
      weight: data?.weight ?? last?.weight ?? null,
      isCompleted: false,
    },
  });
  const we = await prisma.workoutExercise.findUnique({ where: { id: workoutExerciseId } });
  if (we) revalidatePath(`/workout/${we.workoutId}`);
  return set;
}

export async function updateSet(
  setId: string,
  data: {
    reps?: number | null;
    weight?: number | null;
    isCompleted?: boolean;
    rpe?: number | null;
  }
) {
  const updated = await prisma.setEntry.update({
    where: { id: setId },
    data: {
      ...data,
      completedAt: data.isCompleted ? new Date() : undefined,
    },
    include: { workoutExercise: true },
  });
  if (updated.workoutExercise)
    revalidatePath(`/workout/${updated.workoutExercise.workoutId}`);
  return updated;
}

export async function deleteSet(setId: string) {
  const set = await prisma.setEntry.findUnique({
    where: { id: setId },
    include: { workoutExercise: true },
  });
  if (!set) return;
  await prisma.setEntry.delete({ where: { id: setId } });

  // Renumber remaining sets
  const remaining = await prisma.setEntry.findMany({
    where: { workoutExerciseId: set.workoutExerciseId },
    orderBy: { setNumber: "asc" },
  });
  await Promise.all(
    remaining.map((s, idx) =>
      prisma.setEntry.update({ where: { id: s.id }, data: { setNumber: idx + 1 } })
    )
  );
  if (set.workoutExercise) revalidatePath(`/workout/${set.workoutExercise.workoutId}`);
}
