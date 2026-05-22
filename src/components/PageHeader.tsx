import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type Props = {
  title: string;
  subtitle?: string;
  back?: { href: string; label?: string };
  action?: React.ReactNode;
  emoji?: string;
};

export default function PageHeader({ title, subtitle, back, action, emoji }: Props) {
  return (
    <header className="space-y-2 animate-fade-in">
      {back && (
        <Link
          href={back.href}
          className="tappable inline-flex items-center gap-1.5 -ml-1 rounded-md px-1 py-0.5 text-xs font-medium text-muted hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> {back.label ?? "Quay lại"}
        </Link>
      )}
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight leading-tight sm:text-3xl">
            {emoji && <span className="text-2xl sm:text-3xl">{emoji}</span>}
            <span className="truncate">{title}</span>
          </h1>
          {subtitle && (
            <p className="mt-0.5 text-sm text-muted truncate">{subtitle}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </header>
  );
}
