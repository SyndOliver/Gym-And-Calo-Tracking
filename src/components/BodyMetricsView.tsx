"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, X, Scale, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { addBodyMetric, deleteBodyMetric } from "@/app/actions/body";
import { formatDate } from "@/lib/utils";
import PageHeader from "./PageHeader";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

type Metric = {
  id: string;
  date: Date;
  weight: number | null;
  bodyFat: number | null;
  muscle: number | null;
  chest: number | null;
  waist: number | null;
  hip: number | null;
  arm: number | null;
  thigh: number | null;
  notes: string | null;
};

export default function BodyMetricsView({ metrics }: { metrics: Metric[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [showAdd, setShowAdd] = useState(false);

  const latest = metrics[0];
  const previous = metrics[1];
  const weightTrend =
    latest?.weight && previous?.weight ? latest.weight - previous.weight : null;

  const chartData = [...metrics]
    .reverse()
    .filter((m) => m.weight !== null)
    .map((m) => ({
      date: new Date(m.date).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }),
      weight: m.weight,
      bodyFat: m.bodyFat,
    }));

  function handleDelete(id: string) {
    if (!confirm("Xoá bản ghi này?")) return;
    startTransition(async () => {
      await deleteBodyMetric(id);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Chỉ số cơ thể"
        subtitle={`${metrics.length} bản ghi`}
        emoji="⚖️"
        back={{ href: "/stats", label: "Thống kê" }}
        action={
          <button onClick={() => setShowAdd(true)} className="btn btn-primary !py-2">
            <Plus className="h-4 w-4" /> Thêm
          </button>
        }
      />

      {latest && (
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <CurrentStat
            icon={<Scale className="h-4 w-4" />}
            label="Cân nặng"
            value={latest.weight ? `${latest.weight} kg` : "—"}
            trend={weightTrend}
          />
          <CurrentStat label="Body Fat" value={latest.bodyFat ? `${latest.bodyFat}%` : "—"} />
          <CurrentStat label="Cơ" value={latest.muscle ? `${latest.muscle} kg` : "—"} />
          <CurrentStat label="Cập nhật" value={formatDate(latest.date)} />
        </section>
      )}

      {chartData.length >= 2 && (
        <section className="card space-y-3">
          <h2 className="text-base font-semibold">Tiến triển cân nặng</h2>
          <div className="h-56 -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="rgb(38 43 60)" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "rgb(148 156 178)", fontSize: 10 }}
                  stroke="rgb(38 43 60)"
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "rgb(148 156 178)", fontSize: 10 }}
                  stroke="rgb(38 43 60)"
                  tickLine={false}
                  axisLine={false}
                  width={36}
                  domain={["dataMin - 1", "dataMax + 1"]}
                />
                <Tooltip
                  contentStyle={{
                    background: "rgb(17 20 31)",
                    border: "1px solid rgb(38 43 60)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "rgb(148 156 178)" }}
                />
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke="rgb(99 102 241)"
                  strokeWidth={2.5}
                  dot={{ fill: "rgb(99 102 241)", r: 3 }}
                  name="Cân nặng (kg)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-base font-semibold">Lịch sử</h2>
        {metrics.length === 0 && (
          <div className="card text-center py-8 text-sm text-muted">
            Thêm bản ghi đầu tiên để theo dõi tiến độ
          </div>
        )}
        {metrics.map((m) => (
          <div key={m.id} className="card !p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm">{formatDate(m.date)}</span>
              <button
                onClick={() => handleDelete(m.id)}
                className="btn btn-ghost btn-icon !text-muted hover:!text-danger !h-7 !w-7"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {m.weight !== null && <DataChip label="Cân" value={`${m.weight} kg`} />}
              {m.bodyFat !== null && <DataChip label="Mỡ" value={`${m.bodyFat}%`} />}
              {m.muscle !== null && <DataChip label="Cơ" value={`${m.muscle} kg`} />}
              {m.chest !== null && <DataChip label="Ngực" value={`${m.chest} cm`} />}
              {m.waist !== null && <DataChip label="Eo" value={`${m.waist} cm`} />}
              {m.hip !== null && <DataChip label="Mông" value={`${m.hip} cm`} />}
              {m.arm !== null && <DataChip label="Tay" value={`${m.arm} cm`} />}
              {m.thigh !== null && <DataChip label="Đùi" value={`${m.thigh} cm`} />}
            </div>
            {m.notes && <p className="text-xs text-muted italic">"{m.notes}"</p>}
          </div>
        ))}
      </section>

      {showAdd && <AddMetricModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}

function CurrentStat({
  icon,
  label,
  value,
  trend,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  trend?: number | null;
}) {
  return (
    <div className="card !p-3.5">
      <div className="mb-1 inline-flex items-center gap-1.5 text-xs text-muted">
        {icon}
        <span>{label}</span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-lg font-bold">{value}</span>
        {trend !== null && trend !== undefined && trend !== 0 && (
          <span
            className={`inline-flex items-center text-[11px] font-medium ${
              trend > 0 ? "text-warning" : "text-success"
            }`}
          >
            {trend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(trend).toFixed(1)}
          </span>
        )}
        {trend === 0 && <Minus className="h-3 w-3 text-muted" />}
      </div>
    </div>
  );
}

function DataChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-surface/60 px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wider text-muted">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}

function AddMetricModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [weight, setWeight] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [muscle, setMuscle] = useState("");
  const [chest, setChest] = useState("");
  const [waist, setWaist] = useState("");
  const [hip, setHip] = useState("");
  const [arm, setArm] = useState("");
  const [thigh, setThigh] = useState("");
  const [notes, setNotes] = useState("");

  function n(v: string): number | null {
    if (v === "") return null;
    const x = Number(v);
    return Number.isFinite(x) ? x : null;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      await addBodyMetric({
        date: new Date(date),
        weight: n(weight),
        bodyFat: n(bodyFat),
        muscle: n(muscle),
        chest: n(chest),
        waist: n(waist),
        hip: n(hip),
        arm: n(arm),
        thigh: n(thigh),
        notes: notes.trim() || undefined,
      });
      router.refresh();
      onClose();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-md p-0 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-border bg-card p-4 space-y-3 animate-slide-up shadow-2xl shadow-black/50"
      >
        <div className="mx-auto -mt-2 mb-1 h-1 w-10 rounded-full bg-border sm:hidden" />
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base">Thêm chỉ số cơ thể</h3>
          <button type="button" onClick={onClose} className="btn btn-ghost btn-icon">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted">Ngày</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Field label="Cân nặng (kg)" v={weight} setV={setWeight} step="0.1" />
          <Field label="Mỡ (%)" v={bodyFat} setV={setBodyFat} step="0.1" />
          <Field label="Cơ (kg)" v={muscle} setV={setMuscle} step="0.1" />
        </div>

        <p className="text-xs text-muted pt-1">Số đo (cm) - tuỳ chọn</p>
        <div className="grid grid-cols-3 gap-2">
          <Field label="Ngực" v={chest} setV={setChest} step="0.5" />
          <Field label="Eo" v={waist} setV={setWaist} step="0.5" />
          <Field label="Mông" v={hip} setV={setHip} step="0.5" />
          <Field label="Tay" v={arm} setV={setArm} step="0.5" />
          <Field label="Đùi" v={thigh} setV={setThigh} step="0.5" />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted">Ghi chú</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="resize-none"
          />
        </div>

        <button type="submit" className="btn btn-primary w-full">
          <Plus className="h-4 w-4" /> Lưu bản ghi
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  v,
  setV,
  step,
}: {
  label: string;
  v: string;
  setV: (s: string) => void;
  step?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] uppercase tracking-wider text-muted">{label}</label>
      <input
        type="number"
        inputMode="decimal"
        step={step ?? "0.1"}
        value={v}
        onChange={(e) => setV(e.target.value)}
        placeholder="—"
        className="!py-1.5 !px-2 text-center"
      />
    </div>
  );
}
