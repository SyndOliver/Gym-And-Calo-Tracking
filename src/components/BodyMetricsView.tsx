"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, X, Scale, TrendingDown, TrendingUp, Minus, Sparkles, Loader2, Dumbbell, BedDouble } from "lucide-react";
import { addBodyMetric, deleteBodyMetric, suggestNutritionGoal } from "@/app/actions/body";
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
  height: number | null;
  age: number | null;
  gender: string | null;
  bodyFat: number | null;
  muscle: number | null;
  chest: number | null;
  waist: number | null;
  hip: number | null;
  arm: number | null;
  thigh: number | null;
  waterPercent: number | null;
  visceralFat: number | null;
  boneMineralKg: number | null;
  proteinKg: number | null;
  skeletalMuscleKg: number | null;
  notes: string | null;
};

type NutritionPlan = {
  calories: number; protein: number; carbs: number; fat: number; explanation: string;
};

function calcBMI(weight: number | null, height: number | null): number | null {
  if (!weight || !height) return null;
  return Math.round((weight / Math.pow(height / 100, 2)) * 10) / 10;
}

function calcLeanMass(weight: number | null, bodyFat: number | null): number | null {
  if (!weight || bodyFat == null) return null;
  return Math.round(weight * (1 - bodyFat / 100) * 10) / 10;
}

function calcBMR(
  weight: number | null,
  height: number | null,
  age: number | null,
  gender: string | null
): number | null {
  if (!weight || !height || !age || !gender) return null;
  const base = 10 * weight + 6.25 * height - 5 * age;
  return Math.round(gender === "female" ? base - 161 : base + 5);
}

