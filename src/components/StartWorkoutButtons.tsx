"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus, Loader2 } from "lucide-react";
import { startEmptyWorkout, startWorkoutFromTemplate } from "@/app/actions/workout";
import { useActiveWorkout } from "./ActiveWorkoutProvider";

type Template = {
  id: string;
  name: string;
  emoji: string | null;
  description: string | null;
  _count: { exercises: number };
};

export default function StartWorkoutButtons({ templates }: { templates: Template[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const { setActiveWorkoutId } = useActiveWorkout();

  function handleEmpty() {
    setLoadingId("empty");
    startTransition(async () => {
      const w = await startEmptyWorkout();
      setActiveWorkoutId(w.id);
      router.push(`/workout/${w.id}`);
    });
  }

  function handleTemplate(id: string) {
    setLoadingId(id);
    startTransition(async () => {
      const w = await startWorkoutFromTemplate(id);
      setActiveWorkoutId(w.id);
      router.push(`/workout/${w.id}`);
    });
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      <button
        onClick={handleEmpty}
        disabled={pending}
        className="tappable group relative flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border bg-surface/40 p-3 hover:border-primary/60 hover:bg-surface min-h-[96px] transition-colors"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary group-hover:bg-primary/25 transition-colors">
          {loadingId === "empty" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
        </span>
        <span className="text-sm font-semibold leading-tight">Buổi trống</span>
        <span className="text-[10px] text-muted">Tự thêm bài</span>
      </button>
      {templates.map((t) => (
        <button
          key={t.id}
          onClick={() => handleTemplate(t.id)}
          disabled={pending}
          className="tappable group relative flex flex-col items-center justify-center gap-1.5 rounded-xl border border-border bg-surface/40 p-3 hover:border-primary/60 hover:bg-surface min-h-[96px] transition-colors overflow-hidden"
        >
          <div className="absolute -right-3 -top-3 h-12 w-12 rounded-full bg-primary/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
          <span className="text-2xl leading-none">
            {loadingId === t.id ? (
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            ) : (
              t.emoji || "💪"
            )}
          </span>
          <span className="relative text-sm font-semibold text-center leading-tight">
            {t.name}
          </span>
          <span className="relative text-[10px] text-muted">
            {t._count.exercises} bài tập
          </span>
        </button>
      ))}
    </div>
  );
}
