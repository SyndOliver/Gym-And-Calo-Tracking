"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ExternalLink,
  Pencil,
  PlayCircle,
  Search,
  Trash2,
  Trophy,
  Save,
  X,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  History,
  Dumbbell,
} from "lucide-react";
import PageHeader from "./PageHeader";
import {
  calculate1RM,
  calculateTrend,
  calculateVolume,
  EQUIPMENT_LABELS,
  formatRelativeDay,
  getMuscleGroupInfo,
  MUSCLE_GROUPS,
  type TrendResult,
} from "@/lib/utils";
import { parseVideoUrl, youtubeSearchUrl } from "@/lib/video";
import { deleteExercise, updateExercise } from "@/app/actions/exercise";
import VideoModal from "./VideoModal";
import ExerciseProgressAI from "./ExerciseProgressAI";
import {
  Area,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

type Exercise = {
  id: string;
  name: string;
  nameEn: string | null;
  muscleGroup: string;
  primaryMuscle: string | null;
  equipment: string | null;
  category: string;
  instructions: string | null;
  videoUrl: string | null;
  isCustom: boolean;
};

type Set = {
  id: string;
  reps: number | null;
  weight: number | null;
  setNumber: number;
  completedAt: Date;
  workoutExercise: {
    workout: {
      id: string;
      name: string;
      startedAt: Date;
    };
  };
};

type Tab = "progress" | "history";

export default function ExerciseDetail({
  exercise,
  sets,
}: {
  exercise: Exercise;
  sets: Set[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [showVideo, setShowVideo] = useState(false);
  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("progress");

  const info = getMuscleGroupInfo(exercise.muscleGroup);
  const videoInfo = parseVideoUrl(exercise.videoUrl);
  const hasVideo = videoInfo.source === "youtube" || videoInfo.source === "url";

  // Stats
  const totalSets = sets.length;
  const totalVolume = sets.reduce(
    (s, x) => s + calculateVolume(x.reps, x.weight),
    0
  );
  const maxWeight = sets.reduce(
    (m, s) => (s.weight && s.weight > m ? s.weight : m),
    0
  );
  const max1RM = sets.reduce(
    (m, s) =>
      s.weight && s.reps
        ? Math.max(m, calculate1RM(s.weight, s.reps))
        : m,
    0
  );

  // Per-workout data for chart (volume + e1rm + max weight)
  const chartData = useMemo(() => {
    const byWorkout = new Map<
      string,
      {
        date: Date;
        e1rm: number;
        weight: number;
        volume: number;
        totalSets: number;
      }
    >();
    for (const s of sets) {
      if (!s.weight || !s.reps) continue;
      const wid = s.workoutExercise.workout.id;
      const e1rm = calculate1RM(s.weight, s.reps);
      const vol = s.weight * s.reps;
      const cur = byWorkout.get(wid);
      if (cur) {
        if (e1rm > cur.e1rm) {
          cur.e1rm = e1rm;
          cur.weight = s.weight;
        }
        cur.volume += vol;
        cur.totalSets++;
      } else {
        byWorkout.set(wid, {
          date: s.workoutExercise.workout.startedAt,
          e1rm,
          weight: s.weight,
          volume: vol,
          totalSets: 1,
        });
      }
    }
    return Array.from(byWorkout.values())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-30)
      .map((d) => ({
        date: new Date(d.date).toLocaleDateString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
        }),
        e1rm: d.e1rm,
        weight: d.weight,
        volume: Math.round(d.volume),
      }));
  }, [sets]);

  // Trend calculations
  const trends = useMemo(() => {
    if (chartData.length < 2) return null;
    return {
      volume: calculateTrend(chartData.map((d) => d.volume)),
      e1rm: calculateTrend(chartData.map((d) => d.e1rm)),
      weight: calculateTrend(chartData.map((d) => d.weight)),
    };
  }, [chartData]);

  function handleDelete() {
    if (!confirm(`Xoá bài tập "${exercise.name}"? Hành động không thể hoàn tác.`))
      return;
    startTransition(async () => {
      await deleteExercise(exercise.id);
      router.push("/exercises");
    });
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={exercise.name}
        subtitle={
          exercise.nameEn && exercise.nameEn !== exercise.name ? exercise.nameEn : undefined
        }
        back={{ href: "/exercises", label: "Thư viện" }}
        action={
          <button
            onClick={() => setEditing(true)}
            className="btn btn-ghost btn-icon"
            title="Sửa"
          >
            <Pencil className="h-4 w-4" />
          </button>
        }
      />

      <div className="flex items-center gap-2 flex-wrap">
        <span className={`chip ${info.color}`}>
          <span>{info.emoji}</span> {info.label}
        </span>
        {exercise.primaryMuscle && (
          <span className="chip border-border bg-surface/60 text-muted">
            {exercise.primaryMuscle}
          </span>
        )}
        {exercise.equipment && (
          <span className="chip border-border bg-surface/60 text-muted">
            {EQUIPMENT_LABELS[exercise.equipment] ?? exercise.equipment}
          </span>
        )}
      </div>

      {/* Video section */}
      <section className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <PlayCircle className="h-4 w-4 text-primary" /> Video hướng dẫn
          </h2>
          {hasVideo && videoInfo.watchUrl && (
            <a
              href={videoInfo.watchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline inline-flex items-center gap-1"
            >
              YouTube <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>

        {videoInfo.source === "youtube" && videoInfo.embedUrl ? (
          <div
            className="relative w-full overflow-hidden rounded-xl bg-black"
            style={{ aspectRatio: "16 / 9" }}
          >
            <iframe
              src={videoInfo.embedUrl}
              title={exercise.name}
              className="absolute inset-0 h-full w-full"
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        ) : videoInfo.source === "url" && videoInfo.watchUrl ? (
          <a
            href={videoInfo.watchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary w-full"
          >
            <ExternalLink className="h-4 w-4" /> Mở video
          </a>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-surface/40 p-6 text-center space-y-3">
            <p className="text-sm text-muted">Bài tập này chưa có video hướng dẫn</p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <a
                href={youtubeSearchUrl(exercise.name)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
              >
                <Search className="h-4 w-4" /> Tìm trên YouTube
              </a>
              <button onClick={() => setEditing(true)} className="btn btn-primary">
                <Pencil className="h-4 w-4" /> Thêm link video
              </button>
            </div>
          </div>
        )}
      </section>

      {exercise.instructions && (
        <section className="card space-y-2">
          <h2 className="text-base font-semibold">Hướng dẫn</h2>
          <p className="text-sm text-foreground/90 whitespace-pre-wrap">
            {exercise.instructions}
          </p>
        </section>
      )}

      {/* Stats */}
      {totalSets > 0 && (
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatBox label="Tổng sets" value={totalSets.toString()} />
          <StatBox label="Volume" value={`${(totalVolume / 1000).toFixed(1)}t`} />
          <StatBox label="Max" value={maxWeight ? `${maxWeight} kg` : "—"} />
          <StatBox label="e1RM" value={max1RM ? `${max1RM} kg` : "—"} accent="text-yellow-400" />
        </section>
      )}

      {/* Tab Navigation */}
      {totalSets > 0 && (
        <div className="flex gap-1 p-1 rounded-xl bg-surface/60 border border-border/50">
          <button
            onClick={() => setActiveTab("progress")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all ${
              activeTab === "progress"
                ? "bg-primary/15 text-primary border border-primary/25 shadow-sm shadow-primary/10"
                : "text-muted hover:text-foreground"
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            Tiến triển
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all ${
              activeTab === "history"
                ? "bg-primary/15 text-primary border border-primary/25 shadow-sm shadow-primary/10"
                : "text-muted hover:text-foreground"
            }`}
          >
            <History className="h-4 w-4" />
            Lịch sử ({sets.length})
          </button>
        </div>
      )}

      {/* Progress Tab */}
      {activeTab === "progress" && totalSets > 0 && (
        <>
          {/* Trend Cards */}
          {trends && (
            <section className="grid grid-cols-3 gap-2">
              <TrendCard label="Volume" trend={trends.volume} unit="kg" />
              <TrendCard label="e1RM" trend={trends.e1rm} unit="kg" />
              <TrendCard label="Max" trend={trends.weight} unit="kg" />
            </section>
          )}

          {/* Dual-Axis Chart */}
          {chartData.length >= 2 && (
            <section className="card space-y-3">
              <h2 className="text-base font-semibold flex items-center gap-2">
                <Trophy className="h-4 w-4 text-yellow-400" /> Tiến triển sức mạnh
              </h2>
              <div className="flex items-center gap-4 text-[11px] text-muted">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-5 rounded-full bg-indigo-500 opacity-60" />
                  Volume (kg)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-5 rounded-full bg-purple-500" />
                  e1RM (kg)
                </span>
              </div>
              <div className="h-56 -mx-2">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="volumeProgressGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgb(99 102 241)" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="rgb(99 102 241)" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgb(38 43 60)" strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "rgb(148 156 178)", fontSize: 10 }}
                      stroke="rgb(38 43 60)"
                      tickLine={false}
                    />
                    <YAxis
                      yAxisId="volume"
                      orientation="left"
                      tick={{ fill: "rgb(148 156 178)", fontSize: 10 }}
                      stroke="rgb(38 43 60)"
                      tickLine={false}
                      axisLine={false}
                      width={45}
                      tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)}
                    />
                    <YAxis
                      yAxisId="e1rm"
                      orientation="right"
                      tick={{ fill: "rgb(168 85 247)", fontSize: 10 }}
                      stroke="rgb(38 43 60)"
                      tickLine={false}
                      axisLine={false}
                      width={40}
                      domain={["dataMin - 5", "dataMax + 5"]}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "rgb(17 20 31)",
                        border: "1px solid rgb(38 43 60)",
                        borderRadius: 12,
                        fontSize: 12,
                        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                      }}
                      labelStyle={{ color: "rgb(148 156 178)", marginBottom: 4 }}
                      formatter={(v: number, name: string) => [
                        `${v.toLocaleString("vi-VN")} kg`,
                        name === "volume" ? "Volume" : "e1RM",
                      ]}
                    />
                    <Area
                      yAxisId="volume"
                      type="monotone"
                      dataKey="volume"
                      stroke="rgb(99 102 241)"
                      strokeWidth={1.5}
                      fill="url(#volumeProgressGrad)"
                      strokeOpacity={0.7}
                    />
                    <Line
                      yAxisId="e1rm"
                      type="monotone"
                      dataKey="e1rm"
                      stroke="rgb(168 85 247)"
                      strokeWidth={2.5}
                      dot={{ fill: "rgb(168 85 247)", r: 3, strokeWidth: 0 }}
                      activeDot={{ r: 5, fill: "rgb(168 85 247)", stroke: "rgb(17 20 31)", strokeWidth: 2 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}

          {chartData.length < 2 && (
            <section className="card text-center py-8 space-y-2">
              <Dumbbell className="h-8 w-8 text-muted mx-auto opacity-50" />
              <p className="text-sm text-muted">
                Cần ít nhất 2 buổi tập để hiển thị biểu đồ tiến triển
              </p>
              <p className="text-xs text-muted/70">
                {chartData.length === 1
                  ? "Thêm 1 buổi tập nữa để xem biểu đồ"
                  : "Bắt đầu tập để theo dõi tiến độ"}
              </p>
            </section>
          )}

          {/* AI Analysis */}
          <ExerciseProgressAI exerciseId={exercise.id} />
        </>
      )}

      {/* History Tab */}
      {activeTab === "history" && sets.length > 0 && (
        <section className="space-y-1.5">
          {sets.slice(0, 50).map((s) => (
            <Link
              key={s.id}
              href={`/workout/${s.workoutExercise.workout.id}`}
              className="card !p-2.5 flex items-center gap-3 hover:border-primary/40 transition-colors"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-surface text-xs font-semibold shrink-0">
                {s.setNumber}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold">
                  {s.weight ?? "—"} kg × {s.reps ?? "—"} reps
                  {s.weight && s.reps && (
                    <span className="text-xs text-muted font-normal ml-1.5">
                      (e1RM {calculate1RM(s.weight, s.reps)} kg)
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted truncate">
                  {s.workoutExercise.workout.name} • {formatRelativeDay(s.workoutExercise.workout.startedAt)}
                </p>
              </div>
            </Link>
          ))}
        </section>
      )}

      {sets.length === 0 && (
        <div className="card text-center py-8 text-sm text-muted">
          Chưa có set nào cho bài tập này. Thêm vào buổi tập để bắt đầu!
        </div>
      )}

      {exercise.isCustom && (
        <button onClick={handleDelete} className="btn btn-danger w-full">
          <Trash2 className="h-4 w-4" /> Xoá bài tập
        </button>
      )}

      <VideoModal
        open={showVideo}
        onClose={() => setShowVideo(false)}
        exerciseName={exercise.name}
        videoUrl={exercise.videoUrl}
      />

      {editing && (
        <EditExerciseModal exercise={exercise} onClose={() => setEditing(false)} />
      )}
    </div>
  );
}

// ===================== TREND CARD =====================

function TrendCard({
  label,
  trend,
  unit,
}: {
  label: string;
  trend: TrendResult;
  unit: string;
}) {
  const iconClass = "h-4 w-4";
  const isUp = trend.direction === "up";
  const isDown = trend.direction === "down";
  const isStable = trend.direction === "stable";

  const colorMap = {
    up: {
      text: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
      icon: <TrendingUp className={`${iconClass} text-emerald-400`} />,
    },
    down: {
      text: "text-red-400",
      bg: "bg-red-500/10",
      border: "border-red-500/20",
      icon: <TrendingDown className={`${iconClass} text-red-400`} />,
    },
    stable: {
      text: "text-yellow-400",
      bg: "bg-yellow-500/10",
      border: "border-yellow-500/20",
      icon: <Minus className={`${iconClass} text-yellow-400`} />,
    },
  };

  const colors = colorMap[trend.direction];

  return (
    <div className={`card !p-3 ${colors.bg} ${colors.border} transition-all`}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] text-muted font-medium uppercase tracking-wider">{label}</span>
        {colors.icon}
      </div>
      <div className={`text-lg font-bold tabular ${colors.text}`}>
        {trend.percentage > 0 ? (
          <>
            {isUp ? "+" : isDown ? "-" : ""}
            {trend.percentage}%
          </>
        ) : (
          "—"
        )}
      </div>
      <div className="text-[10px] text-muted mt-0.5">
        TB: {trend.currentAvg.toLocaleString("vi-VN")} {unit}
      </div>
    </div>
  );
}

// ===================== STAT BOX =====================

function StatBox({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="card !p-3.5">
      <div className="mb-1 text-xs text-muted">{label}</div>
      <div className={`text-lg font-bold ${accent ?? ""}`}>{value}</div>
    </div>
  );
}

// ===================== EDIT MODAL =====================

function EditExerciseModal({
  exercise,
  onClose,
}: {
  exercise: Exercise;
  onClose: () => void;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [name, setName] = useState(exercise.name);
  const [muscleGroup, setMuscleGroup] = useState(exercise.muscleGroup);
  const [primaryMuscle, setPrimaryMuscle] = useState(exercise.primaryMuscle ?? "");
  const [equipment, setEquipment] = useState(exercise.equipment ?? "");
  const [videoUrl, setVideoUrl] = useState(exercise.videoUrl ?? "");
  const [instructions, setInstructions] = useState(exercise.instructions ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      await updateExercise(exercise.id, {
        name: name.trim() || exercise.name,
        muscleGroup,
        primaryMuscle: primaryMuscle.trim() || null,
        equipment: equipment || null,
        videoUrl: videoUrl.trim() || null,
        instructions: instructions.trim() || null,
      });
      router.refresh();
      onClose();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-md p-0 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-border bg-card p-4 space-y-3 animate-slide-up shadow-2xl shadow-black/50"
      >
        <div className="mx-auto -mt-2 mb-1 h-1 w-10 rounded-full bg-border sm:hidden" />
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base">Sửa bài tập</h3>
          <button type="button" onClick={onClose} className="btn btn-ghost btn-icon">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted">Tên bài tập</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted">Nhóm cơ</label>
          <select value={muscleGroup} onChange={(e) => setMuscleGroup(e.target.value)}>
            {Object.entries(MUSCLE_GROUPS).map(([key, info]) => (
              <option key={key} value={key}>
                {info.emoji} {info.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted">Cơ chính</label>
          <input
            value={primaryMuscle}
            onChange={(e) => setPrimaryMuscle(e.target.value)}
            placeholder="VD: Ngực trên"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted">Dụng cụ</label>
          <select value={equipment} onChange={(e) => setEquipment(e.target.value)}>
            <option value="">— Không xác định —</option>
            {Object.entries(EQUIPMENT_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted">Link video YouTube</label>
          <input
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://youtu.be/abc123 hoặc abc123"
          />
          <p className="text-[10px] text-muted">
            Hỗ trợ link YouTube đầy đủ, link rút gọn youtu.be, hoặc chỉ ID 11 ký tự
          </p>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted">Hướng dẫn / Ghi chú</label>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={4}
            placeholder="Cách đặt chân, hơi thở, cảm nhận cơ..."
            className="resize-none"
          />
        </div>

        <button type="submit" className="btn btn-primary w-full">
          <Save className="h-4 w-4" /> Lưu thay đổi
        </button>
      </form>
    </div>
  );
}
