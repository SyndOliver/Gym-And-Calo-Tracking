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
  const targetEndRef = useRef<number>(0); // timestamp khi timer hết giờ
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setActiveWorkoutIdState(stored);
  }, []);

  const setActiveWorkoutId = useCallback((id: string | null) => {
    setActiveWorkoutIdState(id);
    if (id) localStorage.setItem(STORAGE_KEY, id);
    else localStorage.removeItem(STORAGE_KEY);
  }, []);

  // ==================== Wake Lock API ====================
  // Giữ màn hình sáng khi đang có buổi tập hoạt động hoặc rest timer đang chạy
  const requestWakeLock = useCallback(async () => {
    try {
      if (
        "wakeLock" in navigator &&
        document.visibilityState === "visible" &&
        !wakeLockRef.current
      ) {
        wakeLockRef.current = await navigator.wakeLock.request("screen");
        wakeLockRef.current.addEventListener("release", () => {
          wakeLockRef.current = null;
        });
      }
    } catch {
      // Wake Lock API không được hỗ trợ hoặc bị từ chối
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    try {
      if (wakeLockRef.current) {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    } catch {
      // ignore
    }
  }, []);

  // Quản lý Wake Lock dựa trên trạng thái buổi tập + rest timer
  useEffect(() => {
    const shouldLock = !!activeWorkoutId || rest.isRunning;
    if (shouldLock) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }

    // Tự động yêu cầu lại Wake Lock khi tab trở lại visible
    // (Wake Lock bị release khi tab mất focus / minimize)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && shouldLock) {
        requestWakeLock();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [activeWorkoutId, rest.isRunning, requestWakeLock, releaseWakeLock]);

  // Cleanup Wake Lock khi component unmount
  useEffect(() => {
    return () => {
      releaseWakeLock();
    };
  }, [releaseWakeLock]);

  // ==================== Sound & Vibration ====================
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
      // 3 tiếng beep rõ ràng hơn để nhận biết khi đeo tai nghe
      playTone(880, 0, 0.18);
      playTone(1100, 0.22, 0.18);
      playTone(1320, 0.44, 0.25);
    } catch {
      // ignore audio errors (e.g. autoplay restrictions)
    }
    // Rung mạnh hơn: 3 lần rung dài để nhận biết khi điện thoại trong túi
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate?.([300, 150, 300, 150, 400]);
      } catch {
        // ignore
      }
    }
  }, []);

  // ==================== Timer Logic (target-based) ====================
  // Sử dụng target timestamp thay vì đếm ngược mỗi giây
  // Điều này giúp timer chính xác hơn khi browser throttle setInterval
  // (ví dụ: khi tab ở background, màn hình tắt trên mobile...)
  useEffect(() => {
    if (!rest.isRunning) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    beepedRef.current = false;

    // Lưu timestamp mục tiêu khi bắt đầu đếm
    if (targetEndRef.current === 0) {
      targetEndRef.current = Date.now() + rest.remaining * 1000;
    }

    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const msLeft = Math.max(0, targetEndRef.current - now);
      const secondsLeft = Math.ceil(msLeft / 1000);

      setRest((r) => {
        if (!r.isRunning) return r;
        if (secondsLeft <= 0 && !beepedRef.current) {
          beepedRef.current = true;
          targetEndRef.current = 0;
          playBeep();
          return { ...r, remaining: 0, isRunning: false };
        }
        return { ...r, remaining: secondsLeft };
      });
    }, 250); // Kiểm tra mỗi 250ms thay vì 1000ms để chính xác hơn

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [rest.isRunning, playBeep]);

  const startRest = useCallback((seconds: number) => {
    targetEndRef.current = Date.now() + seconds * 1000;
    setRest({ isRunning: true, remaining: seconds, initial: seconds });
  }, []);

  const stopRest = useCallback(() => {
    targetEndRef.current = 0;
    setRest({ isRunning: false, remaining: 0, initial: 0 });
  }, []);

  const addRest = useCallback((delta: number) => {
    setRest((r) => {
      const newRemaining = Math.max(0, r.remaining + delta);
      // Cập nhật target timestamp khi thêm/bớt thời gian
      targetEndRef.current = Date.now() + newRemaining * 1000;
      return {
        ...r,
        remaining: newRemaining,
        initial: Math.max(r.initial, newRemaining),
        isRunning: newRemaining > 0,
      };
    });
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
