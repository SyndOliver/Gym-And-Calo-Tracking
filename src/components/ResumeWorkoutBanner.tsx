"use client";

import Link from "next/link";
import { Play } from "lucide-react";
import { useEffect } from "react";
import { useActiveWorkout } from "./ActiveWorkoutProvider";

type Workout = {
  id: string;
  name: string;
  startedAt: Date;
};

export default function ResumeWorkoutBanner({ workout }: { workout: Workout }) {
  const { setActiveWorkoutId } = useActiveWorkout();
  useEffect(() => {
    setActiveWorkoutId(workout.id);
  }, [workout.id, setActiveWorkoutId]);

  return (
    <Link
      href={`/workout/${workout.id}`}
      className="tappable card card-glow relative flex items-center gap-3 overflow-hidden border-primary/40 hover:border-primary/60 animate-slide-up"
    >
      <span className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
      <span className="relative flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-white shadow-lg shadow-primary/30 shrink-0">
        <span className="absolute inset-0 animate-pulse-ring rounded-full border-2 border-primary" />
        <Play className="h-4 w-4 fill-current ml-0.5" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
          Buổi tập đang diễn ra
        </p>
        <p className="font-bold truncate">{workout.name}</p>
      </div>
      <span className="btn btn-primary !py-2 !px-3 text-sm shrink-0">Tiếp tục</span>
    </Link>
  );
}
