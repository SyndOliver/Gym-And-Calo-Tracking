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

  // Lấy dữ liệu buổi tập trước cho mỗi bài tập (số set + kg/reps)
  const exerciseIds = tpl.exercises.map((e) => e.exerciseId);
  const previousDataMap = await getLastWorkoutData(exerciseIds);

  const w = await prisma.workout.create({
    data: {
      name: tpl.name,
      templateId: tpl.id,
      exercises: {
        create: tpl.exercises.map((e, idx) => {
          const prev = previousDataMap[e.exerciseId];
          // Ưu tiên số set từ buổi trước, nếu không có thì dùng template default
          const setCount = prev ? prev.sets.length : Math.max(1, e.defaultSets);

          return {
            exerciseId: e.exerciseId,
            order: idx,
            restSeconds: e.restSeconds,
            sets: {
              create: Array.from({ length: Math.max(1, setCount) }, (_, i) => {
                const prevSet = prev?.sets.find((s) => s.setNumber === i + 1);
                return {
                  setNumber: i + 1,
                  reps: prevSet?.reps ?? e.defaultReps,
                  weight: prevSet?.weight ?? null,
                  isCompleted: false,
                };
              }),
            },
          };
        }),
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

  // Lấy dữ liệu buổi trước để gợi ý số set + kg/reps
  const previousDataMap = await getLastWorkoutData([exerciseId]);
  const prev = previousDataMap[exerciseId];

  const setsCount = Math.max(1, Math.min(20, options?.sets ?? (prev ? prev.sets.length : 3)));
  const defaultReps = options?.reps ?? null;

  const we = await prisma.workoutExercise.create({
    data: {
      workoutId,
      exerciseId,
      order: count,
      sets: {
        create: Array.from({ length: setsCount }, (_, i) => {
          const prevSet = prev?.sets.find((s) => s.setNumber === i + 1);
          return {
            setNumber: i + 1,
            reps: prevSet?.reps ?? defaultReps,
            weight: prevSet?.weight ?? null,
            isCompleted: false,
          };
        }),
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

// Lấy dữ liệu sets từ buổi tập trước cho danh sách bài tập (dùng gợi ý placeholder)
export async function getPreviousSetsMap(
  exerciseIds: string[],
  currentWorkoutId: string
): Promise<
  Record<
    string,
    { date: string; sets: { setNumber: number; weight: number | null; reps: number | null }[] }
  >
> {
  if (exerciseIds.length === 0) return {};

  const result: Record<
    string,
    { date: string; sets: { setNumber: number; weight: number | null; reps: number | null }[] }
  > = {};

  // Tìm buổi tập trước gần nhất cho mỗi exercise
  for (const exerciseId of exerciseIds) {
    const prevWe = await prisma.workoutExercise.findFirst({
      where: {
        exerciseId,
        workout: {
          id: { not: currentWorkoutId },
          finishedAt: { not: null },
        },
      },
      orderBy: { workout: { startedAt: "desc" } },
      include: {
        sets: { orderBy: { setNumber: "asc" } },
        workout: { select: { startedAt: true } },
      },
    });

    if (prevWe && prevWe.sets.length > 0) {
      result[exerciseId] = {
        date: prevWe.workout.startedAt.toISOString(),
        sets: prevWe.sets.map((s) => ({
          setNumber: s.setNumber,
          weight: s.weight,
          reps: s.reps,
        })),
      };
    }
  }

  return result;
}

// Hàm nội bộ: lấy dữ liệu buổi tập gần nhất cho mỗi exercise (số set + kg/reps)
async function getLastWorkoutData(
  exerciseIds: string[]
): Promise<
  Record<
    string,
    { sets: { setNumber: number; weight: number | null; reps: number | null }[] }
  >
> {
  if (exerciseIds.length === 0) return {};

  const result: Record<
    string,
    { sets: { setNumber: number; weight: number | null; reps: number | null }[] }
  > = {};

  for (const exerciseId of exerciseIds) {
    const prevWe = await prisma.workoutExercise.findFirst({
      where: {
        exerciseId,
        workout: {
          finishedAt: { not: null },
        },
      },
      orderBy: { workout: { startedAt: "desc" } },
      include: {
        sets: { orderBy: { setNumber: "asc" } },
      },
    });

    if (prevWe && prevWe.sets.length > 0) {
      result[exerciseId] = {
        sets: prevWe.sets.map((s) => ({
          setNumber: s.setNumber,
          weight: s.weight,
          reps: s.reps,
        })),
      };
    }
  }

  return result;
}
