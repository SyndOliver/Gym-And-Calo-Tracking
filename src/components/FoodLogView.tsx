"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  ImagePlus,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  Utensils,
  X,
  Flame,
  Beef,
  Wheat,
  Droplets,
  Target,
  Dumbbell,
  BedDouble,
  ChevronDown,
  Droplet,
  GlassWater,
  Settings2,
  Minus,
  Heart,
  Star,
} from "lucide-react";
import { addFoodLog, analyzeFood, analyzeFoodByText, deleteFoodLog, saveNutritionGoal, logWater, saveNutritionGoalTemplate, addFavoriteMeal, deleteFavoriteMeal } from "@/app/actions/food";
import { suggestNutritionGoalFromLatest } from "@/app/actions/body";
import { cn, formatDateTime } from "@/lib/utils";

type FoodLog = {
  id: string;
  date: Date | string;
  name: string;
  servingDescription: string | null;
  calories: number | null;
  protein: number | null;
  fat: number | null;
  carbs: number | null;
  fiber: number | null;
  healthyScore?: number | null;
  mealType: string;
  notes: string | null;
};

type FoodDraft = {
  name: string;
  servingDescription: string;
  calories: string;
  protein: string;
  fat: string;
  carbs: string;
  fiber: string;
  healthyScore: string;
};

type IngredientDraft = {
  name: string;
  weightG: string;
  calories: string;
  protein: string;
  fat: string;
  carbs: string;
  baseWeightG?: number;
  baseCalories?: number;
  baseProtein?: number;
  baseFat?: number;
  baseCarbs?: number;
};

const EMPTY_INGREDIENT: IngredientDraft = {
  name: "",
  weightG: "",
  calories: "",
  protein: "",
  fat: "",
  carbs: "",
};

type GoalDraft = {
  calories: string;
  protein: string;
  fat: string;
  carbs: string;
  fiber: string;
};

type NutritionGoal = {
  calories: number | null;
  protein: number | null;
  fat: number | null;
  carbs: number | null;
  fiber: number | null;
  waterGoalMl: number | null;
  waterLogMl: number | null;
};

type NutritionGoalTemplate = {
  id: string;
  type: string;
  name: string;
  calories: number | null;
  protein: number | null;
  fat: number | null;
  carbs: number | null;
  fiber: number | null;
  waterGoalMl: number | null;
};

type TemplateDraft = GoalDraft & { name: string; waterGoalMl: string };

const EMPTY_DRAFT: FoodDraft = {
  name: "",
  servingDescription: "",
  calories: "",
  protein: "",
  fat: "",
  carbs: "",
  fiber: "",
  healthyScore: "",
};

const EMPTY_GOAL_DRAFT: GoalDraft = {
  calories: "",
  protein: "",
  fat: "",
  carbs: "",
  fiber: "",
};

const EMPTY_TEMPLATE_DRAFT: TemplateDraft = {
  name: "",
  calories: "",
  protein: "",
  fat: "",
  carbs: "",
  fiber: "",
  waterGoalMl: "2000",
};

function templateToTemplateDraft(t: NutritionGoalTemplate | undefined): TemplateDraft {
  if (!t) return EMPTY_TEMPLATE_DRAFT;
  return {
    name: t.name,
    calories: t.calories != null ? String(t.calories) : "",
    protein: t.protein != null ? String(t.protein) : "",
    fat: t.fat != null ? String(t.fat) : "",
    carbs: t.carbs != null ? String(t.carbs) : "",
    fiber: t.fiber != null ? String(t.fiber) : "",
    waterGoalMl: t.waterGoalMl != null ? String(t.waterGoalMl) : "2000",
  };
}

const MEAL_TYPE_LABEL: Record<string, string> = {
  breakfast: "Bữa sáng",
  lunch: "Bữa trưa",
  dinner: "Bữa tối",
  snack: "Ăn phụ",
  other: "Khác",
};

const MEAL_ORDER = ["breakfast", "lunch", "dinner", "snack", "other"] as const;

function toDateInputValue(dateLike: Date | string): string {
  const d = new Date(dateLike);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseNullableNumber(v: string): number | undefined {
  if (v.trim() === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function formatMacro(n: number | null | undefined, unit: string): string {
  if (n === null || n === undefined) return "-";
  if (unit === "kcal") return `${Math.round(n)} kcal`;
  return `${Math.round(n * 10) / 10}g`;
}

function formatHealthyScore(n: number | null | undefined): string {
  if (n === null || n === undefined) return "-";
  return `${Math.max(0, Math.min(10, round1(n)))}/10`;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

async function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Không thể đọc file ảnh"));
    reader.readAsDataURL(file);
  });
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Không thể tải ảnh"));
    img.src = src;
  });
}

async function prepareImageForAI(file: File): Promise<{
  base64: string;
  previewUrl: string;
  mimeType: string;
}> {
  const src = await fileToDataURL(file);
  const image = await loadImage(src);
  const maxSize = 1280;
  const scale = Math.min(1, maxSize / image.width, maxSize / image.height);
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Không thể xử lý ảnh trên trình duyệt này");
  }

  ctx.drawImage(image, 0, 0, width, height);
  const out = canvas.toDataURL("image/jpeg", 0.82);
  const base64 = out.split(",")[1];
  if (!base64) {
    throw new Error("Không thể chuyển ảnh thành dữ liệu base64");
  }

  return {
    base64,
    previewUrl: out,
    mimeType: "image/jpeg",
  };
}

type FavoriteMealItem = {
  id: string;
  name: string;
  servingDescription: string | null;
  calories: number | null;
  protein: number | null;
  fat: number | null;
  carbs: number | null;
  fiber: number | null;
  mealType: string;
};

