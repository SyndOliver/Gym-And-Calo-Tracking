import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatLongDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatDateTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRelativeDay(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Hôm nay";
  if (diffDays === 1) return "Hôm qua";
  if (diffDays < 7) return `${diffDays} ngày trước`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} tuần trước`;
  return formatDate(d);
}

export const MUSCLE_GROUPS = {
  chest: { label: "Ngực", emoji: "🫁", color: "bg-red-500/15 text-red-400 border-red-500/30" },
  back: { label: "Lưng", emoji: "🦅", color: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  legs: { label: "Chân", emoji: "🦵", color: "bg-purple-500/15 text-purple-400 border-purple-500/30" },
  shoulders: { label: "Vai", emoji: "🤸", color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30" },
  arms: { label: "Tay", emoji: "💪", color: "bg-orange-500/15 text-orange-400 border-orange-500/30" },
  core: { label: "Bụng", emoji: "🎯", color: "bg-green-500/15 text-green-400 border-green-500/30" },
  cardio: { label: "Cardio", emoji: "❤️", color: "bg-pink-500/15 text-pink-400 border-pink-500/30" },
  fullbody: { label: "Toàn thân", emoji: "⚡", color: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30" },
} as const;

export type MuscleGroupKey = keyof typeof MUSCLE_GROUPS;

export function getMuscleGroupInfo(key: string) {
  return (
    MUSCLE_GROUPS[key as MuscleGroupKey] ?? {
      label: key,
      emoji: "💪",
      color: "bg-gray-500/15 text-gray-400 border-gray-500/30",
    }
  );
}

export const EQUIPMENT_LABELS: Record<string, string> = {
  barbell: "Tạ đòn",
  dumbbell: "Tạ đơn",
  machine: "Máy",
  cable: "Cáp",
  bodyweight: "Tự thân",
  kettlebell: "Tạ ấm",
  band: "Dây kháng lực",
};

export function calculateVolume(reps: number | null, weight: number | null): number {
  if (!reps || !weight) return 0;
  return reps * weight;
}

export function calculate1RM(weight: number, reps: number): number {
  // Epley formula
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
}
