"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Dumbbell, BookOpen, Calendar, BarChart3, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Trang chủ", icon: Home },
  { href: "/workout", label: "Tập", icon: Dumbbell },
  { href: "/exercises", label: "Bài tập", icon: BookOpen },
  { href: "/calendar", label: "Lịch", icon: Calendar },
  { href: "/stats", label: "Thống kê", icon: BarChart3 },
  { href: "/calories", label: "Calories", icon: Flame },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 pb-safe"
      style={{
        background:
          "linear-gradient(to top, rgb(10 13 24 / 0.95) 0%, rgb(10 13 24 / 0.85) 60%, rgb(10 13 24 / 0) 100%)",
      }}
    >
      <div className="mx-auto w-full max-w-2xl px-3 sm:px-4">
        <div className="glass mx-auto flex items-stretch justify-around rounded-2xl border border-border/80 px-1 py-1 shadow-2xl shadow-black/40">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "tappable group relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 py-2 text-[10px] font-medium transition-colors",
                  isActive
                    ? "text-primary-foreground"
                    : "text-muted hover:text-foreground"
                )}
              >
                {isActive && (
                  <span
                    aria-hidden
                    className="absolute inset-0 -z-0 rounded-xl bg-gradient-to-br from-primary to-accent opacity-90 shadow-lg shadow-primary/30 animate-scale-in"
                  />
                )}
                <Icon
                  className={cn(
                    "relative z-10 h-5 w-5 transition-transform",
                    isActive ? "scale-110" : "group-hover:scale-105"
                  )}
                  strokeWidth={isActive ? 2.4 : 2}
                />
                {isActive && (
                  <span className="relative z-10 leading-tight text-[10px]">{item.label}</span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
