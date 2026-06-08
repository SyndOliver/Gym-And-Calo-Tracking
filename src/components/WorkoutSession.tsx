"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  Check,
  CheckCircle2,
  X,
  Pencil,
  Search,
  ChevronDown,
  Clock,
  StickyNote,
  PlayCircle,
  Info,
  Minus,
  History,
  Flame,
  Trophy,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useActiveWorkout } from "./ActiveWorkoutProvider";
import VideoModal from "./VideoModal";
import {
  addExerciseToWorkout,
  addSet,
  bulkSetReps,
  deleteSet,
  deleteWorkout,
  finishWorkout,
  removeExerciseFromWorkout,
  setExerciseSetCount,
  updateExerciseRest,
  updateSet,
  updateWorkoutName,
  updateWorkoutNotes,
} from "@/app/actions/workout";
import {
  calculateVolume,
  cn,
  EQUIPMENT_LABELS,
  formatDuration,
  formatLongDuration,
  getMuscleGroupInfo,
  MUSCLE_GROUPS,
} from "@/lib/utils";

type Exercise = {
  id: string;
  name: string;
  nameEn: string | null;
  muscleGroup: string;
  primaryMuscle: string | null;
  equipment: string | null;
  category: string;
  videoUrl: string | null;
};

type SetEntry = {
  id: string;
  setNumber: number;
  reps: number | null;
  weight: number | null;
  rpe: number | null;
  isCompleted: boolean;
  isWarmup: boolean;
};

type WorkoutExercise = {
  id: string;
  order: number;
  restSeconds: number;
  notes: string | null;
  exercise: Exercise;
  sets: SetEntry[];
};

type Workout = {
  id: string;
  name: string;
  notes: string | null;
  startedAt: Date;
  finishedAt: Date | null;
  exercises: WorkoutExercise[];
};

type PreviousSetData = {
  date: string;
  sets: { setNumber: number; weight: number | null; reps: number | null }[];
};

