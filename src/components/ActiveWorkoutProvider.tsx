"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

type RestTimerState = {
  isRunning: boolean;
  remaining: number;
  initial: number;
};

type Ctx = {
  activeWorkoutId: string | null;
  setActiveWorkoutId: (id: string | null) => void;
  rest: RestTimerState;
  startRest: (seconds: number) => void;
  stopRest: () => void;
  addRest: (delta: number) => void;
};

const ActiveWorkoutContext = createContext<Ctx | null>(null);

const STORAGE_KEY = "gym-active-workout-id";

export function ActiveWorkoutProvider({ children }: { children: React.ReactNode }) {
  const [activeWorkoutId, setActiveWorkoutIdState] = useState<string | null>(null);
  const [rest, setRest] = useState<RestTimerState>({ isRunning: false, remaining: 0, initial: 0 });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const beepedRef = useRef(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setActiveWorkoutIdState(stored);
  }, []);

  const setActiveWorkoutId = useCallback((id: string | null) => {
    setActiveWorkoutIdState(id);
    if (id) localStorage.setItem(STORAGE_KEY, id);
    else localStorage.removeItem(STORAGE_KEY);
  }, []);

  const playBeep = useCallback(() => {
    try {
      const AudioCtor =
        (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtor) return;
      const ctx = new AudioCtor();
      const playTone = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, ctx.currentTime + start);
        gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + start + 0.02);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + start + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + duration);
      };
      playTone(880, 0, 0.18);
      playTone(1320, 0.22, 0.25);
    } catch {
      // ignore audio errors (e.g. autoplay restrictions)
    }
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate?.([200, 100, 200]);
      } catch {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    if (!rest.isRunning) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    beepedRef.current = false;
    intervalRef.current = setInterval(() => {
      setRest((r) => {
        if (!r.isRunning) return r;
        const next = Math.max(0, r.remaining - 1);
        if (next === 0 && !beepedRef.current) {
          beepedRef.current = true;
          playBeep();
          return { ...r, remaining: 0, isRunning: false };
        }
        return { ...r, remaining: next };
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [rest.isRunning, playBeep]);

  const startRest = useCallback((seconds: number) => {
    setRest({ isRunning: true, remaining: seconds, initial: seconds });
  }, []);

  const stopRest = useCallback(() => {
    setRest({ isRunning: false, remaining: 0, initial: 0 });
  }, []);

  const addRest = useCallback((delta: number) => {
    setRest((r) => ({
      ...r,
      remaining: Math.max(0, r.remaining + delta),
      initial: Math.max(r.initial, r.remaining + delta),
      isRunning: r.remaining + delta > 0,
    }));
  }, []);

  return (
    <ActiveWorkoutContext.Provider
      value={{ activeWorkoutId, setActiveWorkoutId, rest, startRest, stopRest, addRest }}
    >
      {children}
    </ActiveWorkoutContext.Provider>
  );
}

export function useActiveWorkout() {
  const ctx = useContext(ActiveWorkoutContext);
  if (!ctx) throw new Error("useActiveWorkout must be used within ActiveWorkoutProvider");
  return ctx;
}