export default function BodyMetricsView({ metrics }: { metrics: Metric[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [showAdd, setShowAdd] = useState(false);
  const [aiPlan, setAiPlan] = useState<{ workoutDay: NutritionPlan; restDay: NutritionPlan } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const latest = metrics[0];
  const previous = metrics[1];
  const weightTrend =
    latest?.weight && previous?.weight ? latest.weight - previous.weight : null;

  const bmi = latest ? calcBMI(latest.weight, latest.height) : null;
  const leanMass = latest ? calcLeanMass(latest.weight, latest.bodyFat) : null;
  const bmr = latest ? calcBMR(latest.weight, latest.height, latest.age, latest.gender) : null;

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

  async function handleAISuggest() {
    if (!latest) return;
    setIsGenerating(true);
    setAiError(null);
    setAiPlan(null);
    const res = await suggestNutritionGoal(latest.id);
    if (res.ok) {
      setAiPlan(res.data);
    } else {
      setAiError(res.error);
    }
    setIsGenerating(false);
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
        <>
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <CurrentStat
              icon={<Scale className="h-4 w-4" />}
              label="Cân nặng"
              value={latest.weight ? `${latest.weight} kg` : "—"}
              trend={weightTrend}
            />
            <CurrentStat label="Body Fat" value={latest.bodyFat ? `${latest.bodyFat}%` : "—"} />
            <CurrentStat label="BMI" value={bmi ? String(bmi) : "—"} />
            <CurrentStat label="Lean Mass" value={leanMass ? `${leanMass} kg` : "—"} />
            <CurrentStat label="BMR" value={bmr ? `${bmr} kcal` : "—"} />
            <CurrentStat label="Cơ xương" value={latest.skeletalMuscleKg ? `${latest.skeletalMuscleKg} kg` : "—"} />
            <CurrentStat label="Mỡ nội tạng" value={latest.visceralFat != null ? String(latest.visceralFat) : "—"} />
            <CurrentStat label="Cập nhật" value={formatDate(latest.date)} />
          </section>

          {/* AI Suggestion */}
          <section className="card space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold inline-flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Gợi ý dinh dưỡng AI
                </h2>
                <p className="text-xs text-muted mt-0.5">Tăng cơ – giảm mỡ dựa trên chỉ số cơ thể mới nhất</p>
              </div>
              <button
                type="button"
                className="btn btn-primary !py-2"
                onClick={handleAISuggest}
                disabled={isGenerating}
              >
                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {isGenerating ? "Đang phân tích..." : "Phân tích"}
              </button>
            </div>
            {aiError && (
              <div className="rounded-lg border border-danger/50 bg-danger/10 p-2 text-sm text-danger">{aiError}</div>
            )}
            {aiPlan && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <NutritionPlanCard
                  icon={<Dumbbell className="h-4 w-4 text-primary" />}
                  title="Ngày tập luyện"
                  plan={aiPlan.workoutDay}
                />
                <NutritionPlanCard
                  icon={<BedDouble className="h-4 w-4 text-success" />}
                  title="Ngày nghỉ"
                  plan={aiPlan.restDay}
                />
              </div>
            )}
          </section>
        </>
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
              {(() => {
                const bmiVal = calcBMI(m.weight, m.height);
                return bmiVal ? <DataChip label="BMI" value={String(bmiVal)} /> : null;
              })()}
              {m.bodyFat !== null && <DataChip label="Mỡ" value={`${m.bodyFat}%`} />}
              {(() => {
                const lm = calcLeanMass(m.weight, m.bodyFat);
                return lm ? <DataChip label="Lean" value={`${lm} kg`} /> : null;
              })()}
              {m.muscle !== null && <DataChip label="Cơ" value={`${m.muscle} kg`} />}
              {m.skeletalMuscleKg !== null && <DataChip label="SMM" value={`${m.skeletalMuscleKg} kg`} />}
              {m.waterPercent !== null && <DataChip label="Nước" value={`${m.waterPercent}%`} />}
              {m.visceralFat !== null && <DataChip label="Mỡ NT" value={String(m.visceralFat)} />}
              {m.boneMineralKg !== null && <DataChip label="Xương" value={`${m.boneMineralKg} kg`} />}
              {m.proteinKg !== null && <DataChip label="Protein" value={`${m.proteinKg} kg`} />}
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

function NutritionPlanCard({
  icon, title, plan,
}: {
  icon: React.ReactNode;
  title: string;
  plan: { calories: number; protein: number; carbs: number; fat: number; explanation: string };
}) {
  return (
    <div className="rounded-xl border border-border bg-surface/40 p-3 space-y-2">
      <div className="flex items-center gap-2 font-semibold text-sm">{icon}{title}</div>
      <div className="grid grid-cols-2 gap-1.5 text-xs">
        <DataChip label="Calories" value={`${plan.calories} kcal`} />
        <DataChip label="Protein" value={`${plan.protein}g`} />
        <DataChip label="Carbs" value={`${plan.carbs}g`} />
        <DataChip label="Fat" value={`${plan.fat}g`} />
      </div>
      <p className="text-xs text-muted leading-relaxed">{plan.explanation}</p>
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
  const [height, setHeight] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [muscle, setMuscle] = useState("");
  const [chest, setChest] = useState("");
  const [waist, setWaist] = useState("");
  const [hip, setHip] = useState("");
  const [arm, setArm] = useState("");
  const [thigh, setThigh] = useState("");
  const [waterPercent, setWaterPercent] = useState("");
  const [visceralFat, setVisceralFat] = useState("");
  const [boneMineralKg, setBoneMineralKg] = useState("");
  const [proteinKg, setProteinKg] = useState("");
  const [skeletalMuscleKg, setSkeletalMuscleKg] = useState("");
  const [notes, setNotes] = useState("");

  function n(v: string): number | null {
    if (v === "") return null;
    const x = Number(v);
    return Number.isFinite(x) ? x : null;
  }

  // Live auto-calc preview
  const bmiPreview = calcBMI(n(weight), n(height));
  const leanPreview = calcLeanMass(n(weight), n(bodyFat));
  const bmrPreview = calcBMR(n(weight), n(height), n(age), gender || null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      await addBodyMetric({
        date: new Date(date),
        weight: n(weight),
        height: n(height),
        age: age ? Math.round(Number(age)) : null,
        gender: gender || null,
        bodyFat: n(bodyFat),
        muscle: n(muscle),
        chest: n(chest),
        waist: n(waist),
        hip: n(hip),
        arm: n(arm),
        thigh: n(thigh),
        waterPercent: n(waterPercent),
        visceralFat: n(visceralFat),
        boneMineralKg: n(boneMineralKg),
        proteinKg: n(proteinKg),
        skeletalMuscleKg: n(skeletalMuscleKg),
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
        className="w-full max-w-lg max-h-[90dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-border bg-card p-4 space-y-3 animate-slide-up shadow-2xl shadow-black/50"
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

        <p className="text-xs font-medium text-muted uppercase tracking-wider pt-1">Thông tin cơ bản</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Field label="Cân nặng (kg)" v={weight} setV={setWeight} step="0.1" />
          <Field label="Chiều cao (cm)" v={height} setV={setHeight} step="0.5" />
          <Field label="Tuổi" v={age} setV={setAge} step="1" />
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider text-muted">Giới tính</label>
            <select value={gender} onChange={(e) => setGender(e.target.value)} className="!py-1.5 !px-2">
              <option value="">—</option>
              <option value="male">Nam</option>
              <option value="female">Nữ</option>
            </select>
          </div>
        </div>

        {/* Live calculated preview */}
        {(bmiPreview || leanPreview || bmrPreview) && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-2 grid grid-cols-3 gap-2 text-xs text-center">
            {bmiPreview && (
              <div><div className="text-muted">BMI</div><div className="font-bold">{bmiPreview}</div></div>
            )}
            {leanPreview && (
              <div><div className="text-muted">Lean Mass</div><div className="font-bold">{leanPreview} kg</div></div>
            )}
            {bmrPreview && (
              <div><div className="text-muted">BMR</div><div className="font-bold">{bmrPreview} kcal</div></div>
            )}
          </div>
        )}

        <p className="text-xs font-medium text-muted uppercase tracking-wider pt-1">Thành phần cơ thể</p>
        <div className="grid grid-cols-3 gap-2">
          <Field label="Mỡ (%)" v={bodyFat} setV={setBodyFat} step="0.1" />
          <Field label="Cơ (kg)" v={muscle} setV={setMuscle} step="0.1" />
          <Field label="Cơ xương (kg)" v={skeletalMuscleKg} setV={setSkeletalMuscleKg} step="0.1" />
          <Field label="Nước (%)" v={waterPercent} setV={setWaterPercent} step="0.1" />
          <Field label="Mỡ nội tạng" v={visceralFat} setV={setVisceralFat} step="0.1" />
          <Field label="Xương (kg)" v={boneMineralKg} setV={setBoneMineralKg} step="0.01" />
          <Field label="Protein (kg)" v={proteinKg} setV={setProteinKg} step="0.1" />
        </div>

        <p className="text-xs font-medium text-muted uppercase tracking-wider pt-1">Số đo (cm) – tuỳ chọn</p>
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
