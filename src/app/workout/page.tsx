import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ArrowRight, PlayCircle } from "lucide-react";
import {
  formatRelativeDay,
  formatLongDuration,
  getMuscleGroupInfo,
  calculateVolume,
} from "@/lib/utils";
import StartWorkoutButtons from "@/components/StartWorkoutButtons";
import ResumeWorkoutBanner from "@/components/ResumeWorkoutBanner";
import PageHeader from "@/components/PageHeader";

export const dynamic = "force-dynamic";

export default async function WorkoutListPage() {
  const [active, all, templates] = await Promise.all([
    prisma.workout.findFirst({
      where: { finishedAt: null },
      orderBy: { startedAt: "desc" },
    }),
    prisma.workout.findMany({
      where: { finishedAt: { not: null } },
      orderBy: { startedAt: "desc" },
      take: 50,
      include: { exercises: { include: { exercise: true, sets: true } } },
    }),
    prisma.template.findMany({
      orderBy: { createdAt: "asc" },
      include: { _count: { select: { exercises: true } } },
    }),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Buổi tập"
        subtitle="Chọn template hoặc bắt đầu buổi trống"
        emoji="🏋️"
      />

      {active && <ResumeWorkoutBanner workout={active} />}

      {!active && (
        <section className="card space-y-3 !p-4">
          <h2 className="text-base font-semibold">Bắt đầu buổi mới</h2>
          <StartWorkoutButtons templates={templates} />
        </section>
      )}

      <section className="space-y-2.5">
        <h2 className="text-base font-semibold px-1">Lịch sử ({all.length})</h2>
        {all.length === 0 ? (
          <div className="card flex flex-col items-center text-center py-12 gap-3">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl" />
              <PlayCircle className="relative h-12 w-12 text-primary" />
            </div>
            <p className="text-sm text-muted">Chưa có buổi tập nào hoàn thành</p>
          </div>
        ) : (
          <div className="space-y-2">
            {all.map((w) => {
              const totalSets = w.exercises.reduce((s, e) => s + e.sets.length, 0);
              const totalVolume = w.exercises.reduce(
                (s, e) =>
                  s +
                  e.sets.reduce((ss, set) => ss + calculateVolume(set.reps, set.weight), 0),
                0
              );
              const groups = Array.from(
                new Set(w.exercises.map((e) => e.exercise.muscleGroup))
              );
              return (
                <Link
                  key={w.id}
                  href={`/workout/${w.id}`}
                  className="card tappable flex items-center justify-between hover:border-primary/40"
                >
                  <div className="space-y-1.5 min-w-0">
                    <span className="font-semibold truncate block">{w.name}</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {groups.map((g) => {
                        const info = getMuscleGroupInfo(g);
                        return (
                          <span key={g} className={`chip ${info.color}`}>
                            <span>{info.emoji}</span> {info.label}
                          </span>
                        );
                      })}
                    </div>
                    <p className="text-xs text-muted">
                      {formatRelativeDay(w.startedAt)} •{" "}
                      {w.durationSec ? formatLongDuration(w.durationSec) : "—"} •{" "}
                      {totalSets} sets •{" "}
                      <span className="text-foreground/70">
                        {totalVolume.toLocaleString("vi-VN")} kg
                      </span>
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted shrink-0 ml-2" />
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
