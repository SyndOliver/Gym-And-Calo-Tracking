"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn, formatLongDuration, getMuscleGroupInfo } from "@/lib/utils";
import PageHeader from "./PageHeader";

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

export default function CalendarView({ items }: { items: Item[] }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState<string>(ymd(today));

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
