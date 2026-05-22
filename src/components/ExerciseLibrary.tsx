"use client";

import Link from "next/link";
import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Trash2, X, PlayCircle, ChevronRight } from "lucide-react";
import { cn, EQUIPMENT_LABELS, getMuscleGroupInfo, MUSCLE_GROUPS } from "@/lib/utils";
import { createExercise, deleteExercise } from "@/app/actions/exercise";
import PageHeader from "./PageHeader";

type Exercise = {
  id: string;
  name: string;
  nameEn: string | null;
  muscleGroup: string;
  primaryMuscle: string | null;
  equipment: string | null;
  videoUrl: string | null;
  isCustom: boolean;
};

export default function ExerciseLibrary({ exercises }: { exercises: Exercise[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [q, setQ] = useState("");
  const [group, setGroup] = useState<string>("all");
  const [showAdd, setShowAdd] = useState(false);

  const groups = Object.entries(MUSCLE_GROUPS);

  const filtered = useMemo(() => {
    return exercises.filter((e) => {
      if (group !== "all" && e.muscleGroup !== group) return false;
      if (q && !`${e.name} ${e.nameEn ?? ""}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [exercises, q, group]);

  const grouped = useMemo(() => {
    const m = new Map<string, Exercise[]>();
    filtered.forEach((e) => {
      if (!m.has(e.muscleGroup)) m.set(e.muscleGroup, []);
      m.get(e.muscleGroup)!.push(e);
    });
    return m;
  }, [filtered]);

  function handleDelete(id: string, name: string) {
    if (!confirm(`Xoá bài tập "${name}"?`)) return;
    startTransition(async () => {
      await deleteExercise(id);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Thư viện"
        subtitle={`${exercises.length} bài tập có sẵn`}
        emoji="📚"
        action={
          <button onClick={() => setShowAdd(true)} className="btn btn-primary !py-2">
            <Plus className="h-4 w-4" /> Thêm
          </button>
        }
      />

      <div className="space-y-2.5 sticky top-0 z-20 -mx-3 sm:-mx-4 px-3 sm:px-4 py-2 bg-background/85 backdrop-blur-xl border-b border-border/50">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted pointer-events-none" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm bài tập (tiếng Việt hoặc Anh)..."
            className="!pl-9"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-3 sm:-mx-4 px-3 sm:px-4 pb-1">
          <button
            onClick={() => setGroup("all")}
            className={cn(
              "chip tappable whitespace-nowrap shrink-0 cursor-pointer transition-all",
              group === "all"
                ? "border-primary bg-primary/25 text-primary shadow-sm shadow-primary/20"
                : "border-border bg-surface/60 text-muted hover:text-foreground"
            )}
          >
            Tất cả ({exercises.length})
          </button>
          {groups.map(([key, info]) => {
            const count = exercises.filter((e) => e.muscleGroup === key).length;
            if (count === 0) return null;
            return (
              <button
                key={key}
                onClick={() => setGroup(key)}
                className={cn(
                  "chip tappable whitespace-nowrap shrink-0 cursor-pointer transition-all",
                  group === key
                    ? `${info.color} shadow-sm`
                    : "border-border bg-surface/60 text-muted hover:text-foreground"
                )}
              >
                <span>{info.emoji}</span> {info.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      <section className="space-y-4">
        {filtered.length === 0 && (
          <div className="card text-center py-10 text-sm text-muted">
            Không tìm thấy bài tập nào
          </div>
        )}
        {Array.from(grouped.entries()).map(([gKey, list]) => {
          const info = getMuscleGroupInfo(gKey);
          return (
            <div key={gKey} className="space-y-2">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted px-1">
                <span className="text-base">{info.emoji}</span>
                {info.label}
                <span className="text-xs font-normal opacity-60">({list.length})</span>
              </h2>
              <div className="grid gap-1.5">
                {list.map((e) => (
                  <div
                    key={e.id}
                    className="card !p-0 flex items-center gap-1 hover:border-primary/40 transition-colors overflow-hidden"
                  >
                    <Link
                      href={`/exercises/${e.id}`}
                      className="tappable flex-1 min-w-0 flex items-center gap-3 p-3"
                    >
                      <span
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-lg text-lg shrink-0 border",
                          info.color
                        )}
                      >
                        {info.emoji}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold truncate">{e.name}</span>
                          {e.videoUrl && (
                            <PlayCircle
                              className="h-3.5 w-3.5 text-primary shrink-0"
                              aria-label="Có video"
                            />
                          )}
                          {e.isCustom && (
                            <span className="chip border-accent/40 bg-accent/15 text-accent !text-[10px] !py-0">
                              Tự tạo
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted truncate">
                          {e.primaryMuscle}
                          {e.equipment &&
                            ` • ${EQUIPMENT_LABELS[e.equipment] ?? e.equipment}`}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted shrink-0" />
                    </Link>
                    {e.isCustom && (
                      <button
                        onClick={() => handleDelete(e.id, e.name)}
                        className="btn btn-ghost btn-icon !text-muted hover:!text-danger mr-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </section>

      {showAdd && <AddExerciseModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}

function AddExerciseModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [muscleGroup, setMuscleGroup] = useState<string>("chest");
  const [primaryMuscle, setPrimaryMuscle] = useState("");
  const [equipment, setEquipment] = useState("barbell");
  const [videoUrl, setVideoUrl] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    startTransition(async () => {
      await createExercise({
        name: name.trim(),
        muscleGroup,
        primaryMuscle: primaryMuscle.trim() || undefined,
        equipment: equipment || undefined,
        videoUrl: videoUrl.trim() || undefined,
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
        className="w-full max-w-md rounded-t-2xl sm:rounded-2xl border border-border bg-card p-4 space-y-4 animate-slide-up shadow-2xl shadow-black/50 max-h-[90dvh] overflow-y-auto"
      >
        <div className="mx-auto -mt-2 mb-1 h-1 w-10 rounded-full bg-border sm:hidden" />
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base">Thêm bài tập tự tạo</h3>
          <button type="button" onClick={onClose} className="btn btn-ghost btn-icon">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted">Tên bài tập *</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="VD: Cable Crunch nghiêng"
            required
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted">Nhóm cơ *</label>
          <select value={muscleGroup} onChange={(e) => setMuscleGroup(e.target.value)}>
            {Object.entries(MUSCLE_GROUPS).map(([key, info]) => (
              <option key={key} value={key}>
                {info.emoji} {info.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted">Cơ chính (tuỳ chọn)</label>
          <input
            value={primaryMuscle}
            onChange={(e) => setPrimaryMuscle(e.target.value)}
            placeholder="VD: Ngực trên"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted">Dụng cụ</label>
          <select value={equipment} onChange={(e) => setEquipment(e.target.value)}>
            {Object.entries(EQUIPMENT_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted">Link video YouTube (tuỳ chọn)</label>
          <input
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="VD: https://youtu.be/abc123 hoặc abc123"
          />
          <p className="text-[10px] text-muted">
            Dán link YouTube đầy đủ hoặc chỉ ID 11 ký tự
          </p>
        </div>

        <button type="submit" className="btn btn-primary w-full">
          <Plus className="h-4 w-4" /> Thêm bài tập
        </button>
      </form>
    </div>
  );
}
