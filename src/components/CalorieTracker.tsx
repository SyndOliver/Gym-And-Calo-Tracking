"use client";

import { useRef, useState, useTransition } from "react";
import { Camera, Flame, Trash2, ChevronDown, ChevronUp, Loader2, ImagePlus } from "lucide-react";
import { cn } from "@/lib/utils";
import PageHeader from "./PageHeader";
import {
  saveCalorieEntry,
  deleteCalorieEntry,
} from "@/app/actions/calories";
import type { CalorieAnalysis, FoodItem } from "@/app/api/calories/analyze/route";

type CalorieEntryRecord = {
  id: string;
  date: Date;
  imageThumbnail: string | null;
  foods: unknown;
  totalCalories: number;
  notes: string | null;
};

function resizeImageToBase64(file: File, maxPx = 800): Promise<{ base64: string; mimeType: string; thumbnail: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, h);

      const base64Full = canvas.toDataURL("image/jpeg", 0.85).split(",")[1];

      // Thumbnail nhỏ hơn để lưu DB
      const tScale = Math.min(1, 120 / Math.max(img.width, img.height));
      const tw = Math.round(img.width * tScale);
      const th = Math.round(img.height * tScale);
      const tCanvas = document.createElement("canvas");
      tCanvas.width = tw;
      tCanvas.height = th;
      tCanvas.getContext("2d")!.drawImage(img, 0, 0, tw, th);
      const thumbnail = tCanvas.toDataURL("image/jpeg", 0.6);

      URL.revokeObjectURL(url);
      resolve({ base64: base64Full, mimeType: "image/jpeg", thumbnail });
    };
    img.onerror = reject;
    img.src = url;
  });
}

