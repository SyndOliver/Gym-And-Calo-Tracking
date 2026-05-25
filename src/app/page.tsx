import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  Dumbbell,
  TrendingUp,
  Flame,
  ArrowRight,
  PlayCircle,
  Sparkles,
  Trophy,
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

// Tuần bắt đầu từ thứ Hai (ISO)
function getWeekKey(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=CN
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function getMonthKey(date: Date): string {
  const d = new Date(date);
  return `${d.getFullYear()}-${d.getMonth()}`;
}

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

  // Weekly streak (consecutive weeks with ≥1 workout)
  const weekKeys = new Set(allFinished.map((w) => getWeekKey(new Date(w.startedAt))));
  let weekStreak = 0;
  const weekCursor = new Date();
  if (!weekKeys.has(getWeekKey(weekCursor))) weekCursor.setDate(weekCursor.getDate() - 7);
  while (weekKeys.has(getWeekKey(weekCursor))) {
    weekStreak++;
    weekCursor.setDate(weekCursor.getDate() - 7);
  }

  // Monthly streak (consecutive months with ≥1 workout)
  const monthKeys = new Set(allFinished.map((w) => getMonthKey(new Date(w.startedAt))));
  let monthStreak = 0;
  const monthCursor = new Date();
  if (!monthKeys.has(getMonthKey(monthCursor))) monthCursor.setMonth(monthCursor.getMonth() - 1);
  while (monthKeys.has(getMonthKey(monthCursor))) {
    monthStreak++;
    monthCursor.setMonth(monthCursor.getMonth() - 1);
  }

  // Last 4 weeks visualization
  const last4Weeks = Array.from({ length: 4 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (3 - i) * 7);
    return {
      label: i === 3 ? "T.này" : `-${3 - i}w`,
      hasWorkout: weekKeys.has(getWeekKey(d)),
      isCurrent: i === 3,
    };
  });

  // Last 6 months visualization
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    return {
      label: d.toLocaleDateString("vi-VN", { month: "short" }).replace("thg ", "Th"),
      hasWorkout: monthKeys.has(getMonthKey(d)),
      isCurrent: i === 5,
    };
  });

  // Last 7 days for streak visualization
  const last7: { dateLabel: string; hasWorkout: boolean; isToday: boolean }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const DAY_NAMES = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    last7.push({
      dateLabel: DAY_NAMES[d.getDay()]!,
      hasWorkout: dayKeys.has(d.getTime()),
      isToday: i === 0,
    });
  }

  return {
    active,
    recent,
    templates,
    weekVolume,
    weekCount: weekWorkouts.length,
    totalCount,
    streak,
    weekStreak,
    monthStreak,
    last7,
    last4Weeks,
    last6Months,
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

      {/* Streak banner */}
      {(data.streak > 0 || data.weekStreak > 0 || data.monthStreak > 0) && (
        <section className="relative overflow-hidden rounded-2xl border border-orange-500/30 bg-gradient-to-br from-orange-500/10 via-red-500/5 to-transparent p-4 space-y-4">
          <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-orange-500/20 blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="relative flex items-center gap-2">
            <span className="text-xl">🔥</span>
            <span className="font-bold text-sm">Chuỗi tập luyện</span>
          </div>

          {/* 3 streak counters */}
          <div className="relative grid grid-cols-3 gap-2">
            {/* Ngày */}
            <div className="rounded-xl bg-orange-500/15 border border-orange-500/25 p-2.5 text-center">
              <div className="text-2xl font-bold text-orange-400 tabular">{data.streak}</div>
              <div className="text-[10px] text-muted mt-0.5">ngày liên tiếp</div>
            </div>
            {/* Tuần */}
            <div className="rounded-xl bg-amber-500/15 border border-amber-500/25 p-2.5 text-center">
              <div className="text-2xl font-bold text-amber-400 tabular">{data.weekStreak}</div>
              <div className="text-[10px] text-muted mt-0.5">tuần liên tiếp</div>
            </div>
            {/* Tháng */}
            <div className="rounded-xl bg-red-500/15 border border-red-500/25 p-2.5 text-center">
              <div className="text-2xl font-bold text-red-400 tabular">{data.monthStreak}</div>
              <div className="text-[10px] text-muted mt-0.5">tháng liên tiếp</div>
            </div>
          </div>

          {/* Motivational message */}
          <p className="relative text-xs text-muted">
            {data.monthStreak >= 6
              ? "Huyền thoại 6 tháng! Không gì cản nổi bạn 🏆"
              : data.weekStreak >= 8
              ? "Hơn 2 tháng tuần nào cũng tập! Đỉnh của đỉnh 💎"
              : data.weekStreak >= 4
              ? "Tháng nào cũng có tuần tập! Giữ vững nhé 💪"
              : data.streak >= 7
              ? "Cả tuần không bỏ buổi nào! Tiếp tục phá giới 🔥"
              : "Chuỗi đang nóng — đừng để đứt!"}
          </p>

          {/* 7-day visualization */}
          <div className="relative space-y-1.5">
            <p className="text-[10px] text-muted font-medium uppercase tracking-wider">7 ngày qua</p>
            <div className="flex gap-1.5">
              {data.last7.map((day, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <div
                    className={`h-7 w-7 rounded-lg flex items-center justify-center text-base transition-all ${
                      day.hasWorkout
                        ? "bg-orange-500/80 text-white shadow-sm shadow-orange-500/40"
                        : day.isToday
                        ? "border-2 border-dashed border-orange-500/40 text-muted"
                        : "bg-border/50 text-muted/50"
                    }`}
                  >
                    {day.hasWorkout ? "🔥" : day.isToday ? "·" : ""}
                  </div>
                  <span className={`text-[10px] ${day.isToday ? "text-orange-400 font-bold" : "text-muted"}`}>
                    {day.dateLabel}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 4-week visualization */}
          <div className="relative space-y-1.5">
            <p className="text-[10px] text-muted font-medium uppercase tracking-wider">4 tuần qua</p>
            <div className="flex gap-2">
              {data.last4Weeks.map((week, i) => (
                <div key={i} className="flex flex-col items-center gap-1 flex-1">
                  <div
                    className={`w-full h-7 rounded-lg flex items-center justify-center text-sm transition-all ${
                      week.hasWorkout
                        ? "bg-amber-500/75 text-white shadow-sm shadow-amber-500/30"
                        : week.isCurrent
                        ? "border-2 border-dashed border-amber-500/40 text-muted"
                        : "bg-border/50 text-muted/50"
                    }`}
                  >
                    {week.hasWorkout ? "💪" : week.isCurrent ? "·" : ""}
                  </div>
                  <span className={`text-[10px] ${week.isCurrent ? "text-amber-400 font-bold" : "text-muted"}`}>
                    {week.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 6-month visualization */}
          <div className="relative space-y-1.5">
            <p className="text-[10px] text-muted font-medium uppercase tracking-wider">6 tháng qua</p>
            <div className="flex gap-1.5">
              {data.last6Months.map((month, i) => (
                <div key={i} className="flex flex-col items-center gap-1 flex-1">
                  <div
                    className={`w-full h-7 rounded-lg flex items-center justify-center text-sm transition-all ${
                      month.hasWorkout
                        ? "bg-red-500/70 text-white shadow-sm shadow-red-500/30"
                        : month.isCurrent
                        ? "border-2 border-dashed border-red-500/40 text-muted"
                        : "bg-border/50 text-muted/50"
                    }`}
                  >
                    {month.hasWorkout ? "📅" : month.isCurrent ? "·" : ""}
                  </div>
                  <span className={`text-[10px] ${month.isCurrent ? "text-red-400 font-bold" : "text-muted"}`}>
                    {month.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Stats grid */}
      <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
        <StatCard
          icon={<Flame className="h-4 w-4" />}
          label="Streak ngày"
          value={`${data.streak}`}
          unit="ngày"
          accent="from-orange-500/20 to-red-500/10"
          iconColor="text-orange-400"
        />
        <StatCard
          icon={<Trophy className="h-4 w-4" />}
          label="Streak tuần"
          value={`${data.weekStreak}`}
          unit="tuần"
          accent="from-amber-500/20 to-yellow-500/10"
          iconColor="text-amber-400"
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