export default function WorkoutSession({
  workout,
  allExercises,
  previousSetsMap = {},
}: {
  workout: Workout;
  allExercises: Exercise[];
  previousSetsMap?: Record<string, PreviousSetData>;
}) {
  const router = useRouter();
  const { setActiveWorkoutId, startRest, stopRest } = useActiveWorkout();
  const [, startTransition] = useTransition();
  const [showAdd, setShowAdd] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(workout.name);
  const [showNotes, setShowNotes] = useState(!!workout.notes);
  const [notes, setNotes] = useState(workout.notes ?? "");
  const [elapsed, setElapsed] = useState(0);
  const isFinished = !!workout.finishedAt;

  useEffect(() => {
    if (!isFinished) setActiveWorkoutId(workout.id);
  }, [isFinished, workout.id, setActiveWorkoutId]);

  useEffect(() => {
    if (isFinished) return;
    const tick = () =>
      setElapsed(Math.round((Date.now() - new Date(workout.startedAt).getTime()) / 1000));
    tick();
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, [isFinished, workout.startedAt]);

  const totalSets = workout.exercises.reduce(
    (s, e) => s + e.sets.filter((x) => x.weight !== null && x.reps !== null).length,
    0
  );
  const totalVolume = workout.exercises.reduce(
    (s, e) =>
      s +
      e.sets
        .filter((x) => x.weight !== null && x.reps !== null)
        .reduce((ss, set) => ss + calculateVolume(set.reps, set.weight), 0),
    0
  );

  function commitName() {
    setEditingName(false);
    if (name.trim() && name !== workout.name) {
      startTransition(async () => {
        await updateWorkoutName(workout.id, name.trim());
      });
    }
  }

  function commitNotes(value: string) {
    startTransition(async () => {
      await updateWorkoutNotes(workout.id, value);
    });
  }

  function handleAddExercise(exerciseId: string) {
    setShowAdd(false);
    startTransition(async () => {
      await addExerciseToWorkout(workout.id, exerciseId);
      router.refresh();
    });
  }

  function handleFinish() {
    if (!confirm("Kết thúc buổi tập?")) return;
    stopRest();
    startTransition(async () => {
      await finishWorkout(workout.id);
      setActiveWorkoutId(null);
      router.push("/");
    });
  }

  function handleDelete() {
    if (!confirm("Xoá hẳn buổi tập này? Hành động không thể hoàn tác.")) return;
    stopRest();
    startTransition(async () => {
      await deleteWorkout(workout.id);
      setActiveWorkoutId(null);
      router.push("/");
    });
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <header
        className={cn(
          "card relative space-y-3 overflow-hidden",
          !isFinished && "border-primary/30"
        )}
      >
        {!isFinished && (
          <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
        )}
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            {editingName ? (
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={commitName}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  if (e.key === "Escape") {
                    setName(workout.name);
                    setEditingName(false);
                  }
                }}
                className="!text-lg !font-bold"
              />
            ) : (
              <button
                onClick={() => !isFinished && setEditingName(true)}
                className="text-left text-xl font-bold inline-flex items-center gap-1.5 hover:text-primary transition-colors"
              >
                <span className="truncate">{workout.name}</span>
                {!isFinished && <Pencil className="h-3.5 w-3.5 opacity-40 shrink-0" />}
              </button>
            )}
            <p className="text-xs text-muted mt-0.5">
              {new Date(workout.startedAt).toLocaleString("vi-VN")}
            </p>
          </div>
          {isFinished ? (
            <span className="chip border-success/40 bg-success/15 text-success shrink-0">
              <CheckCircle2 className="h-3 w-3" /> Hoàn thành
            </span>
          ) : (
            <span className="chip border-primary/40 bg-primary/20 text-primary shrink-0">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-75 animate-ping" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
              </span>
              Đang tập
            </span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-surface/60 py-2.5 px-2 border border-border/50">
            <div className="text-[10px] uppercase tracking-wider text-muted font-medium">
              Thời gian
            </div>
            <div className="tabular text-base font-bold sm:text-lg">
              {isFinished
                ? formatLongDuration(
                    Math.round(
                      (new Date(workout.finishedAt!).getTime() -
                        new Date(workout.startedAt).getTime()) /
                        1000
                    )
                  )
                : formatDuration(elapsed)}
            </div>
          </div>
          <div className="rounded-xl bg-surface/60 py-2.5 px-2 border border-border/50">
            <div className="text-[10px] uppercase tracking-wider text-muted font-medium">
              Sets
            </div>
            <div className="tabular text-base font-bold sm:text-lg">{totalSets}</div>
          </div>
          <div className="rounded-xl bg-surface/60 py-2.5 px-2 border border-border/50">
            <div className="text-[10px] uppercase tracking-wider text-muted font-medium">
              Volume
            </div>
            <div className="tabular text-base font-bold sm:text-lg">
              {totalVolume.toLocaleString("vi-VN")}
              <span className="text-[10px] text-muted font-normal ml-0.5">kg</span>
            </div>
          </div>
        </div>

        {!isFinished && (
          <button
            onClick={() => setShowNotes((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-muted hover:text-foreground transition-colors"
          >
            <StickyNote className="h-3 w-3" />
            {showNotes ? "Ẩn ghi chú" : "Thêm ghi chú"}
          </button>
        )}
        {showNotes && (
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => commitNotes(notes)}
            disabled={isFinished}
            placeholder="Cảm nhận buổi tập, năng lượng..."
            rows={2}
            className="resize-none !text-sm"
          />
        )}
      </header>

      <section className="space-y-3">
        {workout.exercises.length === 0 && (
          <div className="card text-center py-8">
            <p className="text-sm text-muted mb-3">Chưa có bài tập nào</p>
            {!isFinished && (
              <button onClick={() => setShowAdd(true)} className="btn btn-primary">
                <Plus className="h-4 w-4" /> Thêm bài tập đầu tiên
              </button>
            )}
          </div>
        )}

        {workout.exercises.map((we) => (
          <ExerciseCard
            key={we.id}
            we={we}
            isFinished={isFinished}
            onRest={(secs) => startRest(secs)}
            previousSetData={previousSetsMap[we.exercise.id]}
          />
        ))}
      </section>

      {!isFinished && (
        <div className="space-y-2">
          <button onClick={() => setShowAdd(true)} className="btn btn-secondary w-full">
            <Plus className="h-4 w-4" /> Thêm bài tập
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={handleDelete} className="btn btn-danger">
              <Trash2 className="h-4 w-4" /> Huỷ buổi
            </button>
            <button onClick={handleFinish} className="btn btn-primary">
              <Check className="h-4 w-4" /> Kết thúc
            </button>
          </div>
        </div>
      )}

      {isFinished && (
        <button onClick={handleDelete} className="btn btn-danger w-full">
          <Trash2 className="h-4 w-4" /> Xoá buổi tập
        </button>
      )}

      {showAdd && (
        <ExercisePicker
          exercises={allExercises}
          onClose={() => setShowAdd(false)}
          onPick={handleAddExercise}
        />
      )}
    </div>
  );
}

function ExerciseCard({
  we,
  isFinished,
  onRest,
  previousSetData,
}: {
  we: WorkoutExercise;
  isFinished: boolean;
  onRest: (secs: number) => void;
  previousSetData?: PreviousSetData;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [restEditing, setRestEditing] = useState(false);
  const [rest, setRest] = useState(we.restSeconds);
  const [showVideo, setShowVideo] = useState(false);
  const [bulkReps, setBulkReps] = useState<string>("");
  const info = getMuscleGroupInfo(we.exercise.muscleGroup);
  const hasVideo = !!we.exercise.videoUrl;

  function handleSetCount(target: number) {
    if (target < 0 || target > 20) return;
    startTransition(async () => {
      await setExerciseSetCount(we.id, target);
      router.refresh();
    });
  }

  function handleAddSet() {
    handleSetCount(we.sets.length + 1);
  }

  function handleApplyReps() {
    const v = bulkReps.trim() === "" ? null : Number(bulkReps);
    if (v !== null && (!Number.isFinite(v) || v < 0)) return;
    startTransition(async () => {
      await bulkSetReps(we.id, v);
      setBulkReps("");
      router.refresh();
    });
  }

  function handleRemove() {
    if (!confirm(`Xoá "${we.exercise.name}" khỏi buổi tập?`)) return;
    startTransition(async () => {
      await removeExerciseFromWorkout(we.id);
      router.refresh();
    });
  }

  function commitRest() {
    setRestEditing(false);
    if (rest !== we.restSeconds) {
      startTransition(async () => {
        await updateExerciseRest(we.id, rest);
        router.refresh();
      });
    }
  }

  const totalVolume = we.sets
    .filter((s) => s.weight !== null && s.reps !== null)
    .reduce((sum, s) => sum + calculateVolume(s.reps, s.weight), 0);

  // Reps phổ biến hiện tại để hiển thị placeholder
  const commonReps = (() => {
    if (we.sets.length === 0) return "";
    const counts = new Map<number, number>();
    for (const s of we.sets) {
      if (s.reps != null) counts.set(s.reps, (counts.get(s.reps) ?? 0) + 1);
    }
    let best: { reps: number; n: number } | null = null;
    for (const [reps, n] of counts.entries()) {
      if (!best || n > best.n) best = { reps, n };
    }
    return best ? best.reps.toString() : "";
  })();

  return (
    <div className="card space-y-3 !p-3 sm:!p-3.5">
      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl text-xl shrink-0 border",
            info.color
          )}
        >
          {info.emoji}
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold leading-tight truncate text-sm sm:text-base">
            {we.exercise.name}
          </h3>
          <p className="text-[11px] text-muted truncate">
            {we.exercise.primaryMuscle}
            {we.exercise.equipment &&
              ` • ${EQUIPMENT_LABELS[we.exercise.equipment] ?? we.exercise.equipment}`}
          </p>
          {previousSetData && (() => {
            // Tính target gợi ý: lấy set nặng nhất của buổi trước
            const bestPrev = previousSetData.sets.reduce((best, s) => {
              if (s.weight == null || s.reps == null) return best;
              const vol = s.weight * s.reps;
              if (!best || vol > (best.weight! * best.reps!)) return s;
              return best;
            }, null as (typeof previousSetData.sets)[0] | null);
            const targetWeight = bestPrev?.weight != null ? bestPrev.weight + 2.5 : null;
            const targetReps = bestPrev?.reps != null ? bestPrev.reps + 1 : null;

            return (
              <div className="flex flex-col gap-0.5 mt-0.5">
                <p className="text-[10px] text-primary/70 flex items-center gap-1">
                  <History className="h-3 w-3" />
                  Lần trước: {new Date(previousSetData.date).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}
                  {" — "}{previousSetData.sets.length} sets
                </p>
                {bestPrev?.weight != null && bestPrev?.reps != null && (
                  <p className="text-[10px] text-yellow-400/80 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    Mục tiêu: {targetWeight}kg × {bestPrev.reps} hoặc {bestPrev.weight}kg × {targetReps}
                  </p>
                )}
              </div>
            );
          })()}
        </div>
        <button
          onClick={() => setShowVideo(true)}
          className={cn(
            "btn btn-ghost btn-icon !h-9 !w-9 shrink-0",
            hasVideo ? "!text-primary" : "!text-muted"
          )}
          title={hasVideo ? "Xem video hướng dẫn" : "Tìm trên YouTube"}
        >
          <PlayCircle className="h-5 w-5" />
        </button>
        <Link
          href={`/exercises/${we.exercise.id}`}
          className="btn btn-ghost btn-icon !h-9 !w-9 !text-muted hover:!text-foreground shrink-0"
          title="Xem chi tiết bài tập"
        >
          <Info className="h-4 w-4" />
        </Link>
        {!isFinished && (
          <button
            onClick={handleRemove}
            className="btn btn-ghost btn-icon !h-9 !w-9 !text-muted hover:!text-danger shrink-0"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      <VideoModal
        open={showVideo}
        onClose={() => setShowVideo(false)}
        exerciseName={we.exercise.name}
        videoUrl={we.exercise.videoUrl}
      />

      {/* Quick controls: số sets + áp reps */}
      {!isFinished && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-surface/60 p-2">
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted px-1">Sets</span>
            <button
              onClick={() => handleSetCount(we.sets.length - 1)}
              disabled={we.sets.length <= 0}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card hover:border-primary/50 disabled:opacity-30"
              aria-label="Bớt 1 set"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="min-w-[1.75rem] text-center font-mono text-sm font-bold tabular-nums">
              {we.sets.length}
            </span>
            <button
              onClick={() => handleSetCount(we.sets.length + 1)}
              disabled={we.sets.length >= 20}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card hover:border-primary/50 disabled:opacity-30"
              aria-label="Thêm 1 set"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-1 ml-auto">
            <span className="text-xs text-muted px-1">Áp reps:</span>
            <input
              type="number"
              inputMode="numeric"
              placeholder={commonReps || "8"}
              value={bulkReps}
              onChange={(e) => setBulkReps(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleApplyReps();
                }
              }}
              className="!w-14 !py-1 !px-2 text-center text-sm"
            />
            <button
              onClick={handleApplyReps}
              disabled={bulkReps === ""}
              className="btn btn-secondary !py-1 !px-2 text-xs"
            >
              Áp
            </button>
          </div>
        </div>
      )}

      {/* Sets table */}
      <div className="space-y-1.5">
        <div className="grid grid-cols-[28px_1fr_1fr_44px_36px] items-center gap-1.5 px-1 text-[11px] uppercase tracking-wider text-muted">
          <span>Set</span>
          <span>Kg</span>
          <span>Reps</span>
          <span className="text-center flex justify-center"><Clock className="h-3.5 w-3.5 text-muted" /></span>
          <span></span>
        </div>
        {we.sets.length === 0 && (
          <p className="text-center text-xs text-muted py-2">Chưa có set nào</p>
        )}
        {we.sets.map((s) => {
          const prevSet = previousSetData?.sets.find((ps) => ps.setNumber === s.setNumber);
          return (
            <SetRow
              key={s.id}
              set={s}
              isFinished={isFinished}
              onComplete={() => onRest(we.restSeconds)}
              previousSet={prevSet}
            />
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        {!isFinished && (
          <button onClick={handleAddSet} className="btn btn-secondary flex-1 !py-2 text-sm">
            <Plus className="h-4 w-4" /> Thêm set
          </button>
        )}
        {restEditing ? (
          <div className="flex items-center gap-1 rounded-lg border border-border bg-surface px-2 py-1.5">
            <Clock className="h-3.5 w-3.5 text-muted" />
            <input
              autoFocus
              type="number"
              value={rest}
              onChange={(e) => setRest(Number(e.target.value))}
              onBlur={commitRest}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              }}
              className="!w-14 !border-0 !bg-transparent !p-0 text-sm focus:!shadow-none"
            />
            <span className="text-xs text-muted">s</span>
          </div>
        ) : (
          <button
            onClick={() => !isFinished && setRestEditing(true)}
            className="btn btn-ghost !py-2 text-xs text-muted hover:text-foreground"
          >
            <Clock className="h-3.5 w-3.5" /> Nghỉ {we.restSeconds}s
          </button>
        )}
      </div>

      {totalVolume > 0 && (
        <div className="text-right text-xs text-muted">
          Volume: <span className="font-semibold text-foreground">{totalVolume.toLocaleString("vi-VN")} kg</span>
        </div>
      )}
    </div>
  );
}

function SetRow({
  set,
  isFinished,
  onComplete,
  previousSet,
}: {
  set: SetEntry;
  isFinished: boolean;
  onComplete: () => void;
  previousSet?: { setNumber: number; weight: number | null; reps: number | null };
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [reps, setReps] = useState<string>(set.reps?.toString() ?? "");
  const [weight, setWeight] = useState<string>(set.weight?.toString() ?? "");
  const repsRef = useRef<HTMLInputElement>(null);
  const weightRef = useRef<HTMLInputElement>(null);
  const [showPR, setShowPR] = useState(false);

  // Đồng bộ lại state khi prop set thay đổi từ ngoài (vd: bulkSetReps)
  useEffect(() => {
    if (document.activeElement !== repsRef.current) {
      setReps(set.reps?.toString() ?? "");
    }
    if (document.activeElement !== weightRef.current) {
      setWeight(set.weight?.toString() ?? "");
    }
  }, [set.reps, set.weight]);

  // Progressive Overload Detection
  const currentWeight = weight === "" ? null : Number(weight);
  const currentReps = reps === "" ? null : Number(reps);
  const prevWeight = previousSet?.weight ?? null;
  const prevReps = previousSet?.reps ?? null;

  const isWeightUp = currentWeight != null && prevWeight != null && currentWeight > prevWeight;
  const isRepsUp = currentReps != null && prevReps != null && currentWeight != null && prevWeight != null
    && currentWeight >= prevWeight && currentReps > prevReps;
  const isVolumeUp = currentWeight != null && currentReps != null && prevWeight != null && prevReps != null
    && (currentWeight * currentReps) > (prevWeight * prevReps);
  const isPR = isWeightUp || isVolumeUp;

  // Trigger PR celebration khi phát hiện PR mới
  useEffect(() => {
    if (isPR && !isFinished) {
      setShowPR(true);
      const t = setTimeout(() => setShowPR(false), 2000);
      return () => clearTimeout(t);
    } else {
      setShowPR(false);
    }
  }, [isPR, isFinished]);

  function persist(field: "reps" | "weight", value: string) {
    const num = value === "" ? null : Number(value);
    startTransition(async () => {
      await updateSet(set.id, { [field]: num });
    });
  }

  function startRestTimer() {
    startTransition(async () => {
      await updateSet(set.id, {
        reps: reps === "" ? null : Number(reps),
        weight: weight === "" ? null : Number(weight),
      });
      router.refresh();
      onComplete();
    });
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteSet(set.id);
      router.refresh();
    });
  }

  const hasData = reps !== "" && weight !== "";

  return (
    <div
      className={cn(
        "grid grid-cols-[28px_1fr_1fr_44px_36px] items-center gap-1.5 rounded-lg px-1 py-1 transition-colors relative",
        hasData && !isPR && "bg-success/5",
        isPR && "bg-gradient-to-r from-yellow-500/10 via-orange-500/8 to-yellow-500/10 border border-yellow-500/20"
      )}
    >
      {/* PR celebration flash */}
      {showPR && (
        <span className="absolute inset-0 rounded-lg animate-pr-flash pointer-events-none" />
      )}
      <span
        className={cn(
          "flex h-6 w-6 items-center justify-center rounded-md text-xs font-semibold transition-colors relative",
          isPR
            ? "bg-yellow-500/30 text-yellow-400"
            : hasData
              ? "bg-success/30 text-success"
              : "bg-surface text-muted"
        )}
      >
        {isPR ? (
          <Flame className="h-3.5 w-3.5" />
        ) : (
          set.setNumber
        )}
      </span>
      <div className="relative">
        <input
          ref={weightRef}
          type="number"
          inputMode="decimal"
          step="0.5"
          placeholder={prevWeight != null ? String(prevWeight) : "0"}
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          onBlur={(e) => persist("weight", e.target.value)}
          disabled={isFinished}
          className={cn(
            "!py-1.5 !px-2 text-center text-sm",
            prevWeight != null && weight === "" && "!placeholder-primary/40",
            isWeightUp && "!border-yellow-500/50 !text-yellow-300"
          )}
        />
        {isWeightUp && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-yellow-500 text-[8px] text-black font-bold animate-scale-in z-10">
            ↑
          </span>
        )}
      </div>
      <div className="relative">
        <input
          ref={repsRef}
          type="number"
          inputMode="numeric"
          placeholder={prevReps != null ? String(prevReps) : "0"}
          value={reps}
          onChange={(e) => setReps(e.target.value)}
          onBlur={(e) => persist("reps", e.target.value)}
          disabled={isFinished}
          className={cn(
            "!py-1.5 !px-2 text-center text-sm",
            prevReps != null && reps === "" && "!placeholder-primary/40",
            isRepsUp && "!border-emerald-500/50 !text-emerald-300"
          )}
        />
        {isRepsUp && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[8px] text-black font-bold animate-scale-in z-10">
            ↑
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={startRestTimer}
        disabled={isFinished}
        className="flex h-8 w-11 items-center justify-center rounded-md border border-border text-muted hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors"
        title="Bắt đầu nghỉ"
      >
        <Clock className="h-4 w-4" />
      </button>
      {!isFinished ? (
        <button
          onClick={handleDelete}
          className="flex h-8 w-8 items-center justify-center text-muted hover:text-danger"
        >
          <X className="h-4 w-4" />
        </button>
      ) : (
        <span />
      )}
    </div>
  );
}

function ExercisePicker({
  exercises,
  onClose,
  onPick,
}: {
  exercises: Exercise[];
  onClose: () => void;
  onPick: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const [group, setGroup] = useState<string>("all");

  const groups = Object.entries(MUSCLE_GROUPS);
  const filtered = exercises.filter((e) => {
    if (group !== "all" && e.muscleGroup !== group) return false;
    if (q && !`${e.name} ${e.nameEn ?? ""}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-md p-0 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[88dvh] overflow-hidden flex flex-col rounded-t-2xl sm:rounded-2xl border border-border bg-card animate-slide-up shadow-2xl shadow-black/50"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mt-2 mb-1 h-1 w-10 rounded-full bg-border sm:hidden" />
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-bold text-base">Chọn bài tập</h3>
          <button onClick={onClose} className="btn btn-ghost btn-icon">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-4 space-y-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm bài tập..."
              className="!pl-9"
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
            <button
              onClick={() => setGroup("all")}
              className={cn(
                "chip whitespace-nowrap shrink-0 cursor-pointer",
                group === "all"
                  ? "border-primary bg-primary/20 text-primary"
                  : "border-border bg-surface text-muted"
              )}
            >
              Tất cả
            </button>
            {groups.map(([key, info]) => (
              <button
                key={key}
                onClick={() => setGroup(key)}
                className={cn(
                  "chip whitespace-nowrap shrink-0 cursor-pointer",
                  group === key ? info.color : "border-border bg-surface text-muted"
                )}
              >
                <span>{info.emoji}</span> {info.label}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-y-auto p-4 space-y-1.5">
          {filtered.length === 0 && (
            <p className="text-center text-sm text-muted py-8">Không tìm thấy bài tập</p>
          )}
          {filtered.map((e) => {
            const info = getMuscleGroupInfo(e.muscleGroup);
            return (
              <button
                key={e.id}
                onClick={() => onPick(e.id)}
                className="w-full flex items-center gap-3 rounded-lg border border-border bg-surface/40 hover:bg-surface hover:border-primary/50 p-3 text-left transition-colors"
              >
                <span className="text-xl shrink-0">{info.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium truncate">{e.name}</span>
                    {e.videoUrl && <PlayCircle className="h-3.5 w-3.5 text-primary shrink-0" />}
                  </div>
                  <div className="text-xs text-muted truncate">
                    {e.primaryMuscle}
                    {e.equipment && ` • ${EQUIPMENT_LABELS[e.equipment] ?? e.equipment}`}
                  </div>
                </div>
                <ChevronDown className="h-4 w-4 text-muted shrink-0 -rotate-90" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
