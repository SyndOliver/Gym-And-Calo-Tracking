"use client";

import { useState } from "react";
import { Bot, Lightbulb, AlertTriangle, Sparkles, RefreshCw } from "lucide-react";
import { analyzeExerciseProgress } from "@/app/actions/exercise";

type AnalysisResult = {
  summary: string;
  suggestions: string[];
  warnings: string[];
};

export default function ExerciseProgressAI({ exerciseId }: { exerciseId: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyze() {
    setLoading(true);
    setError(null);
    try {
      const data = await analyzeExerciseProgress(exerciseId);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đã xảy ra lỗi khi phân tích");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Bot className="h-4 w-4 text-accent" />
          Phân tích AI
        </h2>
        {result && (
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="btn btn-ghost !py-1 !px-2 !text-xs !min-h-0 !gap-1 text-muted hover:text-foreground"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            Phân tích lại
          </button>
        )}
      </div>

      {/* Analyze Button */}
      {!result && !loading && (
        <button
          onClick={handleAnalyze}
          className="w-full relative overflow-hidden rounded-xl border border-accent/30 bg-gradient-to-r from-primary/10 via-accent/10 to-accent-2/10 p-4 text-left transition-all hover:border-accent/50 hover:shadow-lg hover:shadow-accent/10 group"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-accent/5 to-accent-2/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/15 border border-accent/25 text-accent shrink-0">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <p className="font-semibold text-sm">Phân tích tiến độ với AI</p>
              <p className="text-xs text-muted mt-0.5">
                Nhận nhận xét xu hướng, gợi ý progressive overload
              </p>
            </div>
          </div>
        </button>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="card space-y-3 animate-pulse">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded bg-accent/20 skeleton" />
            <div className="h-4 w-48 rounded skeleton" />
          </div>
          <div className="space-y-2">
            <div className="h-3 w-full rounded skeleton" />
            <div className="h-3 w-4/5 rounded skeleton" />
          </div>
          <div className="border-t border-border pt-3 space-y-2">
            <div className="h-3 w-32 rounded skeleton" />
            <div className="h-3 w-full rounded skeleton" />
            <div className="h-3 w-3/4 rounded skeleton" />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="card border-danger/30 bg-danger/5">
          <p className="text-sm text-danger">{error}</p>
          <button onClick={handleAnalyze} className="btn btn-secondary mt-2 !text-xs !py-1.5">
            Thử lại
          </button>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="card space-y-4 border-accent/20 bg-gradient-to-br from-card/90 via-card/70 to-accent/5 animate-fade-in">
          {/* Summary */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <span className="text-base">📊</span> Tổng quan
            </div>
            <p className="text-sm text-foreground/90 leading-relaxed">{result.summary}</p>
          </div>

          {/* Suggestions */}
          {result.suggestions.length > 0 && (
            <div className="space-y-2 border-t border-border/50 pt-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Lightbulb className="h-4 w-4 text-yellow-400" /> Gợi ý
              </div>
              <ul className="space-y-1.5">
                {result.suggestions.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground/85">
                    <span className="text-primary mt-0.5 shrink-0">•</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Warnings */}
          {result.warnings.length > 0 && (
            <div className="space-y-2 border-t border-border/50 pt-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <AlertTriangle className="h-4 w-4 text-warning" /> Lưu ý
              </div>
              <ul className="space-y-1.5">
                {result.warnings.map((w, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-warning/90">
                    <span className="mt-0.5 shrink-0">⚠️</span>
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
