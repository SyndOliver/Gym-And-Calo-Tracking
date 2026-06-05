import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Trophy, Calendar, TrendingUp, Dumbbell, Flame } from "lucide-react";
import { calculate1RM, calculateVolume, formatRelativeDay, getMuscleGroupInfo } from "@/lib/utils";
import VolumeChart from "@/components/VolumeChart";
import PageHeader from "@/components/PageHeader";


export const dynamic = "force-dynamic";

async function getStats() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 30);
  weekStart.setHours(0, 0, 0, 0);

  const [allFinished, last30, allSets, allMetrics] = await Promise.all([
    prisma.workout.findMany({
      where: { finishedAt: { not: null } },
      include: { exercises: { include: { sets: true, exercise: true } } },
    }),
    prisma.workout.findMany({
      where: { finishedAt: { not: null }, startedAt: { gte: weekStart } },
      include: { exercises: { include: { sets: true, exercise: true } } },
      orderBy: { startedAt: "asc" },
    }),
    prisma.setEntry.findMany({
      where: { isCompleted: true, weight: { not: null }, reps: { not: null } },
      include: {
        workoutExercise: {
          include: { exercise: true, workout: true },
        },
      },
    }),
    prisma.bodyMetric.findMany({ orderBy: { date: "asc" } }),
  ]);

  // Personal records: max weight per exercise + max e1RM per exercise
  const prsByExercise = new Map<
    string,
    { name: string; muscleGroup: string; maxWeight: number; maxReps: number; max1RM: number; date: Date }
  >();
  for (const set of allSets) {
    if (!set.weight || !set.reps) continue;
    const ex = set.workoutExercise.exercise;
    const e1rm = calculate1RM(set.weight, set.reps);
    const cur = prsByExercise.get(ex.id);
    if (!cur || e1rm > cur.max1RM) {
      prsByExercise.set(ex.id, {
        name: ex.name,
        muscleGroup: ex.muscleGroup,
        maxWeight: set.weight,
        maxReps: set.reps,
        max1RM: e1rm,
        date: set.workoutExercise.workout.startedAt,
      });
    }
  }
  const topPRs = Array.from(prsByExercise.values())
    .sort((a, b) => b.max1RM - a.max1RM)
    .slice(0, 8);

  // Volume per day chart (last 30 days)
  const volumeByDay = new Map<string, number>();
  for (let i = 0; i < 30; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    volumeByDay.set(d.toISOString().slice(0, 10), 0);
  }
  for (const w of last30) {
    const key = new Date(w.startedAt).toISOString().slice(0, 10);
    const vol = w.exercises.reduce(
      (s, e) => s + e.sets.reduce((ss, set) => ss + calculateVolume(set.reps, set.weight), 0),
      0
    );
    volumeByDay.set(key, (volumeByDay.get(key) ?? 0) + vol);
  }
  const chartData = Array.from(volumeByDay.entries()).map(([date, volume]) => ({
    date,
    volume,
    label: new Date(date).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }),
  }));



  // Total stats
  const totalWorkouts = allFinished.length;
  const totalVolume = allFinished.reduce(
    (sum, w) =>
      sum +
      w.exercises.reduce(
        (s, we) => s + we.sets.reduce((ss, set) => ss + calculateVolume(set.reps, set.weight), 0),
        0
      ),
    0
  );
  const totalSetsCount = allFinished.reduce(
    (sum, w) => sum + w.exercises.reduce((s, we) => s + we.sets.filter((x) => x.isCompleted).length, 0),
    0
  );
  const totalDuration = allFinished.reduce((sum, w) => sum + (w.durationSec ?? 0), 0);
  const monthCount = allFinished.filter((w) => new Date(w.startedAt) >= monthStart).length;

  return {
    totalWorkouts,
    totalVolume,
    totalSetsCount,
    totalDuration,
    monthCount,
    topPRs,
    chartData,

    metricsCount: allMetrics.length,
  };
}

export default async function StatsPage() {
  const s = await getStats();

  return (
    <div className="space-y-5">
      <PageHeader
        title="Thống kê"
        subtitle="Tiến độ và PR cá nhân"
        emoji="📊"
      />

      <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
        <StatBox icon={<Dumbbell className="h-4 w-4" />} label="Tổng buổi" value={s.totalWorkouts.toString()} accent="text-blue-400" />
        <StatBox icon={<Calendar className="h-4 w-4" />} label="Tháng này" value={`${s.monthCount}`} accent="text-green-400" />
        <StatBox icon={<TrendingUp className="h-4 w-4" />} label="Tổng volume" value={`${(s.totalVolume / 1000).toFixed(1)}t`} accent="text-purple-400" />
        <StatBox icon={<Flame className="h-4 w-4" />} label="Tổng sets" value={s.totalSetsCount.toString()} accent="text-orange-400" />
      </section>

      <section className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Volume 30 ngày qua</h2>
          <span className="text-xs text-muted">kg</span>
        </div>
        <VolumeChart data={s.chartData} />
      </section>



      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Trophy className="h-4 w-4 text-yellow-400" /> Personal Records
          </h2>
          <Link href="/body" className="text-xs text-primary hover:underline">
            Body metrics ({s.metricsCount}) →
          </Link>
        </div>
        {s.topPRs.length === 0 ? (
          <div className="card text-center py-8 text-sm text-muted">
            Hoàn thành buổi tập đầu tiên để xem PR nhé!
          </div>
        ) : (
          <div className="space-y-2">
            {s.topPRs.map((pr, idx) => {
              const info = getMuscleGroupInfo(pr.muscleGroup);
              return (
                <div key={pr.name} className="card !p-3 flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-yellow-500/30 to-orange-500/20 text-yellow-400 font-bold text-sm shrink-0">
                    #{idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold truncate">{pr.name}</span>
                    </div>
                    <p className="text-xs text-muted">
                      <span className={`chip ${info.color} !py-0 !text-[10px] mr-1`}>
                        {info.emoji} {info.label}
                      </span>
                      {formatRelativeDay(pr.date)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-base font-bold">
                      {pr.maxWeight}<span className="text-xs text-muted font-normal">kg</span>
                      {" × "}
                      {pr.maxReps}
                    </div>
                    <div className="text-[10px] text-muted">
                      e1RM: <span className="font-semibold">{pr.max1RM} kg</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function StatBox({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="card !p-3.5">
      <div className={`mb-1 inline-flex items-center gap-1.5 text-xs ${accent ?? "text-muted"}`}>
        {icon}
        <span className="text-muted font-medium">{label}</span>
      </div>
      <div className="text-xl font-bold tabular sm:text-2xl">{value}</div>
    </div>
  );
}
