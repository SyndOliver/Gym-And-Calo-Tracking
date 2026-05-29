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

export async function analyzeExerciseProgress(exerciseId: string) {
  const { analyzeExerciseData } = await import("@/lib/gemini");

  const exercise = await prisma.exercise.findUnique({
    where: { id: exerciseId },
    select: { name: true },
  });
  if (!exercise) throw new Error("Bài tập không tồn tại");

  const sets = await prisma.setEntry.findMany({
    where: {
      isCompleted: true,
      workoutExercise: { exerciseId },
    },
    orderBy: { completedAt: "asc" },
    include: {
      workoutExercise: {
        include: { workout: { select: { id: true, startedAt: true } } },
      },
    },
  });

  if (sets.length < 2) {
    return {
      summary: "Chưa đủ dữ liệu để phân tích. Hãy tập thêm ít nhất 2 buổi để xem phân tích AI.",
      suggestions: ["Tiếp tục tập đều đặn để hệ thống thu thập dữ liệu phân tích."],
      warnings: [],
    };
  }

  // Group sets by workout
  const byWorkout = new Map<
    string,
    { date: Date; sets: { reps: number | null; weight: number | null }[] }
  >();

  for (const s of sets) {
    const wid = s.workoutExercise.workout.id;
    if (!byWorkout.has(wid)) {
      byWorkout.set(wid, {
        date: s.workoutExercise.workout.startedAt,
        sets: [],
      });
    }
    byWorkout.get(wid)!.sets.push({ reps: s.reps, weight: s.weight });
  }

  // Calculate per-session metrics
  const sessions = Array.from(byWorkout.values())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-30) // last 30 sessions max
    .map((w) => {
      let volume = 0;
      let bestE1rm = 0;
      let maxWeight = 0;
      let totalReps = 0;
      let totalSets = 0;

      for (const s of w.sets) {
        if (s.weight && s.reps) {
          volume += s.weight * s.reps;
          const e1rm =
            s.reps === 1
              ? s.weight
              : Math.round(s.weight * (1 + s.reps / 30));
          if (e1rm > bestE1rm) bestE1rm = e1rm;
          if (s.weight > maxWeight) maxWeight = s.weight;
          totalReps += s.reps;
          totalSets++;
        }
      }

      return {
        date: new Date(w.date).toLocaleDateString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }),
        volume: Math.round(volume),
        e1rm: bestE1rm,
        maxWeight,
        totalSets,
        totalReps,
      };
    });

  return analyzeExerciseData(exercise.name, sessions);
}