export default function FoodLogView({
  initialLogs,
  initialDateISO,
  initialGoal,
  initialTemplates,
  initialFavorites = [],
}: {
  initialLogs: FoodLog[];
  initialDateISO: string;
  initialGoal: NutritionGoal | null;
  initialTemplates: NutritionGoalTemplate[];
  initialFavorites?: FavoriteMealItem[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [logs, setLogs] = useState<FoodLog[]>(initialLogs);
  const [selectedDate, setSelectedDate] = useState(toDateInputValue(initialDateISO));
  const [draft, setDraft] = useState<FoodDraft>(EMPTY_DRAFT);
  const [mealType, setMealType] = useState("other");
  const [notes, setNotes] = useState("");
  const [goalDraft, setGoalDraft] = useState<GoalDraft>({
    ...EMPTY_GOAL_DRAFT,
    calories: initialGoal?.calories != null ? String(initialGoal.calories) : "",
    protein: initialGoal?.protein != null ? String(initialGoal.protein) : "",
    fat: initialGoal?.fat != null ? String(initialGoal.fat) : "",
    carbs: initialGoal?.carbs != null ? String(initialGoal.carbs) : "",
    fiber: initialGoal?.fiber != null ? String(initialGoal.fiber) : "",
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingGoal, setIsSavingGoal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ingredients, setIngredients] = useState<IngredientDraft[]>([]);
  const [showAddIngredient, setShowAddIngredient] = useState(false);
  const [newIngredient, setNewIngredient] = useState<IngredientDraft>(EMPTY_INGREDIENT);

  // AI weight recalculation
  const [aiBaseWeight, setAiBaseWeight] = useState<number | null>(null);
  const [aiBaseNutrition, setAiBaseNutrition] = useState<{
    calories: number; protein: number; fat: number; carbs: number; fiber: number;
  } | null>(null);
  const [weightOverride, setWeightOverride] = useState<string>("");

  // Goal modal state
  const workoutTpl = initialTemplates.find((t) => t.type === "workout_day");
  const restTpl = initialTemplates.find((t) => t.type === "rest_day");
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalModalTab, setGoalModalTab] = useState<"workout_day" | "rest_day">("workout_day");
  const [workoutDraft, setWorkoutDraft] = useState<TemplateDraft>(() => templateToTemplateDraft(workoutTpl));
  const [restDraft, setRestDraft] = useState<TemplateDraft>(() => templateToTemplateDraft(restTpl));
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [isApplyingTemplate, setIsApplyingTemplate] = useState(false);

  // Water tracking
  const [waterLog, setWaterLog] = useState(initialGoal?.waterLogMl ?? 0);
  const waterGoal = initialGoal?.waterGoalMl ?? 2000;
  const [isLoggingWater, setIsLoggingWater] = useState(false);

  // Favorites
  const [favorites, setFavorites] = useState<FavoriteMealItem[]>(initialFavorites);
  const [savingFavId, setSavingFavId] = useState<string | null>(null);

  // AI goal suggestion
  const [isAiSuggestingGoal, setIsAiSuggestingGoal] = useState(false);
  const [aiGoalError, setAiGoalError] = useState<string | null>(null);

  useEffect(() => {
    setLogs(initialLogs);
  }, [initialLogs]);

  useEffect(() => {
    setSelectedDate(toDateInputValue(initialDateISO));
  }, [initialDateISO]);

  useEffect(() => {
    setGoalDraft({
      ...EMPTY_GOAL_DRAFT,
      calories: initialGoal?.calories != null ? String(initialGoal.calories) : "",
      protein: initialGoal?.protein != null ? String(initialGoal.protein) : "",
      fat: initialGoal?.fat != null ? String(initialGoal.fat) : "",
      carbs: initialGoal?.carbs != null ? String(initialGoal.carbs) : "",
      fiber: initialGoal?.fiber != null ? String(initialGoal.fiber) : "",
    });
    setWaterLog(initialGoal?.waterLogMl ?? 0);
  }, [initialGoal]);

  useEffect(() => {
    if (!isCameraOpen || !videoRef.current || !streamRef.current) return;
    videoRef.current.srcObject = streamRef.current;
    void videoRef.current.play().catch(() => {
      setCameraError("Không thể phát camera. Vui lòng thử lại.");
    });
  }, [isCameraOpen]);

  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  const totals = useMemo(() => {
    return logs.reduce(
      (acc, log) => {
        acc.calories += log.calories ?? 0;
        acc.protein += log.protein ?? 0;
        acc.fat += log.fat ?? 0;
        acc.carbs += log.carbs ?? 0;
        acc.fiber += log.fiber ?? 0;
        return acc;
      },
      { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0 }
    );
  }, [logs]);

  const groupedLogs = useMemo(() => {
    const groups: Record<string, FoodLog[]> = {};
    for (const log of logs) {
      const key = log.mealType || "other";
      if (!groups[key]) groups[key] = [];
      groups[key].push(log);
    }
    return MEAL_ORDER.filter((k) => k in groups).map((k) => ({
      mealType: k,
      logs: groups[k]!,
      calories: groups[k]!.reduce((s, l) => s + (l.calories ?? 0), 0),
      protein: groups[k]!.reduce((s, l) => s + (l.protein ?? 0), 0),
    }));
  }, [logs]);

  function onDateChange(nextDate: string) {
    setSelectedDate(nextDate);
    startTransition(() => {
      router.push(`/food?date=${nextDate}`);
      router.refresh();
    });
  }

  function resetDraft() {
    setDraft(EMPTY_DRAFT);
    setMealType("other");
    setNotes("");
    setImagePreview(null);
    setCameraError(null);
    closeCamera();
    setAiBaseWeight(null);
    setAiBaseNutrition(null);
    setWeightOverride("");
    setIngredients([]);
    setShowAddIngredient(false);
    setNewIngredient(EMPTY_INGREDIENT);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  // Recalculate totals from ingredients
  function recalcTotalsFromIngredients(ings: IngredientDraft[]) {
    let totalCal = 0, totalPro = 0, totalFat = 0, totalCarbs = 0;
    let totalWeight = 0;
    for (const ing of ings) {
      totalCal += Number(ing.calories) || 0;
      totalPro += Number(ing.protein) || 0;
      totalFat += Number(ing.fat) || 0;
      totalCarbs += Number(ing.carbs) || 0;
      totalWeight += Number(ing.weightG) || 0;
    }
    setDraft((prev) => ({
      ...prev,
      calories: String(Math.round(totalCal)),
      protein: String(Math.round(totalPro * 10) / 10),
      fat: String(Math.round(totalFat * 10) / 10),
      carbs: String(Math.round(totalCarbs * 10) / 10),
    }));
    if (totalWeight > 0) {
      setWeightOverride(String(Math.round(totalWeight)));
    }
  }

  function handleRemoveIngredient(index: number) {
    const updated = ingredients.filter((_, i) => i !== index);
    setIngredients(updated);
    recalcTotalsFromIngredients(updated);
  }

  function handleAddNewIngredient() {
    if (!newIngredient.name.trim()) return;
    const updated = [...ingredients, newIngredient];
    setIngredients(updated);
    recalcTotalsFromIngredients(updated);
    setNewIngredient(EMPTY_INGREDIENT);
    setShowAddIngredient(false);
  }

  function handleIngredientChange(index: number, field: keyof IngredientDraft, value: string) {
    const updated = ingredients.map((ing, i) =>
      i === index ? { ...ing, [field]: value } : ing
    );
    setIngredients(updated);
    if (field !== "name") {
      recalcTotalsFromIngredients(updated);
    }
  }

  function handleIngredientWeightChange(index: number, newWeightStr: string) {
    const ing = ingredients[index];
    if (!ing) return;

    const newWeight = Number(newWeightStr);
    const baseW = ing.baseWeightG !== undefined ? ing.baseWeightG : Number(ing.weightG) || 0;
    const baseCal = ing.baseCalories !== undefined ? ing.baseCalories : Number(ing.calories) || 0;
    const basePro = ing.baseProtein !== undefined ? ing.baseProtein : Number(ing.protein) || 0;
    const baseFat = ing.baseFat !== undefined ? ing.baseFat : Number(ing.fat) || 0;
    const baseCarb = ing.baseCarbs !== undefined ? ing.baseCarbs : Number(ing.carbs) || 0;

    const updatedIng = {
      ...ing,
      weightG: newWeightStr,
      baseWeightG: baseW,
      baseCalories: baseCal,
      baseProtein: basePro,
      baseFat: baseFat,
      baseCarbs: baseCarb,
    };

    if (Number.isFinite(newWeight) && newWeight > 0 && baseW > 0) {
      const ratio = newWeight / baseW;
      updatedIng.calories = String(Math.round(baseCal * ratio));
      updatedIng.protein = String(Math.round(basePro * ratio * 10) / 10);
      updatedIng.fat = String(Math.round(baseFat * ratio * 10) / 10);
      updatedIng.carbs = String(Math.round(baseCarb * ratio * 10) / 10);
    }

    const updated = ingredients.map((item, i) => (i === index ? updatedIng : item));
    setIngredients(updated);
    recalcTotalsFromIngredients(updated);
  }

  function handleIngredientChangeWithBaseline(index: number, field: keyof IngredientDraft, value: string) {
    const ing = ingredients[index];
    if (!ing) return;

    const updatedIng = {
      ...ing,
      [field]: value,
      baseWeightG: undefined,
      baseCalories: undefined,
      baseProtein: undefined,
      baseFat: undefined,
      baseCarbs: undefined,
    };

    const updated = ingredients.map((item, i) => (i === index ? updatedIng : item));
    setIngredients(updated);
    recalcTotalsFromIngredients(updated);
  }

  function recalcFromWeight(newWeightStr: string) {
    setWeightOverride(newWeightStr);
    if (!aiBaseWeight || !aiBaseNutrition) return;
    const newWeight = Number(newWeightStr);
    if (!Number.isFinite(newWeight) || newWeight <= 0) return;
    const ratio = newWeight / aiBaseWeight;
    setDraft((prev) => ({
      ...prev,
      calories: String(Math.round(aiBaseNutrition.calories * ratio)),
      protein: String(Math.round(aiBaseNutrition.protein * ratio * 10) / 10),
      fat: String(Math.round(aiBaseNutrition.fat * ratio * 10) / 10),
      carbs: String(Math.round(aiBaseNutrition.carbs * ratio * 10) / 10),
      fiber: String(Math.round(aiBaseNutrition.fiber * ratio * 10) / 10),
    }));
  }

  function stopCameraStream() {
    if (!streamRef.current) return;
    for (const track of streamRef.current.getTracks()) {
      track.stop();
    }
    streamRef.current = null;
  }

  function closeCamera() {
    setIsCameraOpen(false);
    stopCameraStream();
  }

  async function handleOpenCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Trình duyệt không hỗ trợ mở camera trực tiếp.");
      return;
    }

    setError(null);
    setCameraError(null);
    setIsStartingCamera(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      setIsCameraOpen(true);
    } catch {
      setCameraError("Không thể truy cập camera. Hãy kiểm tra quyền camera trên trình duyệt.");
    } finally {
      setIsStartingCamera(false);
    }
  }

  async function handleCaptureFromCamera() {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      setCameraError("Camera chưa sẵn sàng. Vui lòng thử lại sau vài giây.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setCameraError("Không thể chụp ảnh từ camera trên trình duyệt này.");
      return;
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const out = canvas.toDataURL("image/jpeg", 0.9);
    const base64 = out.split(",")[1];
    if (!base64) {
      setCameraError("Không thể đọc dữ liệu ảnh từ camera.");
      return;
    }

    closeCamera();

    setError(null);
    setCameraError(null);
    setIsAnalyzing(true);
    try {
      setImagePreview(out);
      const res = await analyzeFood(base64, "image/jpeg");
      if (!res.ok) {
        throw new Error(res.error);
      }

      setDraft({
        name: res.data.name,
        servingDescription: res.data.servingDescription,
        calories: String(res.data.calories),
        protein: String(res.data.protein),
        fat: String(res.data.fat),
        carbs: String(res.data.carbs),
        fiber: String(res.data.fiber),
        healthyScore: String(res.data.healthyScore),
      });
      // Populate ingredients
      if (res.data.ingredients && res.data.ingredients.length > 0) {
        setIngredients(res.data.ingredients.map((ing) => ({
          name: ing.name,
          weightG: String(ing.weightG),
          calories: String(ing.calories),
          protein: String(ing.protein),
          fat: String(ing.fat),
          carbs: String(ing.carbs),
        })));
      }
      if (res.data.servingWeightG > 0) {
        setAiBaseWeight(res.data.servingWeightG);
        setAiBaseNutrition({
          calories: res.data.calories,
          protein: res.data.protein,
          fat: res.data.fat,
          carbs: res.data.carbs,
          fiber: res.data.fiber,
        });
        setWeightOverride(String(res.data.servingWeightG));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không phân tích được ảnh món ăn");
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function handleAnalyzeText() {
    if (!draft.name.trim()) return;

    setError(null);
    setCameraError(null);
    setIsAnalyzing(true);

    try {
      const res = await analyzeFoodByText(draft.name);
      if (res.ok) {
        setDraft({
          name: res.data.name,
          servingDescription: res.data.servingDescription,
          calories: String(res.data.calories),
          protein: String(res.data.protein),
          fat: String(res.data.fat),
          carbs: String(res.data.carbs),
          fiber: String(res.data.fiber),
          healthyScore: String(res.data.healthyScore),
        });
        
        // Populate ingredients
        if (res.data.ingredients && res.data.ingredients.length > 0) {
          setIngredients(res.data.ingredients.map((ing) => ({
            name: ing.name,
            weightG: String(ing.weightG),
            calories: String(ing.calories),
            protein: String(ing.protein),
            fat: String(ing.fat),
            carbs: String(ing.carbs),
          })));
        } else {
          setIngredients([]);
        }

        if (res.data.servingWeightG > 0) {
          setAiBaseWeight(res.data.servingWeightG);
          setAiBaseNutrition({
            calories: res.data.calories,
            protein: res.data.protein,
            fat: res.data.fat,
            carbs: res.data.carbs,
            fiber: res.data.fiber,
          });
          setWeightOverride(String(res.data.servingWeightG));
        } else {
          setAiBaseWeight(null);
          setAiBaseNutrition(null);
          setWeightOverride("");
        }
      } else {
        setError(res.error);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không phân tích được món ăn");
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function handleSaveGoal(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSavingGoal(true);
    try {
      await saveNutritionGoal({
        date: selectedDate,
        calories: parseNullableNumber(goalDraft.calories),
        protein: parseNullableNumber(goalDraft.protein),
        fat: parseNullableNumber(goalDraft.fat),
        carbs: parseNullableNumber(goalDraft.carbs),
        fiber: parseNullableNumber(goalDraft.fiber),
      });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không lưu được mục tiêu dinh dưỡng");
    } finally {
      setIsSavingGoal(false);
    }
  }

  async function handleClearGoal() {
    setError(null);
    setGoalDraft(EMPTY_GOAL_DRAFT);
    setIsSavingGoal(true);
    try {
      await saveNutritionGoal({ date: selectedDate });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không xóa được mục tiêu dinh dưỡng");
    } finally {
      setIsSavingGoal(false);
    }
  }

  async function onPickImage(file: File) {
    setError(null);
    setIsAnalyzing(true);
    try {
      const processed = await prepareImageForAI(file);
      setImagePreview(processed.previewUrl);

      const res = await analyzeFood(processed.base64, processed.mimeType);
      if (!res.ok) {
        throw new Error(res.error);
      }

      setDraft({
        name: res.data.name,
        servingDescription: res.data.servingDescription,
        calories: String(res.data.calories),
        protein: String(res.data.protein),
        fat: String(res.data.fat),
        carbs: String(res.data.carbs),
        fiber: String(res.data.fiber),
        healthyScore: String(res.data.healthyScore),
      });
      // Populate ingredients
      if (res.data.ingredients && res.data.ingredients.length > 0) {
        setIngredients(res.data.ingredients.map((ing) => ({
          name: ing.name,
          weightG: String(ing.weightG),
          calories: String(ing.calories),
          protein: String(ing.protein),
          fat: String(ing.fat),
          carbs: String(ing.carbs),
        })));
      }
      if (res.data.servingWeightG > 0) {
        setAiBaseWeight(res.data.servingWeightG);
        setAiBaseNutrition({
          calories: res.data.calories,
          protein: res.data.protein,
          fat: res.data.fat,
          carbs: res.data.carbs,
          fiber: res.data.fiber,
        });
        setWeightOverride(String(res.data.servingWeightG));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không phân tích được ảnh món ăn");
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Vui lòng chọn file ảnh");
      return;
    }
    await onPickImage(file);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.name.trim()) {
      setError("Tên món ăn là bắt buộc");
      return;
    }

    setError(null);
    setIsSaving(true);
    try {
      const log = await addFoodLog({
        name: draft.name.trim(),
        servingDescription: draft.servingDescription.trim() || undefined,
        calories: parseNullableNumber(draft.calories),
        protein: parseNullableNumber(draft.protein),
        fat: parseNullableNumber(draft.fat),
        carbs: parseNullableNumber(draft.carbs),
        fiber: parseNullableNumber(draft.fiber),
        healthyScore: parseNullableNumber(draft.healthyScore),
        mealType,
        notes: notes.trim() || undefined,
        date: selectedDate,
      });

      setLogs((prev) => [log, ...prev]);
      resetDraft();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không lưu được nhật ký ăn uống");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Xóa món ăn này?")) return;

    setError(null);
    setDeletingId(id);
    try {
      await deleteFoodLog(id);
      setLogs((prev) => prev.filter((log) => log.id !== id));
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không xóa được món ăn");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSaveTemplate(type: "workout_day" | "rest_day") {
    const draft = type === "workout_day" ? workoutDraft : restDraft;
    if (!draft.name.trim()) return;
    setIsSavingTemplate(true);
    setError(null);
    try {
      await saveNutritionGoalTemplate({
        type,
        name: draft.name.trim(),
        calories: parseNullableNumber(draft.calories),
        protein: parseNullableNumber(draft.protein),
        fat: parseNullableNumber(draft.fat),
        carbs: parseNullableNumber(draft.carbs),
        fiber: parseNullableNumber(draft.fiber),
        waterGoalMl: parseNullableNumber(draft.waterGoalMl) ?? 2000,
      });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không lưu được template");
    } finally {
      setIsSavingTemplate(false);
    }
  }

  async function handleApplyTemplate(type: "workout_day" | "rest_day") {
    const draft = type === "workout_day" ? workoutDraft : restDraft;
    setIsApplyingTemplate(true);
    setError(null);
    try {
      await saveNutritionGoal({
        date: selectedDate,
        calories: parseNullableNumber(draft.calories),
        protein: parseNullableNumber(draft.protein),
        fat: parseNullableNumber(draft.fat),
        carbs: parseNullableNumber(draft.carbs),
        fiber: parseNullableNumber(draft.fiber),
        waterGoalMl: parseNullableNumber(draft.waterGoalMl) ?? 2000,
      });
      setGoalDraft({
        calories: draft.calories,
        protein: draft.protein,
        fat: draft.fat,
        carbs: draft.carbs,
        fiber: draft.fiber,
      });
      setShowGoalModal(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không áp dụng được mục tiêu");
    } finally {
      setIsApplyingTemplate(false);
    }
  }

  async function handleAISuggestGoal() {
    setIsAiSuggestingGoal(true);
    setAiGoalError(null);
    const res = await suggestNutritionGoalFromLatest();
    if (res.ok) {
      const { workoutDay, restDay } = res.data;
      setWorkoutDraft((prev) => ({
        ...prev,
        calories: String(workoutDay.calories),
        protein: String(workoutDay.protein),
        fat: String(workoutDay.fat),
        carbs: String(workoutDay.carbs),
      }));
      setRestDraft((prev) => ({
        ...prev,
        calories: String(restDay.calories),
        protein: String(restDay.protein),
        fat: String(restDay.fat),
        carbs: String(restDay.carbs),
      }));
      setAiGoalError(null);
    } else {
      setAiGoalError(res.error);
    }
    setIsAiSuggestingGoal(false);
  }

  async function handleAddWater(ml: number) {
    setIsLoggingWater(true);
    setError(null);
    try {
      await logWater(selectedDate, ml);
      setWaterLog((prev) => Math.min(10000, Math.max(0, prev + ml)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không ghi được lượng nước");
    } finally {
      setIsLoggingWater(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="card space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold">Tổng kết trong ngày</h2>
            <p className="text-xs text-muted">Tự động cộng calories và macros từ các món đã lưu</p>
          </div>
          <div className="w-full sm:w-52">
            <label className="text-xs text-muted">Ngày</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          <MacroCard
            label="Calories"
            value={`${Math.round(totals.calories)} kcal`}
            currentNumber={totals.calories}
            goalNumber={parseNullableNumber(goalDraft.calories)}
            icon={<Flame className="h-4 w-4" />}
            tone="text-warning"
          />
          <MacroCard
            label="Protein"
            value={`${round1(totals.protein)}g`}
            currentNumber={totals.protein}
            goalNumber={parseNullableNumber(goalDraft.protein)}
            icon={<Beef className="h-4 w-4" />}
            tone="text-success"
          />
          <MacroCard
            label="Fat"
            value={`${round1(totals.fat)}g`}
            currentNumber={totals.fat}
            goalNumber={parseNullableNumber(goalDraft.fat)}
            icon={<Droplets className="h-4 w-4" />}
            tone="text-accent"
          />
          <MacroCard
            label="Carbs"
            value={`${round1(totals.carbs)}g`}
            currentNumber={totals.carbs}
            goalNumber={parseNullableNumber(goalDraft.carbs)}
            icon={<Wheat className="h-4 w-4" />}
            tone="text-primary"
          />
          <MacroCard
            label="Fiber"
            value={`${round1(totals.fiber)}g`}
            currentNumber={totals.fiber}
            goalNumber={parseNullableNumber(goalDraft.fiber)}
            icon={<Sparkles className="h-4 w-4" />}
          />
        </div>
      </section>

      {/* Water tracking */}
      <section className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold inline-flex items-center gap-2">
            <GlassWater className="h-4 w-4 text-blue-400" />
            Nước uống hôm nay
          </h2>
          <span className="text-sm font-bold text-blue-400">
            {waterLog >= 1000 ? `${(waterLog / 1000).toFixed(1)}L` : `${waterLog}ml`}
            <span className="text-xs text-muted font-normal ml-1">
              / {waterGoal >= 1000 ? `${(waterGoal / 1000).toFixed(1)}L` : `${waterGoal}ml`}
            </span>
          </span>
        </div>

        <div className="h-2.5 w-full rounded-full bg-border/70 overflow-hidden">
          <div
            className="h-full rounded-full bg-blue-500 transition-all duration-500"
            style={{ width: `${Math.min(100, waterGoal > 0 ? Math.round((waterLog / waterGoal) * 100) : 0)}%` }}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {[150, 250, 500].map((ml) => (
            <button
              key={ml}
              type="button"
              className="btn btn-ghost !py-1.5 !px-3 text-sm"
              onClick={() => handleAddWater(ml)}
              disabled={isLoggingWater}
            >
              <Droplet className="h-3.5 w-3.5 text-blue-400" />
              +{ml}ml
            </button>
          ))}
          {waterLog > 0 && (
            <button
              type="button"
              className="btn btn-ghost !py-1.5 !px-3 text-sm text-muted"
              onClick={() => handleAddWater(-waterLog)}
              disabled={isLoggingWater}
            >
              <X className="h-3.5 w-3.5" /> Reset
            </button>
          )}
        </div>
      </section>

      {/* Nutrition goal button → modal */}
      <section className="card space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold inline-flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Mục tiêu dinh dưỡng trong ngày
            </h2>
            <p className="text-xs text-muted mt-0.5">
              {goalDraft.calories
                ? `Mục tiêu: ${goalDraft.calories} kcal · Protein ${goalDraft.protein || "—"}g`
                : "Chưa đặt mục tiêu cho ngày này"}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-secondary !py-1.5 !px-3"
            onClick={() => setShowGoalModal(true)}
          >
            <Settings2 className="h-4 w-4" />
            Thiết lập
          </button>
        </div>

        {/* quick clear */}
        {goalDraft.calories && (
          <button
            type="button"
            className="btn btn-ghost text-xs !py-1"
            onClick={handleClearGoal}
            disabled={isSavingGoal}
          >
            <X className="h-3.5 w-3.5" /> Xóa mục tiêu ngày này
          </button>
        )}
      </section>

      {/* Goal modal */}
      {showGoalModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowGoalModal(false); }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-lg rounded-2xl border border-border bg-[#0f1221] shadow-2xl overflow-hidden max-h-[90dvh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border/60">
              <h3 className="font-semibold text-base inline-flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Thiết lập mục tiêu dinh dưỡng
              </h3>
              <button
                type="button"
                className="btn btn-ghost btn-icon !h-7 !w-7"
                onClick={() => setShowGoalModal(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border/60">
              <button
                type="button"
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors",
                  goalModalTab === "workout_day"
                    ? "text-primary border-b-2 border-primary"
                    : "text-muted hover:text-foreground"
                )}
                onClick={() => setGoalModalTab("workout_day")}
              >
                <Dumbbell className="h-4 w-4" /> Ngày đi tập
              </button>
              <button
                type="button"
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors",
                  goalModalTab === "rest_day"
                    ? "text-primary border-b-2 border-primary"
                    : "text-muted hover:text-foreground"
                )}
                onClick={() => setGoalModalTab("rest_day")}
              >
                <BedDouble className="h-4 w-4" /> Ngày nghỉ
              </button>
            </div>

            {/* AI suggestion strip */}
            <div className="px-4 py-2.5 border-b border-border/40 bg-primary/5 flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-primary flex-shrink-0" />
              <span className="text-xs text-muted flex-1">Gợi ý từ chỉ số cơ thể gần nhất</span>
              <button
                type="button"
                className="btn btn-primary !py-1 !px-3 text-xs"
                onClick={handleAISuggestGoal}
                disabled={isAiSuggestingGoal}
              >
                {isAiSuggestingGoal ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                {isAiSuggestingGoal ? "Đang phân tích..." : "Gợi ý AI"}
              </button>
            </div>
            {aiGoalError && (
              <div className="px-4 py-2 text-xs text-danger border-b border-danger/30 bg-danger/5">{aiGoalError}</div>
            )}

            {/* Tab content */}
            <div className="overflow-y-auto p-4 space-y-4 flex-1">
              {goalModalTab === "workout_day" ? (
                <GoalTemplateForm
                  draft={workoutDraft}
                  setDraft={setWorkoutDraft}
                  type="workout_day"
                  defaultName="Ngày đi tập"
                  isSaving={isSavingTemplate}
                  isApplying={isApplyingTemplate}
                  onSave={() => handleSaveTemplate("workout_day")}
                  onApply={() => handleApplyTemplate("workout_day")}
                  selectedDate={selectedDate}
                />
              ) : (
                <GoalTemplateForm
                  draft={restDraft}
                  setDraft={setRestDraft}
                  type="rest_day"
                  defaultName="Ngày không đi tập"
                  isSaving={isSavingTemplate}
                  isApplying={isApplyingTemplate}
                  onSave={() => handleSaveTemplate("rest_day")}
                  onApply={() => handleApplyTemplate("rest_day")}
                  selectedDate={selectedDate}
                />
              )}
              {error && (
                <div className="rounded-lg border border-danger/50 bg-danger/10 p-2 text-sm text-danger">{error}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ⭐ Favorites section */}
      {favorites.length > 0 && (
        <section className="card space-y-3">
          <h2 className="text-base font-semibold inline-flex items-center gap-2">
            <Star className="h-4 w-4 text-yellow-400" />
            Món yêu thích
          </h2>
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-3 sm:-mx-4 px-3 sm:px-4 pb-1">
            {favorites.map((fav) => (
              <button
                key={fav.id}
                type="button"
                className="group relative flex-shrink-0 rounded-xl border border-border bg-surface/50 hover:bg-surface hover:border-yellow-500/40 p-2.5 text-left transition-all min-w-[140px] max-w-[180px]"
                onClick={() => {
                  setDraft({
                    name: fav.name,
                    servingDescription: fav.servingDescription ?? "",
                    calories: fav.calories != null ? String(fav.calories) : "",
                    protein: fav.protein != null ? String(fav.protein) : "",
                    fat: fav.fat != null ? String(fav.fat) : "",
                    carbs: fav.carbs != null ? String(fav.carbs) : "",
                    fiber: fav.fiber != null ? String(fav.fiber) : "",
                    healthyScore: "",
                  });
                  setMealType(fav.mealType || "other");
                  setIngredients([]);
                  setAiBaseWeight(null);
                  setAiBaseNutrition(null);
                  setWeightOverride("");
                }}
              >
                <button
                  type="button"
                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 h-5 w-5 rounded-full bg-danger/20 text-danger flex items-center justify-center transition-opacity hover:bg-danger/40"
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (!confirm(`Xóa "${fav.name}" khỏi yêu thích?`)) return;
                    setSavingFavId(fav.id);
                    try {
                      await deleteFavoriteMeal(fav.id);
                      setFavorites((prev) => prev.filter((f) => f.id !== fav.id));
                    } catch { /* ignore */ }
                    setSavingFavId(null);
                  }}
                >
                  <X className="h-3 w-3" />
                </button>
                <div className="text-sm font-medium truncate">{fav.name}</div>
                <div className="text-[11px] text-muted mt-0.5">
                  {fav.calories != null ? `${Math.round(fav.calories)} kcal` : "—"}
                  {fav.protein != null ? ` · ${Math.round(fav.protein)}g P` : ""}
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="card space-y-3 card-glow">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Thêm món ăn bằng AI</h2>
            <p className="text-xs text-muted">
              Chụp hoặc tải ảnh bữa ăn, AI sẽ ước tính calories/protein/fat/carbs.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="btn btn-ghost !py-2"
              disabled={isAnalyzing}
            >
              <ImagePlus className="h-4 w-4" /> Tải ảnh
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </div>

        {isCameraOpen && (
          <div className="rounded-xl border border-border bg-surface/40 p-2 space-y-2">
            <video ref={videoRef} className="h-64 w-full rounded-lg bg-black object-cover sm:h-72" playsInline muted autoPlay />
            {cameraError && (
              <div className="rounded-lg border border-danger/50 bg-danger/10 p-2 text-sm text-danger">
                {cameraError}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleCaptureFromCamera}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                Chụp và phân tích
              </button>
              <button type="button" className="btn btn-ghost" onClick={closeCamera}>
                <X className="h-4 w-4" /> Đóng camera
              </button>
            </div>
          </div>
        )}

        {cameraError && !isCameraOpen && (
          <div className="rounded-lg border border-danger/50 bg-danger/10 p-2 text-sm text-danger">{cameraError}</div>
        )}

        {imagePreview && (
          <div className="rounded-xl border border-border overflow-hidden">
            <img src={imagePreview} alt="Món ăn" className="h-56 w-full object-cover sm:h-64" />
          </div>
        )}

        {error && <div className="rounded-lg border border-danger/50 bg-danger/10 p-2 text-sm text-danger">{error}</div>}

        <form onSubmit={handleSave} className="space-y-3">
          {/* Food name + meal type */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs text-muted flex items-center justify-between">
                <span>Tên món</span>
                {draft.name.trim().length > 0 && (
                  <button
                    type="button"
                    onClick={handleAnalyzeText}
                    disabled={isAnalyzing}
                    className="text-[11px] text-primary font-semibold hover:underline inline-flex items-center gap-1 transition-all"
                  >
                    {isAnalyzing ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Sparkles className="h-3 w-3" />
                    )}
                    Phân tích bằng AI
                  </button>
                )}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={draft.name}
                  onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Ví dụ: 3 quả trứng luộc..."
                  required
                  className="flex-1 min-w-0"
                />
                {draft.name.trim().length > 0 && (
                  <button
                    type="button"
                    onClick={handleAnalyzeText}
                    disabled={isAnalyzing}
                    className="btn btn-primary !py-1.5 !px-3 !h-auto text-xs font-semibold rounded-lg flex items-center gap-1 transition-all flex-shrink-0 whitespace-nowrap"
                  >
                    {isAnalyzing ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    AI Quét
                  </button>
                )}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted">Loại bữa</label>
              <select value={mealType} onChange={(e) => setMealType(e.target.value)}>
                <option value="breakfast">Bữa sáng</option>
                <option value="lunch">Bữa trưa</option>
                <option value="dinner">Bữa tối</option>
                <option value="snack">Ăn phụ</option>
                <option value="other">Khác</option>
              </select>
            </div>
          </div>

          {/* Healthy score badge (when AI has analyzed) */}
          {draft.healthyScore && (
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-red-400" />
              <span className="text-sm font-medium">Sức khoẻ:</span>
              <span className={cn(
                "text-sm font-bold",
                Number(draft.healthyScore) >= 7 ? "text-success" : Number(draft.healthyScore) >= 4 ? "text-warning" : "text-danger"
              )}>
                {formatHealthyScore(Number(draft.healthyScore))}
              </span>
            </div>
          )}

          {/* ═══ INGREDIENT BREAKDOWN (when AI returned ingredients) ═══ */}
          {ingredients.length > 0 ? (
            <div className="space-y-4">
              {/* Nutrition summary cards */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted">Calo & Dinh dưỡng</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-border bg-surface/60 px-4 py-3 text-center">
                    <div className="text-xs text-muted">Số lượng</div>
                    <div className="text-xl font-bold mt-0.5">{weightOverride || "—"}<span className="text-sm font-normal text-muted">g</span></div>
                  </div>
                  <div className="rounded-xl border border-border bg-surface/60 px-4 py-3 text-center">
                    <div className="text-xs text-muted">Calo</div>
                    <div className="text-xl font-bold mt-0.5">{draft.calories || "—"}</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-xl border border-border bg-surface/60 px-3 py-2.5 text-center">
                    <div className="text-[11px] text-muted">Tinh bột</div>
                    <div className="flex items-center justify-center gap-1 mt-1">
                      <Wheat className="h-3.5 w-3.5 text-primary" />
                      <span className="text-base font-bold">{draft.carbs || "0"}<span className="text-xs font-normal text-muted">g</span></span>
                    </div>
                  </div>
                  <div className="rounded-xl border border-border bg-surface/60 px-3 py-2.5 text-center">
                    <div className="text-[11px] text-muted">Chất đạm</div>
                    <div className="flex items-center justify-center gap-1 mt-1">
                      <Beef className="h-3.5 w-3.5 text-success" />
                      <span className="text-base font-bold">{draft.protein || "0"}<span className="text-xs font-normal text-muted">g</span></span>
                    </div>
                  </div>
                  <div className="rounded-xl border border-border bg-surface/60 px-3 py-2.5 text-center">
                    <div className="text-[11px] text-muted">Chất béo</div>
                    <div className="flex items-center justify-center gap-1 mt-1">
                      <Droplets className="h-3.5 w-3.5 text-accent" />
                      <span className="text-base font-bold">{draft.fat || "0"}<span className="text-xs font-normal text-muted">g</span></span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ingredients list */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted">Thành phần</h3>
                {ingredients.map((ing, idx) => (
                  <div key={idx} className="rounded-xl border border-border bg-surface/40 p-3 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <input
                        type="text"
                        className="bg-transparent border-0 font-semibold text-base sm:text-sm focus:ring-0 focus:border-0 p-0 w-full hover:bg-surface/60 focus:bg-surface/80 rounded px-1.5 py-0.5 transition-colors"
                        value={ing.name}
                        onChange={(e) => handleIngredientChange(idx, "name", e.target.value)}
                        placeholder="Tên thành phần"
                      />
                      <button
                        type="button"
                        className="flex-shrink-0 h-7 w-7 rounded-full border border-border bg-surface/60 flex items-center justify-center hover:border-danger/50 hover:text-danger transition-colors"
                        onClick={() => handleRemoveIngredient(idx)}
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-5 gap-1">
                      <div>
                        <label className="text-[10px] text-muted block mb-0.5 font-medium text-center">g</label>
                        <input
                          type="number"
                          inputMode="decimal"
                          className="w-full text-base sm:text-xs text-center !py-1 !px-1 bg-surface/50 border-border rounded"
                          value={ing.weightG}
                          onChange={(e) => handleIngredientWeightChange(idx, e.target.value)}
                          placeholder="g"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted block mb-0.5 font-medium text-center">kcal</label>
                        <input
                          type="number"
                          inputMode="decimal"
                          className="w-full text-base sm:text-xs text-center !py-1 !px-1 bg-surface/50 border-border rounded"
                          value={ing.calories}
                          onChange={(e) => handleIngredientChangeWithBaseline(idx, "calories", e.target.value)}
                          placeholder="kcal"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted block mb-0.5 font-medium text-center">Carb</label>
                        <input
                          type="number"
                          inputMode="decimal"
                          className="w-full text-base sm:text-xs text-center !py-1 !px-1 bg-surface/50 border-border rounded"
                          value={ing.carbs}
                          onChange={(e) => handleIngredientChangeWithBaseline(idx, "carbs", e.target.value)}
                          placeholder="Carb"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted block mb-0.5 font-medium text-center">Đạm</label>
                        <input
                          type="number"
                          inputMode="decimal"
                          className="w-full text-base sm:text-xs text-center !py-1 !px-1 bg-surface/50 border-border rounded"
                          value={ing.protein}
                          onChange={(e) => handleIngredientChangeWithBaseline(idx, "protein", e.target.value)}
                          placeholder="Đạm"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted block mb-0.5 font-medium text-center">Béo</label>
                        <input
                          type="number"
                          inputMode="decimal"
                          className="w-full text-base sm:text-xs text-center !py-1 !px-1 bg-surface/50 border-border rounded"
                          value={ing.fat}
                          onChange={(e) => handleIngredientChangeWithBaseline(idx, "fat", e.target.value)}
                          placeholder="Béo"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {/* Add ingredient form */}
                {showAddIngredient ? (
                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-2">
                    <Field
                      label="Tên thành phần"
                      value={newIngredient.name}
                      onChange={(v) => setNewIngredient((prev) => ({ ...prev, name: v }))}
                      placeholder="VD: Trứng luộc"
                      required
                    />
                    <div className="grid grid-cols-5 gap-1.5">
                      <NumberField label="g" value={newIngredient.weightG} onChange={(v) => setNewIngredient((prev) => ({ ...prev, weightG: v }))} />
                      <NumberField label="kcal" value={newIngredient.calories} onChange={(v) => setNewIngredient((prev) => ({ ...prev, calories: v }))} />
                      <NumberField label="Carbs" value={newIngredient.carbs} onChange={(v) => setNewIngredient((prev) => ({ ...prev, carbs: v }))} />
                      <NumberField label="Protein" value={newIngredient.protein} onChange={(v) => setNewIngredient((prev) => ({ ...prev, protein: v }))} />
                      <NumberField label="Fat" value={newIngredient.fat} onChange={(v) => setNewIngredient((prev) => ({ ...prev, fat: v }))} />
                    </div>
                    <div className="flex gap-2">
                      <button type="button" className="btn btn-primary !py-1.5 text-xs" onClick={handleAddNewIngredient}>
                        <Plus className="h-3.5 w-3.5" /> Thêm
                      </button>
                      <button type="button" className="btn btn-ghost !py-1.5 text-xs" onClick={() => { setShowAddIngredient(false); setNewIngredient(EMPTY_INGREDIENT); }}>
                        <X className="h-3.5 w-3.5" /> Huỷ
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="w-full flex items-center gap-2 text-sm text-primary font-medium py-2.5 px-4 rounded-xl border border-dashed border-primary/30 hover:bg-primary/5 transition-colors"
                    onClick={() => setShowAddIngredient(true)}
                  >
                    <Plus className="h-4 w-4" />
                    Thêm thành phần mới
                  </button>
                )}
              </div>

              {/* Hidden fields: fiber & healthyScore remain editable in a collapsed row */}
              <div className="grid grid-cols-2 gap-2">
                <NumberField
                  label="Fiber (g)"
                  value={draft.fiber}
                  onChange={(v) => setDraft((prev) => ({ ...prev, fiber: v }))}
                />
                <NumberField
                  label="Healthy Score (/10)"
                  value={draft.healthyScore}
                  onChange={(v) => setDraft((prev) => ({ ...prev, healthyScore: v }))}
                />
              </div>
            </div>
          ) : (
            /* ═══ FALLBACK: Original flat form (when no ingredients from AI) ═══ */
            <>
              <Field
                label="Khẩu phần"
                value={draft.servingDescription}
                onChange={(v) => setDraft((prev) => ({ ...prev, servingDescription: v }))}
                placeholder="Ví dụ: 3 quả trứng luộc (~180g)"
              />

              {aiBaseWeight !== null && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs text-primary font-medium">
                    <Sparkles className="h-3.5 w-3.5" />
                    Điều chỉnh khối lượng – macro sẽ tự tính lại theo tỷ lệ
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      inputMode="decimal"
                      min={1}
                      max={9999}
                      value={weightOverride}
                      onChange={(e) => recalcFromWeight(e.target.value)}
                      className="w-28 text-sm"
                      placeholder="Khối lượng"
                    />
                    <span className="text-sm text-muted">gram</span>
                    <span className="text-xs text-muted ml-auto">AI ước tính: {aiBaseWeight}g</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                <NumberField label="Calories" value={draft.calories} onChange={(v) => setDraft((prev) => ({ ...prev, calories: v }))} />
                <NumberField label="Protein (g)" value={draft.protein} onChange={(v) => setDraft((prev) => ({ ...prev, protein: v }))} />
                <NumberField label="Fat (g)" value={draft.fat} onChange={(v) => setDraft((prev) => ({ ...prev, fat: v }))} />
                <NumberField label="Carbs (g)" value={draft.carbs} onChange={(v) => setDraft((prev) => ({ ...prev, carbs: v }))} />
                <NumberField label="Fiber (g)" value={draft.fiber} onChange={(v) => setDraft((prev) => ({ ...prev, fiber: v }))} />
                <NumberField label="Healthy (/10)" value={draft.healthyScore} onChange={(v) => setDraft((prev) => ({ ...prev, healthyScore: v }))} />
              </div>
            </>
          )}

          <div className="space-y-1">
            <label className="text-xs text-muted">Ghi chú</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="resize-none"
              placeholder="Thêm thông tin bổ sung nếu cần"
            />
          </div>

          {/* Save button - full width like reference image */}
          <div className="flex flex-col gap-2">
            <button
              type="submit"
              className="btn btn-primary w-full !py-3 text-base font-semibold"
              disabled={isSaving || isAnalyzing}
            >
              {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
              Lưu
            </button>
            <button type="button" className="btn btn-ghost text-xs" onClick={resetDraft}>
              <X className="h-3.5 w-3.5" /> Xóa form
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Nhật ký món ăn ({logs.length})</h2>

        {logs.length === 0 && (
          <div className="card text-center py-10 text-sm text-muted">
            <Utensils className="mx-auto mb-2 h-8 w-8 opacity-30" />
            Chưa có món ăn nào trong ngày này.<br />Thử chụp ảnh bữa ăn để bắt đầu.
          </div>
        )}

        {groupedLogs.map((group) => (
          <div key={group.mealType} className="space-y-2">
            <div className="flex items-center justify-between px-0.5">
              <span className="text-sm font-semibold">
                {MEAL_TYPE_LABEL[group.mealType] ?? group.mealType}
              </span>
              <span className="text-xs text-muted tabular">
                {Math.round(group.calories)} kcal · {round1(group.protein)}g protein
              </span>
            </div>

            {group.logs.map((log) => (
              <article key={log.id} className="card !p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="flex items-center gap-1.5 font-semibold text-sm">
                      <Utensils className="h-3.5 w-3.5 flex-shrink-0 text-muted" />
                      <span className="truncate">{log.name}</span>
                    </h3>
                    <div className="text-xs text-muted mt-0.5">{formatDateTime(log.date)}</div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      title="Lưu yêu thích"
                      disabled={savingFavId === log.id}
                      className={cn(
                        "btn btn-ghost btn-icon !h-7 !w-7",
                        favorites.some((f) => f.name === log.name)
                          ? "!text-yellow-400"
                          : "!text-muted hover:!text-yellow-400"
                      )}
                      onClick={async () => {
                        if (favorites.some((f) => f.name === log.name)) return;
                        setSavingFavId(log.id);
                        try {
                          const meal = await addFavoriteMeal({
                            name: log.name,
                            servingDescription: log.servingDescription ?? undefined,
                            calories: log.calories ?? undefined,
                            protein: log.protein ?? undefined,
                            fat: log.fat ?? undefined,
                            carbs: log.carbs ?? undefined,
                            fiber: log.fiber ?? undefined,
                            mealType: log.mealType,
                          });
                          setFavorites((prev) => [{
                            id: meal.id,
                            name: meal.name,
                            servingDescription: meal.servingDescription,
                            calories: meal.calories,
                            protein: meal.protein,
                            fat: meal.fat,
                            carbs: meal.carbs,
                            fiber: meal.fiber,
                            mealType: meal.mealType,
                          }, ...prev]);
                        } catch { /* ignore */ }
                        setSavingFavId(null);
                      }}
                    >
                      {savingFavId === log.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Star className={cn("h-3.5 w-3.5", favorites.some((f) => f.name === log.name) && "fill-yellow-400")} />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(log.id)}
                      disabled={deletingId === log.id}
                      className="btn btn-ghost btn-icon !h-7 !w-7 !text-muted hover:!text-danger"
                    >
                      {deletingId === log.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {log.servingDescription && (
                  <p className="text-xs text-muted">{log.servingDescription}</p>
                )}

                <div className="grid grid-cols-3 gap-1.5 text-xs sm:grid-cols-6">
                  <DataChip label="Calories" value={formatMacro(log.calories, "kcal")} />
                  <DataChip label="Protein" value={formatMacro(log.protein, "g")} />
                  <DataChip label="Fat" value={formatMacro(log.fat, "g")} />
                  <DataChip label="Carbs" value={formatMacro(log.carbs, "g")} />
                  <DataChip label="Fiber" value={formatMacro(log.fiber, "g")} />
                  <DataChip label="Healthy" value={formatHealthyScore(log.healthyScore)} />
                </div>

                {log.notes && <p className="text-xs italic text-muted">"{log.notes}"</p>}
              </article>
            ))}
          </div>
        ))}
      </section>
    </div>
  );
}

function GoalTemplateForm({
  draft,
  setDraft,
  type,
  defaultName,
  isSaving,
  isApplying,
  onSave,
  onApply,
  selectedDate,
}: {
  draft: TemplateDraft;
  setDraft: (d: TemplateDraft) => void;
  type: "workout_day" | "rest_day";
  defaultName: string;
  isSaving: boolean;
  isApplying: boolean;
  onSave: () => void;
  onApply: () => void;
  selectedDate: string;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <label className="text-xs text-muted">Tên preset</label>
        <input
          type="text"
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          placeholder={defaultName}
        />
      </div>

      <div className="space-y-2">
        <p className="text-xs text-muted uppercase tracking-wider">Mục tiêu dinh dưỡng</p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          <NumberField
            label="Calories (kcal)"
            value={draft.calories}
            onChange={(v) => setDraft({ ...draft, calories: v })}
          />
          <NumberField
            label="Protein (g)"
            value={draft.protein}
            onChange={(v) => setDraft({ ...draft, protein: v })}
          />
          <NumberField
            label="Fat (g)"
            value={draft.fat}
            onChange={(v) => setDraft({ ...draft, fat: v })}
          />
          <NumberField
            label="Carbs (g)"
            value={draft.carbs}
            onChange={(v) => setDraft({ ...draft, carbs: v })}
          />
          <NumberField
            label="Fiber (g)"
            value={draft.fiber}
            onChange={(v) => setDraft({ ...draft, fiber: v })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-muted uppercase tracking-wider">Mục tiêu nước uống</p>
        <div className="flex items-center gap-2">
          <GlassWater className="h-4 w-4 text-blue-400 flex-shrink-0" />
          <div className="w-36">
            <NumberField
              label="Nước / ngày (ml)"
              value={draft.waterGoalMl}
              onChange={(v) => setDraft({ ...draft, waterGoalMl: v })}
            />
          </div>
          <div className="flex gap-1.5 mt-5">
            {[1500, 2000, 2500, 3000].map((ml) => (
              <button
                key={ml}
                type="button"
                className={cn(
                  "rounded-lg px-2 py-1 text-[11px] font-medium border transition-colors",
                  draft.waterGoalMl === String(ml)
                    ? "border-blue-500 bg-blue-500/20 text-blue-300"
                    : "border-border text-muted hover:border-blue-400 hover:text-blue-300"
                )}
                onClick={() => setDraft({ ...draft, waterGoalMl: String(ml) })}
              >
                {ml / 1000}L
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          className="btn btn-primary flex-1 sm:flex-none"
          onClick={onApply}
          disabled={isApplying}
        >
          {isApplying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Target className="h-4 w-4" />}
          Áp dụng cho {selectedDate}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onSave}
          disabled={isSaving || !draft.name.trim()}
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronDown className="h-4 w-4" />}
          Lưu preset
        </button>
      </div>
    </div>
  );
}

function MacroCard({
  label,
  value,
  currentNumber,
  goalNumber,
  icon,
  tone,
}: {
  label: string;
  value: string;
  currentNumber: number;
  goalNumber?: number;
  icon: React.ReactNode;
  tone?: string;
}) {
  const currentValue = currentNumber;
  const goalValue = goalNumber ?? NaN;
  const hasGoal = Number.isFinite(goalValue) && goalValue > 0;
  const rawProgressPct = hasGoal ? Math.round((currentValue / goalValue) * 100) : null;
  const barProgressPct = rawProgressPct === null ? null : Math.min(100, rawProgressPct);
  const remaining = hasGoal ? goalValue - currentValue : null;
  const isOver = remaining !== null && remaining < 0;
  const absRemaining = remaining === null ? 0 : Math.abs(remaining);
  const goalText = label === "Calories" ? `${Math.round(goalValue)} kcal` : `${round1(goalValue)}g`;
  const remainingText =
    label === "Calories"
      ? `${Math.round(absRemaining)} kcal`
      : `${round1(absRemaining)}g`;

  return (
    <div className="min-w-0 rounded-xl border border-border bg-surface/60 px-3 py-2">
      <div className="inline-flex items-center gap-1.5 text-xs text-muted">
        <span className={tone}>{icon}</span>
        {label}
      </div>
      <div className="min-w-0 text-base font-bold mt-1 truncate">{value}</div>
      {hasGoal && rawProgressPct !== null && barProgressPct !== null && (
        <>
          <div className="mt-1 text-[11px] text-muted">Mục tiêu: {goalText}</div>
          <div className="mt-1 h-1.5 w-full rounded-full bg-border/70 overflow-hidden">
            <div
              className={cn("h-full rounded-full", isOver ? "bg-warning" : "bg-primary")}
              style={{ width: `${barProgressPct}%` }}
            />
          </div>
          <div className="mt-1 text-[11px] text-muted">Đạt {rawProgressPct}%</div>
          <div className={cn("text-[11px]", isOver ? "text-warning" : "text-muted")}>
            {isOver ? `Vượt ${remainingText}` : `Còn ${remainingText}`}
          </div>
        </>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-muted">{label}</label>
      <input
        type="text"
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="block min-h-8 text-[10px] uppercase tracking-wider leading-4 text-muted">{label}</label>
      <input
        type="number"
        inputMode="decimal"
        step="0.1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
        className="!py-1.5 !px-2 text-center"
      />
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
