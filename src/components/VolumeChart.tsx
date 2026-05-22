"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Datum = {
  date: string;
  volume: number;
  label: string;
};

export default function VolumeChart({ data }: { data: Datum[] }) {
  const hasAny = data.some((d) => d.volume > 0);
  if (!hasAny) {
    return (
      <div className="text-center py-8 text-sm text-muted">
        Chưa có dữ liệu để hiển thị
      </div>
    );
  }
  return (
    <div className="h-56 -mx-2">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="volumeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(99 102 241)" stopOpacity={0.4} />
              <stop offset="100%" stopColor="rgb(99 102 241)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgb(38 43 60)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "rgb(148 156 178)", fontSize: 10 }}
            stroke="rgb(38 43 60)"
            tickLine={false}
            interval={Math.max(0, Math.floor(data.length / 8))}
          />
          <YAxis
            tick={{ fill: "rgb(148 156 178)", fontSize: 10 }}
            stroke="rgb(38 43 60)"
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <Tooltip
            contentStyle={{
              background: "rgb(17 20 31)",
              border: "1px solid rgb(38 43 60)",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: "rgb(148 156 178)" }}
            formatter={(value: number) => [`${value.toLocaleString("vi-VN")} kg`, "Volume"]}
          />
          <Area
            type="monotone"
            dataKey="volume"
            stroke="rgb(99 102 241)"
            strokeWidth={2}
            fill="url(#volumeGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
