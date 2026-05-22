import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  Dumbbell,
  TrendingUp,
  Calendar,
  Flame,
  ArrowRight,
  PlayCircle,
  Sparkles,
} from "lucide-react";
import {
  formatRelativeDay,
  formatLongDuration,
  getMuscleGroupInfo,
  calculateVolume,
} from "@/lib/utils";
import StartWorkoutButtons from "@/components/StartWorkoutButtons";
import ResumeWorkoutBanner from "@/components/ResumeWorkoutBanner";

export const dynamic = "force-dynamic";

async function getDashboardData() {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const [active, recent, templates, weekWorkouts, totalCount] = await Promise.all([
    prisma.workout.findFirst({
      where: { finishedAt: null },
      orderBy: { startedAt: "desc" },
    }),
    prisma.workout.findMany({
      where: { finishedAt: { not: null } },
      orderBy: { startedAt: "desc" },
      take: 5,
      include: { exercises: { include: { exercise: true, sets: true } } },
    }),
    prisma.template.findMany({
      orderBy: { createdAt: "asc" },
      take: 6,
      include: { _count: { select: { exercises: true } } },
    }),
    prisma.workout.findMany({
      where: { startedAt: { gte: weekStart }, finishedAt: { not: null } },
      include: { exercises: { include: { sets: true } } },
    }),
    prisma.workout.count({ where: { finishedAt: { not: null } } }),
  ]);

  const weekVolume = weekWorkouts.reduce(
    (sum, w) =>
      sum +
      w.exercises.reduce(
        (s, we) =>
          s + we.sets.reduce((ss, set) => ss + calculateVolume(set.reps, set.weight), 0),
        0
      ),
    0
  );

  const allFinished = await prisma.workout.findMany({
    where: { finishedAt: { not: null } },
    select: { startedAt: true },
    orderBy: { startedAt: "desc" },
    take: 365,
  });
  const dayKeys = new Set(
    allFinished.map((w) => {
      const d = new Date(w.startedAt);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    })
  );
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  if (!dayKeys.has(cursor.getTime())) cursor.setDate(cursor.getDate() - 1);
  while (dayKeys.has(cursor.getTime())) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return {
    active,
    recent,
    templates,
    weekVolume,
    weekCount: weekWorkouts.length,
    totalCount,
    streak,
  };
}

function greeting() {
  const h = new Date().getHours();
  if (h < 11) return "Chào buổi sáng";
  if (h < 14) return "Chào buổi trưa";
  if (h < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
}

export default function HomePage() {
  return <HomeContent />;
}

async function HomeContent() {
  const data = await getDashboardData();
  const hello = greeting();

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Hero */}
      <header className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/15 via-accent/8 to-transparent p-5 sm:p-6">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-12 -left-8 h-32 w-32 rounded-full bg-accent/20 blur-3xl" />
        <div className="relative space-y-1">
          <p className="inline-flex items-center gap-1.5 text-xs font-medium text-muted">
            <Sparkles className="h-3 w-3 text-primary" /> {hello}
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            <span className="text-gradient">Hôm nay tập gì?</span>
          </h1>
        </div>
      </header>

      {data.active && <ResumeWorkoutBanner workout={data.active} />}

      {/* Stats grid */}
      <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
        <StatCard
          icon={<Flame className="h-4 w-4" />}
          label="Streak"
          value={`${data.streak}`}
          unit="ngày"
          accent="from-orange-500/20 to-red-500/10"
          iconColor="text-orange-400"
        />
        <StatCard
          icon={<Calendar className="h-4 w-4" />}
          label="Tuần này"
          value={`${data.weekCount}`}
          unit="buổi"
          accent="from-blue-500/20 to-cyan-500/10"
          iconColor="text-blue-400"
        />
        <StatCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Volume"
          value={`${(data.weekVolume / 1000).toFixed(1)}t`}
          unit="tuần này"
          accent="from-purple-500/20 to-fuchsia-500/10"
          iconColor="text-purple-400"
        />
        <StatCard
          icon={<Dumbbell className="h-4 w-4" />}
          label="Tổng buổi"
          value={`${data.totalCount}`}
          unit="đã tập"
          accent="from-emerald-500/20 to-green-500/10"
          iconColor="text-emerald-400"
        />
      </section>

      {/* Quick start */}
      {!data.active && (
        <section className="card space-y-3 !p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Bắt đầu tập</h2>
            <Link
              href="/templates"
              className="text-xs font-medium text-primary hover:underline"
            >
              Xem tất cả →
            </Link>
          </div>
          <StartWorkoutButtons templates={data.templates} />
        </section>
      )}

      {/* Recent workouts */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-base font-semibold">Buổi tập gần đây</h2>
          <Link
            href="/stats"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Thống kê <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {data.recent.length === 0 ? (
          <EmptyRecent />
        ) : (
          <div className="space-y-2">
            {data.recent.map((w) => {
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
                  className="card tappable flex items-center justify-between hover:border-primary/40 hover:bg-card-hover/60"
                >
                  <div className="space-y-1.5 min-w-0">
                    <span className="font-semibold truncate block">{w.name}</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {groups.slice(0, 4).map((g) => {
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

function StatCard({
  icon,
  label,
  value,
  unit,
  accent,
  iconColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit?: string;
  accent: string;
  iconColor: string;
}) {
  return (
    <div className="card relative overflow-hidden !p-3.5 group">
      <div
        className={`absolute -right-4 -top-4 h-16 w-16 rounded-full bg-gradient-to-br ${accent} blur-2xl opacity-60 transition-opacity group-hover:opacity-100`}
      />
      <div className="relative">
        <div className={`mb-1 inline-flex items-center gap-1.5 text-xs ${iconColor}`}>
          {icon}
          <span className="text-muted font-medium">{label}</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-xl font-bold tabular sm:text-2xl">{value}</span>
          {unit && <span className="text-xs text-muted">{unit}</span>}
        </div>
      </div>
    </div>
  );
}

function EmptyRecent() {
  return (
    <div className="card flex flex-col items-center text-center py-10 gap-3">
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl" />
        <PlayCircle className="relative h-12 w-12 text-primary" />
      </div>
      <div className="space-y-1">
        <p className="font-semibold">Chưa có buổi tập nào</p>
        <p className="text-xs text-muted max-w-xs">
          Chọn 1 template phía trên hoặc bắt đầu buổi trống để ghi lại sets, reps đầu tiên.
        </p>
      </div>
    </div>
  );
}
