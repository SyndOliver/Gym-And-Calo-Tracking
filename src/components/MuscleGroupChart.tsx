"use client";

import { useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type MuscleGroupData = {
  group: string;
  label: string;
  emoji: string;
  volume: number;
  sets: number;
  color: string;
};

const RADIAN = Math.PI / 180;

function renderCenterLabel({
  cx,
  cy,
  totalValue,
  mode,
}: {
  cx: number;
  cy: number;
  totalValue: number;
  mode: "volume" | "sets";
}) {
  return (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central">
      <tspan x={cx} dy="-0.6em" fontSize="20" fontWeight="bold" fill="#e2e8f0">
        {mode === "volume"
          ? totalValue >= 1000
            ? `${(totalValue / 1000).toFixed(1)}t`
            : `${Math.round(totalValue)}`
          : totalValue}
      </tspan>
      <tspan x={cx} dy="1.6em" fontSize="11" fill="#64748b">
        {mode === "volume" ? "kg volume" : "sets"}
      </tspan>
    </text>
  );
}

function CustomTooltip({
  active,
  payload,
  mode,
  total,
}: {
  active?: boolean;
  payload?: { payload: MuscleGroupData; value: number }[];
  mode: "volume" | "sets";
  total: number;
}) {
  if (!active || !payload || !payload[0]) return null;
  const d = payload[0].payload;
  const value = payload[0].value;
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div className="rounded-xl border border-border bg-card/95 backdrop-blur-lg px-3 py-2 shadow-xl text-sm">
      <div className="font-semibold flex items-center gap-1.5">
        <span>{d.emoji}</span> {d.label}
      </div>
      <div className="text-xs text-muted mt-0.5">
        {mode === "volume"
          ? `${value.toLocaleString("vi-VN")} kg`
          : `${value} sets`}
        {" · "}
        <span className="font-semibold text-foreground">{pct}%</span>
      </div>
    </div>
  );
}

export default function MuscleGroupChart({
  data,
}: {
  data: MuscleGroupData[];
}) {
  const [mode, setMode] = useState<"volume" | "sets">("volume");

  const chartData = data
    .map((d) => ({
      ...d,
      value: mode === "volume" ? d.volume : d.sets,
    }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);

  const total = chartData.reduce((sum, d) => sum + d.value, 0);

  if (chartData.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted">
        Chưa có dữ liệu trong 30 ngày qua. Hãy hoàn thành buổi tập đầu tiên!
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Toggle */}
      <div className="flex items-center gap-1 p-0.5 rounded-lg bg-surface/60 border border-border/50 w-fit">
        <button
          type="button"
          onClick={() => setMode("volume")}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
            mode === "volume"
              ? "bg-primary text-white shadow-sm"
              : "text-muted hover:text-foreground"
          }`}
        >
          Volume (kg)
        </button>
        <button
          type="button"
          onClick={() => setMode("sets")}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
            mode === "sets"
              ? "bg-primary text-white shadow-sm"
              : "text-muted hover:text-foreground"
          }`}
        >
          Số sets
        </button>
      </div>

      {/* Donut chart */}
      <div className="relative h-64 sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius="55%"
              outerRadius="85%"
              paddingAngle={2}
              dataKey="value"
              stroke="none"
              animationBegin={0}
              animationDuration={600}
            >
              {chartData.map((d) => (
                <Cell key={d.group} fill={d.color} />
              ))}
            </Pie>
            <Tooltip
              content={<CustomTooltip mode={mode} total={total} />}
            />
            {/* Center text rendered via SVG text */}
            <text x="50%" y="46%" textAnchor="middle" dominantBaseline="central">
              <tspan
                x="50%"
                dy="0"
                fontSize="22"
                fontWeight="bold"
                fill="#e2e8f0"
              >
                {mode === "volume"
                  ? total >= 1000
                    ? `${(total / 1000).toFixed(1)}t`
                    : `${Math.round(total)}`
                  : total}
              </tspan>
            </text>
            <text x="50%" y="56%" textAnchor="middle" dominantBaseline="central">
              <tspan x="50%" fontSize="11" fill="#64748b">
                {mode === "volume" ? "kg volume" : "sets"}
              </tspan>
            </text>
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {chartData.map((d) => {
          const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
          return (
            <div key={d.group} className="flex items-center gap-2 text-sm">
              <span
                className="h-3 w-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: d.color }}
              />
              <span className="flex-1 min-w-0 truncate">
                {d.emoji} {d.label}
              </span>
              <span className="text-xs text-muted tabular flex-shrink-0">
                {pct}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
