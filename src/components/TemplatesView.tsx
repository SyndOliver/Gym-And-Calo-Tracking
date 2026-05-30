"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, X, Play, Loader2, GripVertical, Pencil } from "lucide-react";
import { cn, getMuscleGroupInfo, MUSCLE_GROUPS } from "@/lib/utils";
import { createTemplate, deleteTemplate, updateTemplate } from "@/app/actions/template";
import { startWorkoutFromTemplate } from "@/app/actions/workout";
import { useActiveWorkout } from "./ActiveWorkoutProvider";
import PageHeader from "./PageHeader";

type Exercise = {
  id: string;
  name: string;
  muscleGroup: string;
  primaryMuscle: string | null;
  equipment: string | null;
};

type TemplateExercise = {
  id: string;
  defaultSets: number;
  defaultReps: number;
  restSeconds: number;
  exercise: Exercise;
};

type Template = {
  id: string;
  name: string;
  description: string | null;
  emoji: string | null;
  exercises: TemplateExercise[];
};

const EMOJIS = ["💪", "🔥", "🦵", "🏋️", "⚡", "🥊", "🏃", "🧘", "🎯", "🚴", "❤️"];

export default function TemplatesView({
  templates,
  exercises,
}: {
  templates: Template[];
  exercises: Exercise[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [showCreate, setShowCreate] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [startingId, setStartingId] = useState<string | null>(null);
  const { setActiveWorkoutId } = useActiveWorkout();

  function handleStart(id: string) {
    setStartingId(id);
    startTransition(async () => {
      const w = await startWorkoutFromTemplate(id);
      setActiveWorkoutId(w.id);
      router.push(`/workout/${w.id}`);
    });
  }

  function handleDelete(id: string, name: string) {
    if (!confirm(`Xoá template "${name}"?`)) return;
    startTransition(async () => {
      await deleteTemplate(id);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Templates"
        subtitle="Mẫu buổi tập có sẵn để khởi động nhanh"
        emoji="📋"
        back={{ href: "/", label: "Trang chủ" }}
        action={
          <button onClick={() => setShowCreate(true)} className="btn btn-primary !py-2">
            <Plus className="h-4 w-4" /> Tạo
          </button>
        }
      />

      <section className="space-y-3">
        {templates.length === 0 && (
          <div className="card text-center py-10 text-sm text-muted">
            Chưa có template nào. Tạo template đầu tiên để bắt đầu!
          </div>
        )}
        {templates.map((t) => {
          const groups = Array.from(new Set(t.exercises.map((e) => e.exercise.muscleGroup)));
          return (
            <div key={t.id} className="card space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-3xl shrink-0">{t.emoji || "💪"}</span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold leading-tight">{t.name}</h3>
                  {t.description && (
                    <p className="text-xs text-muted mt-0.5">{t.description}</p>
                  )}
                  <div className="flex items-center gap-1 flex-wrap mt-1.5">
                    {groups.map((g) => {
                      const info = getMuscleGroupInfo(g);
                      return (
                        <span key={g} className={`chip ${info.color} !text-[10px] !py-0`}>
                          <span>{info.emoji}</span> {info.label}
                        </span>
                      );
                    })}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setEditingTemplate(t)}
                    className="btn btn-ghost btn-icon !text-muted hover:!text-primary"
                    title="Sửa template"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(t.id, t.name)}
                    className="btn btn-ghost btn-icon !text-muted hover:!text-danger"
                    title="Xoá template"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <ul className="space-y-1">
                {t.exercises.map((e) => {
                  const info = getMuscleGroupInfo(e.exercise.muscleGroup);
                  return (
                    <li
                      key={e.id}
                      className="flex items-center gap-2 rounded-lg bg-surface/50 px-3 py-2 text-sm"
                    >
                      <span className="text-base shrink-0">{info.emoji}</span>
                      <span className="flex-1 truncate">{e.exercise.name}</span>
                      <span className="text-xs text-muted shrink-0">
                        {e.defaultSets} × {e.defaultReps}
                      </span>
                    </li>
                  );
                })}
              </ul>

              <button
                onClick={() => handleStart(t.id)}
                disabled={startingId !== null}
                className="btn btn-primary w-full"
              >
                {startingId === t.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                Bắt đầu buổi tập này
              </button>
            </div>
          );
        })}
      </section>

      {showCreate && (
        <TemplateModal exercises={exercises} onClose={() => setShowCreate(false)} />
      )}
      {editingTemplate && (
        <TemplateModal
          exercises={exercises}
          template={editingTemplate}
          onClose={() => setEditingTemplate(null)}
        />
      )}
    </div>
  );
}

function TemplateModal({
  exercises,
  onClose,
  template,
}: {
  exercises: Exercise[];
  onClose: () => void;
  template?: Template;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [name, setName] = useState(template?.name ?? "");
  const [description, setDescription] = useState(template?.description ?? "");
  const [emoji, setEmoji] = useState(template?.emoji ?? "💪");
  const [picked, setPicked] = useState<string[]>(
    template?.exercises.map((e) => e.exercise.id) ?? []
  );
  const [q, setQ] = useState("");
  const [group, setGroup] = useState<string>("all");

  const groups = Object.entries(MUSCLE_GROUPS);

  const filtered = exercises.filter((e) => {
    if (group !== "all" && e.muscleGroup !== group) return false;
    if (q && !e.name.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  function toggle(id: string) {
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }

  function move(idx: number, dir: -1 | 1) {
    setPicked((p) => {
      const next = [...p];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return p;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || picked.length === 0) return;
    startTransition(async () => {
      if (template) {
        await updateTemplate(template.id, {
          name: name.trim(),
          description: description.trim() || undefined,
          emoji,
          exerciseIds: picked,
        });
      } else {
        await createTemplate({
          name: name.trim(),
          description: description.trim() || undefined,
          emoji,
          exerciseIds: picked,
        });
      }
      router.refresh();
      onClose();
    });
  }

  const exMap = new Map(exercises.map((e) => [e.id, e]));

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-md p-0 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[90dvh] flex flex-col rounded-t-2xl sm:rounded-2xl border border-border bg-card animate-slide-up shadow-2xl shadow-black/50"
      >
        <div className="mx-auto mt-2 mb-1 h-1 w-10 rounded-full bg-border sm:hidden" />
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-bold text-base">
            {template ? "Cập nhật template" : "Tạo template mới"}
          </h3>
          <button type="button" onClick={onClose} className="btn btn-ghost btn-icon">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-4 space-y-4">
          <div className="grid grid-cols-[auto_1fr] gap-3">
            <div>
              <label className="text-xs text-muted">Icon</label>
              <select
                value={emoji}
                onChange={(e) => setEmoji(e.target.value)}
                className="!w-20 text-2xl text-center"
              >
                {EMOJIS.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted">Tên template *</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: Push - Vai dày"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted">Mô tả (tuỳ chọn)</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="VD: Tập trung vai trên + ngực giữa"
            />
          </div>

          {picked.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs text-muted">Bài đã chọn ({picked.length})</label>
              <ul className="space-y-1">
                {picked.map((id, idx) => {
                  const ex = exMap.get(id);
                  if (!ex) return null;
                  const info = getMuscleGroupInfo(ex.muscleGroup);
                  return (
                    <li
                      key={id}
                      className="flex items-center gap-2 rounded-lg bg-surface/60 px-2 py-1.5"
                    >
                      <button
                        type="button"
                        onClick={() => move(idx, -1)}
                        disabled={idx === 0}
                        className="text-muted disabled:opacity-30"
                      >
                        <GripVertical className="h-4 w-4" />
                      </button>
                      <span className="text-sm shrink-0">{info.emoji}</span>
                      <span className="flex-1 truncate text-sm">{ex.name}</span>
                      <button
                        type="button"
                        onClick={() => toggle(id)}
                        className="text-muted hover:text-danger"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs text-muted">Chọn bài tập</label>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm bài tập..."
            />
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
              <button
                type="button"
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
                  type="button"
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
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {filtered.map((e) => {
                const isPicked = picked.includes(e.id);
                const info = getMuscleGroupInfo(e.muscleGroup);
                return (
                  <button
                    type="button"
                    key={e.id}
                    onClick={() => toggle(e.id)}
                    className={cn(
                      "w-full flex items-center gap-3 rounded-lg border p-2.5 text-left transition-colors",
                      isPicked
                        ? "border-primary bg-primary/10"
                        : "border-border bg-surface/40 hover:border-primary/40"
                    )}
                  >
                    <span className="text-lg shrink-0">{info.emoji}</span>
                    <span className="flex-1 truncate text-sm">{e.name}</span>
                    {isPicked && (
                      <span className="chip border-primary/40 bg-primary/20 text-primary !py-0 !text-[10px]">
                        ✓ Đã chọn
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="border-t border-border p-4">
          <button
            type="submit"
            disabled={!name.trim() || picked.length === 0}
            className="btn btn-primary w-full"
          >
            {template ? "Cập nhật template" : `Tạo template (${picked.length} bài)`}
          </button>
        </div>
      </form>
    </div>
  );
}
