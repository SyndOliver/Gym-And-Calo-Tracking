"use client";

import { useActiveWorkout } from "./ActiveWorkoutProvider";
import { Pause, Play, X, Plus, Minus } from "lucide-react";
import { formatDuration } from "@/lib/utils";

export default function RestTimer() {
  const { rest, stopRest, addRest, startRest } = useActiveWorkout();

  if (rest.initial === 0 && rest.remaining === 0 && !rest.isRunning) return null;

  const progress =
    rest.initial > 0 ? Math.max(0, Math.min(100, (rest.remaining / rest.initial) * 100)) : 0;
  const isOver = rest.remaining === 0;

  return (
    <div className="fixed inset-x-0 bottom-[88px] z-30 px-3 sm:px-4 pointer-events-none">
      <div className="mx-auto w-full max-w-2xl pointer-events-auto">
        <div
          className={`relative overflow-hidden rounded-2xl border bg-card/95 backdrop-blur-xl p-3 shadow-2xl shadow-black/40 animate-slide-up ${
            isOver ? "border-success/60 shadow-success/20" : "border-primary/50 shadow-primary/20"
          }`}
        >
          <div
            className={`absolute inset-y-0 left-0 transition-all duration-1000 ease-linear ${
              isOver ? "bg-gradient-to-r from-success/25 to-success/5" : "bg-gradient-to-r from-primary/25 to-accent/10"
            }`}
            style={{ width: `${progress}%` }}
          />
          <div className="relative flex items-center gap-3">
            <div className="flex flex-col">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                {isOver ? "✓ Hết giờ nghỉ" : "Đang nghỉ"}
              </span>
              <span
                className={`tabular text-2xl font-bold ${
                  isOver ? "text-success" : "text-foreground"
                }`}
              >
                {formatDuration(rest.remaining)}
              </span>
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <button
                className="btn btn-secondary btn-icon !h-9 !w-9"
                onClick={() => addRest(-15)}
                aria-label="Giảm 15s"
              >
                <Minus className="h-4 w-4" />
              </button>
              <button
                className="btn btn-secondary btn-icon !h-9 !w-9"
                onClick={() => addRest(15)}
                aria-label="Thêm 15s"
              >
                <Plus className="h-4 w-4" />
              </button>
              {rest.isRunning ? (
                <button
                  className="btn btn-secondary btn-icon !h-9 !w-9"
                  onClick={() => stopRest()}
                  aria-label="Dừng"
                >
                  <Pause className="h-4 w-4" />
                </button>
              ) : (
                !isOver && (
                  <button
                    className="btn btn-primary btn-icon !h-9 !w-9"
                    onClick={() => startRest(rest.remaining || rest.initial || 60)}
                    aria-label="Tiếp tục"
                  >
                    <Play className="h-4 w-4" />
                  </button>
                )
              )}
              <button
                className="btn btn-ghost btn-icon !h-9 !w-9 !text-muted hover:!text-foreground"
                onClick={() => stopRest()}
                aria-label="Đóng"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
