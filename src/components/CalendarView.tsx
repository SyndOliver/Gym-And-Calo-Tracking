"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Flame, Zap, TrendingUp, Loader2 } from "lucide-react";
import { cn, formatLongDuration, getMuscleGroupInfo } from "@/lib/utils";
import PageHeader from "./PageHeader";
import { saveCaloriesOut } from "@/app/actions/food";

type Item = {
  id: string;
  name: string;
  startedAt: Date | string;
  finishedAt: Date | string | null;
  durationSec: number | null;
  muscleGroups: string[];
  exerciseCount: number;
  totalSets: number;
  totalVolume: number;
};

const WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const MONTHS = [
  "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
  "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12",
];

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function CalendarView({
  items,
  foodCalsByDay,
  caloriesOutByDay,
}: {
  items: Item[];
  foodCalsByDay: Record<string, number>;
  caloriesOutByDay: Record<string, number>;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState<string>(ymd(today));
  const [calOutDraft, setCalOutDraft] = useState<Record<string, string>>({});
  const [savingCalOut, setSavingCalOut] = useState(false);
  const [calOutError, setCalOutError] = useState<string | null>(null);

  async function handleSaveCalOut() {
    const raw = calOutDraft[selected] ?? String(caloriesOutByDay[selected] ?? "");
    const val = Number(raw);
    if (!raw.trim() || !Number.isFinite(val) || val < 0) return;
    setSavingCalOut(true);
    setCalOutError(null);
    try {
      await saveCaloriesOut(selected, val);
      // optimistic: update local cache key
      caloriesOutByDay[selected] = Math.round(val);
    } catch (e) {
      setCalOutError(e instanceof Error ? e.message : "Không lưu được");
    } finally {
      setSavingCalOut(false);
    }
  }

  const byDay = useMemo(() => {
    const m = new Map<string, Item[]>();
    for (const it of items) {
      const key = ymd(new Date(it.startedAt));
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(it);
    }
    return m;
  }, [items]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let i = 1; i <= daysInMonth; i++) cells.push(new Date(year, month, i));
  while (cells.length % 7 !== 0) cells.push(null);

  const monthCount = items.filter((it) => {
    const d = new Date(it.startedAt);
    return d.getFullYear() === year && d.getMonth() === month && it.finishedAt;
  }).length;

  const selectedItems = byDay.get(selected) ?? [];

  return (
    <div className="space-y-4">
      <PageHeader title="Lịch tập" subtitle="Theo dõi tần suất tập luyện" emoji="📅" />

      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCursor(new Date(year, month - 1, 1))}
            className="btn btn-ghost btn-icon"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="text-center">
            <div className="font-semibold">
              {MONTHS[month]} {year}
            </div>
            <div className="text-xs text-muted">{monthCount} buổi tập</div>
          </div>
          <button
            onClick={() => setCursor(new Date(year, month + 1, 1))}
            className="btn btn-ghost btn-icon"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-1 font-medium">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((d, idx) => {
            if (!d) return <div key={idx} />;
            const key = ymd(d);
            const dayItems = byDay.get(key) ?? [];
            const isToday = ymd(today) === key;
            const isSelected = selected === key;
            const hasWorkout = dayItems.length > 0;
            const groups = Array.from(new Set(dayItems.flatMap((it) => it.muscleGroups))).slice(0, 3);

            return (
              <button
                key={idx}
                onClick={() => setSelected(key)}
                className={cn(
                  "relative aspect-square rounded-lg border text-sm font-medium transition-all flex flex-col items-center justify-center gap-1",
                  isSelected
                    ? "border-primary bg-primary/15 text-primary"
                    : hasWorkout
                    ? "border-success/30 bg-success/10 text-foreground hover:border-success/50"
                    : "border-border bg-surface/40 text-muted hover:border-primary/30",
                  isToday && !isSelected && "ring-1 ring-primary/40"
                )}
              >
                <span className={isToday ? "font-bold" : ""}>{d.getDate()}</span>
                {hasWorkout && (
                  <div className="flex items-center gap-0.5">
                    {groups.map((g) => {
                      const info = getMuscleGroupInfo(g);
                      return (
                        <span key={g} className="text-[9px] leading-none">
                          {info.emoji}
                        </span>
                      );
                    })}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">
          {new Date(selected).toLocaleDateString("vi-VN", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </h2>

        {/* Calories IN / OUT summary */}
        <div className="card !p-3 grid grid-cols-2 gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 text-xs text-muted">
              <Flame className="h-3.5 w-3.5 text-warning" />
              Calories nạp vào
            </div>
            <div className="text-lg font-bold">
              {foodCalsByDay[selected] ? `${Math.round(foodCalsByDay[selected])} kcal` : <span className="text-muted text-sm font-normal">Chưa ghi nhận</span>}
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted">
              <Zap className="h-3.5 w-3.5 text-success" />
              Calories tiêu thụ
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={20000}
                className="!py-1 !px-2 text-sm w-24"
                placeholder={String(caloriesOutByDay[selected] ?? "")}
                value={calOutDraft[selected] ?? (caloriesOutByDay[selected] != null ? String(caloriesOutByDay[selected]) : "")}
                onChange={(e) => setCalOutDraft((prev) => ({ ...prev, [selected]: e.target.value }))}
              />
              <button
                type="button"
                className="btn btn-primary !py-1 !px-2 text-xs"
                onClick={handleSaveCalOut}
                disabled={savingCalOut}
              >
                {savingCalOut ? <Loader2 className="h-3 w-3 animate-spin" /> : "Lưu"}
              </button>
            </div>
            {calOutError && <p className="text-xs text-danger">{calOutError}</p>}
          </div>
        </div>

        {/* Net calories */}
        {(foodCalsByDay[selected] || caloriesOutByDay[selected]) && (
          <div className="card !p-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted">Cân bằng năng lượng:</span>
            <span className={cn(
              "ml-auto font-bold text-sm",
              (foodCalsByDay[selected] ?? 0) - (caloriesOutByDay[selected] ?? 0) > 0 ? "text-warning" : "text-success"
            )}>
              {(foodCalsByDay[selected] ?? 0) - (caloriesOutByDay[selected] ?? 0) > 0 ? "+" : ""}
              {Math.round((foodCalsByDay[selected] ?? 0) - (caloriesOutByDay[selected] ?? 0))} kcal
            </span>
          </div>
        )}

        {selectedItems.length === 0 ? (
          <div className="card text-center py-6 text-sm text-muted">
            Không có buổi tập nào trong ngày này
          </div>
        ) : (
          selectedItems.map((it) => (
            <Link
              key={it.id}
              href={`/workout/${it.id}`}
              className="card flex items-center justify-between hover:border-primary/50 transition-colors"
            >
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold truncate">{it.name}</span>
                  {!it.finishedAt && (
                    <span className="chip border-primary/40 bg-primary/15 text-primary !text-[10px] !py-0">
                      Đang tập
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {it.muscleGroups.map((g) => {
                    const info = getMuscleGroupInfo(g);
                    return (
                      <span key={g} className={`chip ${info.color} !text-[10px] !py-0`}>
                        <span>{info.emoji}</span> {info.label}
                      </span>
                    );
                  })}
                </div>
                <p className="text-xs text-muted">
                  {it.exerciseCount} bài • {it.totalSets} sets •{" "}
                  {it.totalVolume.toLocaleString("vi-VN")} kg
                  {it.durationSec ? ` • ${formatLongDuration(it.durationSec)}` : ""}
                </p>
              </div>
            </Link>
          ))
        )}
      </section>
    </div>
  );
}