function groupEntriesByDate(entries: CalorieEntryRecord[]) {
  const groups = new Map<string, CalorieEntryRecord[]>();
  for (const e of entries) {
    const key = new Date(e.date).toLocaleDateString("vi-VN", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const arr = groups.get(key) ?? [];
    arr.push(e);
    groups.set(key, arr);
  }
  return Array.from(groups.entries());
}

export default function CalorieTracker({ initialEntries }: { initialEntries: CalorieEntryRecord[] }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<{ base64: string; mimeType: string; thumbnail: string } | null>(null);
  const [analysis, setAnalysis] = useState<CalorieAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState(initialEntries);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setAnalysis(null);
    setPreview(URL.createObjectURL(file));
    setAnalyzing(true);

    try {
      const resized = await resizeImageToBase64(file);
      setPendingFile(resized);

      const res = await fetch("/api/calories/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: resized.base64, mimeType: resized.mimeType }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Lỗi khi phân tích ảnh");
      }

      const data: CalorieAnalysis = await res.json();
      setAnalysis(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi không xác định");
    } finally {
      setAnalyzing(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function handleSave() {
    if (!analysis || !pendingFile) return;
    startTransition(async () => {
      const entry = await saveCalorieEntry({
        foods: analysis.foods,
        totalCalories: analysis.totalCalories,
        notes: analysis.notes || undefined,
        imageThumbnail: pendingFile.thumbnail,
      });
      setEntries((prev) => [{ ...entry, foods: analysis.foods }, ...prev]);
      setPreview(null);
      setPendingFile(null);
      setAnalysis(null);
    });
  }

  function handleDiscard() {
    setPreview(null);
    setPendingFile(null);
    setAnalysis(null);
    setError(null);
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteCalorieEntry(id);
      setEntries((prev) => prev.filter((e) => e.id !== id));
    });
  }

  function toggleDate(key: string) {
    setExpandedDates((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  const groups = groupEntriesByDate(entries);

  return (
    <div className="space-y-6">
      <PageHeader title="Calories" subtitle="Phân tích thức ăn bằng AI" />

      {/* Upload / Camera */}
      {!preview && (
        <button
          onClick={() => fileRef.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border/60 bg-card/40 py-10 transition-colors hover:border-primary/50 hover:bg-card/60 active:scale-[0.98]"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Camera className="h-7 w-7 text-primary" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-foreground">Chụp ảnh / Tải ảnh lên</p>
            <p className="mt-0.5 text-sm text-muted">AI sẽ nhận diện món ăn và tính calories</p>
          </div>
        </button>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Preview + analysis */}
      {preview && (
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Ảnh thức ăn" className="w-full rounded-2xl object-cover max-h-72" />
            {analyzing && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl bg-black/60 backdrop-blur-sm">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm font-medium text-white">Đang phân tích...</p>
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400 border border-red-500/20">
              {error}
            </div>
          )}

          {analysis && (
            <div className="space-y-3 rounded-2xl bg-card/60 p-4 border border-border/60">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">Kết quả phân tích</h3>
                <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1">
                  <Flame className="h-4 w-4 text-orange-400" />
                  <span className="font-bold text-primary">{analysis.totalCalories} kcal</span>
                </div>
              </div>

              <div className="space-y-2">
                {analysis.foods.map((food: FoodItem, i: number) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div>
                      <span className="font-medium text-foreground">{food.name}</span>
                      <span className="ml-2 text-muted">{food.portion}</span>
                    </div>
                    <span className="text-orange-400 font-medium">{food.calories} kcal</span>
                  </div>
                ))}
              </div>

              {analysis.notes && (
                <p className="text-xs text-muted border-t border-border/40 pt-2">{analysis.notes}</p>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleDiscard}
              className="flex-1 rounded-xl border border-border/60 bg-card/40 py-3 text-sm font-medium text-muted transition-colors hover:text-foreground"
            >
              Huỷ
            </button>
            {analysis && (
              <button
                onClick={handleSave}
                className="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                Lưu vào nhật ký
              </button>
            )}
            {!analysis && !analyzing && (
              <button
                onClick={() => fileRef.current?.click()}
                className="flex-1 rounded-xl border border-border/60 bg-card/40 py-3 text-sm font-medium text-foreground flex items-center justify-center gap-2 transition-colors hover:bg-card/60"
              >
                <ImagePlus className="h-4 w-4" />
                Chọn ảnh khác
              </button>
            )}
          </div>
        </div>
      )}

      {/* Lịch sử */}
      {groups.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">Lịch sử</h2>
          {groups.map(([dateLabel, dayEntries]) => {
            const dayTotal = dayEntries.reduce((s, e) => s + e.totalCalories, 0);
            const expanded = expandedDates.has(dateLabel);
            return (
              <div key={dateLabel} className="rounded-2xl border border-border/60 bg-card/40 overflow-hidden">
                <button
                  onClick={() => toggleDate(dateLabel)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground capitalize">{dateLabel}</p>
                    <p className="text-xs text-muted">{dayEntries.length} bữa</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold",
                      dayTotal >= 2000 ? "bg-red-500/10 text-red-400" :
                      dayTotal >= 1500 ? "bg-orange-500/10 text-orange-400" :
                      "bg-green-500/10 text-green-400"
                    )}>
                      <Flame className="h-3 w-3" />
                      {dayTotal} kcal
                    </div>
                    {expanded ? <ChevronUp className="h-4 w-4 text-muted" /> : <ChevronDown className="h-4 w-4 text-muted" />}
                  </div>
                </button>

                {expanded && (
                  <div className="border-t border-border/40 divide-y divide-border/30">
                    {dayEntries.map((entry) => {
                      const foods = entry.foods as FoodItem[];
                      return (
                        <div key={entry.id} className="px-4 py-3 flex gap-3">
                          {entry.imageThumbnail && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={entry.imageThumbnail}
                              alt=""
                              className="h-14 w-14 flex-shrink-0 rounded-xl object-cover"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-muted mb-1">
                                  {new Date(entry.date).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                                </p>
                                <div className="space-y-0.5">
                                  {foods.slice(0, 3).map((f, i) => (
                                    <p key={i} className="text-xs text-foreground truncate">
                                      {f.name}
                                      <span className="text-muted ml-1">· {f.calories} kcal</span>
                                    </p>
                                  ))}
                                  {foods.length > 3 && (
                                    <p className="text-xs text-muted">+{foods.length - 3} món khác</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="text-sm font-bold text-orange-400">{entry.totalCalories} kcal</span>
                                <button
                                  onClick={() => handleDelete(entry.id)}
                                  className="rounded-lg p-1.5 text-muted transition-colors hover:bg-red-500/10 hover:text-red-400"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                            {entry.notes && (
                              <p className="mt-1 text-xs text-muted">{entry.notes}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {groups.length === 0 && !preview && (
        <p className="text-center text-sm text-muted py-6">
          Chưa có dữ liệu. Chụp ảnh thức ăn để bắt đầu!
        </p>
      )}
    </div>
  );
}
