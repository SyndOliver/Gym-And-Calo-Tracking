import Groq from "groq-sdk";
import { ProxyAgent } from "undici";

export type FoodIngredient = {
  name: string;
  weightG: number;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
};

export type FoodAnalysisResult = {
  name: string;
  servingDescription: string;
  servingWeightG: number;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
  healthyScore: number;
  ingredients: FoodIngredient[];
};

function toAsciiLower(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeFoodName(rawName: string): string {
  const name = rawName.trim();
  if (!name) return "Món ăn";

  const ascii = toAsciiLower(name);

  // Common VN cake aliases that models often confuse.
  if (
    ascii.includes("phu the") ||
    ascii.includes("su se") ||
    ascii.includes("xu xe")
  ) {
    return "Bánh phu thê (bánh su sê)";
  }

  if (ascii.includes("banh bo")) {
    if (ascii.includes("nuong")) return "Bánh bò nướng";
    if (ascii.includes("hap")) return "Bánh bò hấp";
    return "Bánh bò";
  }

  if (ascii.includes("banh da lon") || ascii.includes("banh da heo")) {
    return "Bánh da lợn";
  }

  if (ascii.includes("banh trang tron")) {
    return "Bánh tráng trộn";
  }

  if (ascii.includes("banh trang nuong")) {
    return "Bánh tráng nướng";
  }

  if (ascii.includes("tra sua") || ascii.includes("milk tea")) {
    return "Trà sữa";
  }

  if (ascii.includes("xoai lac") || ascii.includes("xoai lắc")) {
    return "Xoài lắc";
  }

  if (ascii.includes("ca vien chien") || ascii.includes("vien chien")) {
    return "Cá viên chiên";
  }

  if (ascii.includes("xuc xich chien") || ascii.includes("xuc xich")) {
    return "Xúc xích chiên";
  }

  return name;
}

export async function analyzeFoodImage(
  imageBase64: string,
  mimeType: string
): Promise<FoodAnalysisResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GROQ_API_KEY chưa được cấu hình. Vui lòng thêm vào file .env"
    );
  }

  const proxyUrl =
    process.env.HTTPS_PROXY ||
    process.env.HTTP_PROXY ||
    process.env.https_proxy ||
    process.env.http_proxy;

  let fetchFn: typeof globalThis.fetch | undefined;
  if (proxyUrl) {
    const proxyAgent = new ProxyAgent(proxyUrl);
    fetchFn = (input, init) =>
      globalThis.fetch(input, {
        ...(init ?? {}),
        dispatcher: proxyAgent,
      } as RequestInit);
  }

  const groq = new Groq({ apiKey, ...(fetchFn ? { fetch: fetchFn } : {}) });
  const model = process.env.GROQ_MODEL ?? "meta-llama/llama-4-scout-17b-16e-instruct";

  const systemPrompt = `Bạn là chuyên gia dinh dưỡng chuyên phân tích thực phẩm Việt Nam và quốc tế từ ảnh.

## BƯỚC 1 – NHẬN DIỆN MÓN ĂN
Quan sát kỹ ảnh, xác định:
- Tên từng món (tiếng Việt, chính xác nhất có thể)
- Màu sắc, kết cấu, hình dạng để phân biệt các loại bánh/món tương tự
- Vật tham chiếu để ước khối lượng (bát, đĩa, tay, đũa, muỗng, chai)

## BƯỚC 2 – ƯỚC LƯỢNG KHẨU PHẦN
Dùng các mốc tham chiếu sau:
| Vật tham chiếu | Khối lượng tương đương |
|---|---|
| Bát cơm tiêu chuẩn | 150–200g cơm chín |
| Đĩa ăn (20–25cm) | bề mặt thực phẩm chiếm ~70% |
| Miếng thịt = lòng bàn tay | 100–120g |
| Ly/cốc 500ml | thể tích tương ứng |
| 1 xiên ăn vặt | 3–5 viên/miếng |

Nếu không thấy rõ → dùng khẩu phần trung bình người Việt trưởng thành.
Trả về "servingWeightG" = tổng khối lượng ước tính của khẩu phần (gram, số nguyên dương).

## BƯỚC 3 – PHÂN TÁCH THÀNH PHẦN (INGREDIENTS)
PHẢI phân tách món ăn thành từng thành phần riêng biệt. Mỗi thành phần gồm:
- Tên thành phần (tiếng Việt)
- Khối lượng ước tính (gram)
- Dinh dưỡng riêng: calories, protein, fat, carbs

Ví dụ: "Phở bò" → bánh phở, thịt bò, nước dùng, hành tây và rau
Ví dụ: "Cơm sườn" → cơm trắng, sườn nướng, rau sống, đồ chua

Mốc tham chiếu nhanh (per 100g trừ khi ghi khác):
- Cơm trắng chín: 130 kcal | P 2.7g | F 0.3g | C 28g
- Thịt heo nạc: 143 kcal | P 26g | F 4g
- Thịt gà ức: 165 kcal | P 31g | F 3.6g
- Trứng luộc (1 quả 50g): 78 kcal | P 6g | F 5g
- Tôm: 99 kcal | P 24g | F 0.3g
- Rau xanh nấu chín: 25–40 kcal
- Dầu ăn xào (ước lượng): +45–90 kcal tùy lượng
- Phở bò 1 tô: 400–450 kcal
- Bánh mì kẹp thịt 1 ổ: 350–400 kcal

## BƯỚC 4 – NHẬN DIỆN ĐẶC BIỆT

### Bánh Việt hay nhầm lẫn:
- Bánh phu thê = bánh su sê = bánh xu xê → dùng: "Bánh phu thê (bánh su sê)"
- Bánh bò hấp vs bánh bò nướng: nướng = màu vàng nâu, mặt nứt; hấp = trắng/vàng nhạt, xốp
- Bánh da lợn: nhiều lớp xanh/trắng xen kẽ, trong mờ
- Nếu không chắc chắn 100%: ghi tên gần nhất + ghi chú "ước tính" ở servingDescription

### Món ăn vặt vỉa hè Việt:
- Bánh tráng trộn / nướng / cuốn
- Cá viên / bò viên / xúc xích / hồ lô chiên
- Trà sữa / trà trái cây / nước ngọt
- Xoài lắc / cóc lắc / ổi lắc / khô gà lá chanh
- Khoai tây chiên / gà rán / tokbokki / khoai lang lắc phô mai

## BƯỚC 5 – CHẤM ĐIỂM HEALTHY (thang 1–10)
| Điểm | Mô tả |
|---|---|
| 1–3 | Rất không lành mạnh: nhiều chiên rán, đường, mỡ, ít rau |
| 4–6 | Trung bình: cân bằng ở mức chấp nhận được |
| 7–8 | Khá tốt: nhiều đạm nạc, rau, ít dầu mỡ |
| 9–10 | Rất lành mạnh: đa dạng, cân bằng, ít chế biến |

Giảm điểm khi: đồ chiên ngập dầu, nước ngọt, thịt mỡ, ít/không có rau, quá mặn.
Tăng điểm khi: rau xanh, đạm nạc, chất xơ, ít đường tinh luyện, ít dầu.

## QUY TẮC ĐẦU RA
- PHẢI có mảng "ingredients" chứa từng thành phần
- Tổng dinh dưỡng = tổng cộng từ tất cả ingredients
- Làm tròn: calories → số nguyên; protein/fat/carbs/fiber → 1 chữ số thập phân; healthyScore → 1 chữ số thập phân
- KHÔNG thêm text hay markdown ngoài JSON`;

  const userPrompt = `Nhìn ảnh và phân tích theo đúng 5 bước trong system prompt.

Trả về DUY NHẤT một JSON object hợp lệ, KHÔNG có text, KHÔNG có markdown, KHÔNG có backtick:

{
  "name": "tên món chính bằng tiếng Việt",
  "ingredients": [
    { "name": "Bánh phở", "weightG": 200, "calories": 220, "protein": 4, "fat": 0.4, "carbs": 48 },
    { "name": "Thịt bò", "weightG": 120, "calories": 250, "protein": 28, "fat": 15, "carbs": 0 },
    { "name": "Nước dùng phở", "weightG": 350, "calories": 140, "protein": 8, "fat": 10, "carbs": 4 },
    { "name": "Hành tây và rau", "weightG": 30, "calories": 12, "protein": 0.5, "fat": 0.1, "carbs": 2.5 }
  ],
  "servingDescription": "1 tô phở bò tái nạm (~700g)",
  "servingWeightG": 700,
  "calories": 622,
  "protein": 40.5,
  "fat": 25.5,
  "carbs": 54.5,
  "fiber": 1.5,
  "healthyScore": 7.5
}`;

  let completion;
  try {
    completion = await groq.chat.completions.create({
      model,
      temperature: 0.2,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: userPrompt },
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${imageBase64}` },
            },
          ],
        },
      ],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.toLowerCase().includes("fetch failed") || message.toLowerCase().includes("connect")) {
      throw new Error(
        "Không kết nối được đến Groq API. Vui lòng kiểm tra kết nối mạng và GROQ_API_KEY trong .env"
      );
    }
    throw error;
  }

  const text = (completion.choices[0]?.message?.content ?? "").trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(
      "AI không thể nhận diện được thực phẩm. Hãy thử lại với ảnh rõ hơn."
    );
  }

  const parsed = JSON.parse(jsonMatch[0]);
  const rawHealthyScore = Number(parsed.healthyScore);
  const healthyScoreBase = Number.isFinite(rawHealthyScore) ? rawHealthyScore : 5;
  const normalizedName = normalizeFoodName(String(parsed.name ?? "Món ăn"));

  const rawWeight = Number(parsed.servingWeightG);
  const servingWeightG = Number.isFinite(rawWeight) && rawWeight > 0 ? Math.round(rawWeight) : 0;

  // Parse ingredients array
  const rawIngredients = Array.isArray(parsed.ingredients) ? parsed.ingredients : [];
  const ingredients: FoodIngredient[] = rawIngredients.map((ing: Record<string, unknown>) => ({
    name: String(ing.name ?? "Thành phần"),
    weightG: Math.round(Number(ing.weightG) || 0),
    calories: Math.round(Number(ing.calories) || 0),
    protein: Math.round((Number(ing.protein) || 0) * 10) / 10,
    fat: Math.round((Number(ing.fat) || 0) * 10) / 10,
    carbs: Math.round((Number(ing.carbs) || 0) * 10) / 10,
  }));

  return {
    name: normalizedName,
    servingDescription: String(parsed.servingDescription ?? ""),
    servingWeightG,
    calories: Math.round(Number(parsed.calories) || 0),
    protein: Math.round((Number(parsed.protein) || 0) * 10) / 10,
    fat: Math.round((Number(parsed.fat) || 0) * 10) / 10,
    carbs: Math.round((Number(parsed.carbs) || 0) * 10) / 10,
    fiber: Math.round((Number(parsed.fiber) || 0) * 10) / 10,
    healthyScore: Math.max(0, Math.min(10, Math.round(healthyScoreBase * 10) / 10)),
    ingredients,
  };
}

export async function analyzeFoodText(foodName: string): Promise<FoodAnalysisResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GROQ_API_KEY chưa được cấu hình. Vui lòng thêm vào file .env"
    );
  }

  const proxyUrl =
    process.env.HTTPS_PROXY ||
    process.env.HTTP_PROXY ||
    process.env.https_proxy ||
    process.env.http_proxy;

  let fetchFn: typeof globalThis.fetch | undefined;
  if (proxyUrl) {
    const proxyAgent = new ProxyAgent(proxyUrl);
    fetchFn = (input, init) =>
      globalThis.fetch(input, {
        ...(init ?? {}),
        dispatcher: proxyAgent,
      } as RequestInit);
  }

  const groq = new Groq({ apiKey, ...(fetchFn ? { fetch: fetchFn } : {}) });
  const model = process.env.GROQ_MODEL ?? "meta-llama/llama-4-scout-17b-16e-instruct";

  const systemPrompt = `Bạn là chuyên gia dinh dưỡng chuyên phân tích thực phẩm Việt Nam và quốc tế.
Bạn cần phân tách món ăn được yêu cầu thành các thành phần cụ thể và ước lượng dinh dưỡng chi tiết.

## BƯỚC 1 – NHẬN DIỆN MÓN ĂN
Xác định tên món ăn dựa trên yêu cầu nhập liệu của người dùng.

## BƯỚC 2 – ƯỚC LƯỢNG KHẨU PHẦN
Sử dụng khẩu phần trung bình tiêu chuẩn của người Việt trưởng thành cho món này nếu người dùng không ghi rõ số lượng.
Trả về "servingWeightG" = tổng khối lượng ước tính của khẩu phần (gram, số nguyên dương).

## BƯỚC 3 – PHÂN TÁCH THÀNH PHẦN (INGREDIENTS)
PHẢI phân tách món ăn thành từng thành phần riêng biệt. Mỗi thành phần gồm:
- Tên thành phần (tiếng Việt)
- Khối lượng ước tính (gram)
- Dinh dưỡng riêng: calories, protein, fat, carbs

Ví dụ: "Phở bò" → bánh phở, thịt bò, nước dùng, hành tây và rau
Ví dụ: "Cơm sườn" → cơm trắng, sườn nướng, rau sống, đồ chua

Mốc tham chiếu nhanh (per 100g trừ khi ghi khác):
- Cơm trắng chín: 130 kcal | P 2.7g | F 0.3g | C 28g
- Thịt heo nạc: 143 kcal | P 26g | F 4g
- Thịt gà ức: 165 kcal | P 31g | F 3.6g
- Trứng luộc (1 quả 50g): 78 kcal | P 6g | F 5g
- Tôm: 99 kcal | P 24g | F 0.3g
- Rau xanh nấu chín: 25–40 kcal
- Phở bò 1 tô: 400–450 kcal
- Bánh mì kẹp thịt 1 ổ: 350–400 kcal

## BƯỚC 4 – CHẤM ĐIỂM HEALTHY (thang 1–10)
Đánh giá mức độ dinh dưỡng lành mạnh của món ăn.

## QUY TẮC ĐẦU RA
- PHẢI có mảng "ingredients" chứa từng thành phần
- Tổng dinh dưỡng = tổng cộng từ tất cả ingredients
- Làm tròn: calories → số nguyên; protein/fat/carbs/fiber → 1 chữ số thập phân; healthyScore → 1 chữ số thập phân
- KHÔNG thêm text hay markdown ngoài JSON`;

  const userPrompt = `Phân tích món ăn sau đây: "${foodName}".

Trả về DUY NHẤT một JSON object hợp lệ, KHÔNG có text, KHÔNG có markdown, KHÔNG có backtick:

{
  "name": "tên món chính bằng tiếng Việt",
  "ingredients": [
    { "name": "Bánh phở", "weightG": 200, "calories": 220, "protein": 4, "fat": 0.4, "carbs": 48 },
    { "name": "Thịt bò", "weightG": 120, "calories": 250, "protein": 28, "fat": 15, "carbs": 0 },
    { "name": "Nước dùng phở", "weightG": 350, "calories": 140, "protein": 8, "fat": 10, "carbs": 4 },
    { "name": "Hành tây và rau", "weightG": 30, "calories": 12, "protein": 0.5, "fat": 0.1, "carbs": 2.5 }
  ],
  "servingDescription": "1 tô phở bò tái nạm (~700g)",
  "servingWeightG": 700,
  "calories": 622,
  "protein": 40.5,
  "fat": 25.5,
  "carbs": 54.5,
  "fiber": 1.5,
  "healthyScore": 7.5
}`;

  let completion;
  try {
    completion = await groq.chat.completions.create({
      model,
      temperature: 0.2,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.toLowerCase().includes("fetch failed") || message.toLowerCase().includes("connect")) {
      throw new Error(
        "Không kết nối được đến Groq API. Vui lòng kiểm tra kết nối mạng và GROQ_API_KEY trong .env"
      );
    }
    throw error;
  }

  const text = (completion.choices[0]?.message?.content ?? "").trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(
      "AI không thể nhận diện được thực phẩm. Hãy kiểm tra lại tên món ăn bạn nhập."
    );
  }

  const parsed = JSON.parse(jsonMatch[0]);
  const rawHealthyScore = Number(parsed.healthyScore);
  const healthyScoreBase = Number.isFinite(rawHealthyScore) ? rawHealthyScore : 5;
  const normalizedName = normalizeFoodName(String(parsed.name ?? foodName));

  const rawWeight = Number(parsed.servingWeightG);
  const servingWeightG = Number.isFinite(rawWeight) && rawWeight > 0 ? Math.round(rawWeight) : 0;

  const rawIngredients = Array.isArray(parsed.ingredients) ? parsed.ingredients : [];
  const ingredients: FoodIngredient[] = rawIngredients.map((ing: Record<string, unknown>) => ({
    name: String(ing.name ?? "Thành phần"),
    weightG: Math.round(Number(ing.weightG) || 0),
    calories: Math.round(Number(ing.calories) || 0),
    protein: Math.round((Number(ing.protein) || 0) * 10) / 10,
    fat: Math.round((Number(ing.fat) || 0) * 10) / 10,
    carbs: Math.round((Number(ing.carbs) || 0) * 10) / 10,
  }));

  return {
    name: normalizedName,
    servingDescription: String(parsed.servingDescription ?? ""),
    servingWeightG,
    calories: Math.round(Number(parsed.calories) || 0),
    protein: Math.round((Number(parsed.protein) || 0) * 10) / 10,
    fat: Math.round((Number(parsed.fat) || 0) * 10) / 10,
    carbs: Math.round((Number(parsed.carbs) || 0) * 10) / 10,
    fiber: Math.round((Number(parsed.fiber) || 0) * 10) / 10,
    healthyScore: Math.max(0, Math.min(10, Math.round(healthyScoreBase * 10) / 10)),
    ingredients,
  };
}

export type NutritionPlanResult = {
  workoutDay: { calories: number; protein: number; carbs: number; fat: number; explanation: string };
  restDay: { calories: number; protein: number; carbs: number; fat: number; explanation: string };
};

export async function generateNutritionPlan(metrics: {
  weight?: number | null;
  height?: number | null;
  age?: number | null;
  gender?: string | null;
  bodyFat?: number | null;
  muscle?: number | null;
  bmr?: number | null;
}): Promise<NutritionPlanResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY chưa được cấu hình");

  const proxyUrl =
    process.env.HTTPS_PROXY ||
    process.env.HTTP_PROXY ||
    process.env.https_proxy ||
    process.env.http_proxy;

  let fetchFn: typeof globalThis.fetch | undefined;
  if (proxyUrl) {
    const proxyAgent = new ProxyAgent(proxyUrl);
    fetchFn = (input, init) =>
      globalThis.fetch(input, { ...(init ?? {}), dispatcher: proxyAgent } as RequestInit);
  }

  const groq = new Groq({ apiKey, ...(fetchFn ? { fetch: fetchFn } : {}) });
  const model = process.env.GROQ_MODEL ?? "meta-llama/llama-4-scout-17b-16e-instruct";

  // Calculate derived values if possible
  let bmi: number | null = null;
  if (metrics.weight && metrics.height) {
    bmi = Math.round((metrics.weight / Math.pow(metrics.height / 100, 2)) * 10) / 10;
  }

  let bmr = metrics.bmr;
  if (!bmr && metrics.weight && metrics.height && metrics.age && metrics.gender) {
    // Mifflin-St Jeor
    bmr = metrics.gender === "female"
      ? 10 * metrics.weight + 6.25 * metrics.height - 5 * metrics.age - 161
      : 10 * metrics.weight + 6.25 * metrics.height - 5 * metrics.age + 5;
    bmr = Math.round(bmr);
  }

  let leanMass: number | null = null;
  if (metrics.weight && metrics.bodyFat) {
    leanMass = Math.round(metrics.weight * (1 - metrics.bodyFat / 100) * 10) / 10;
  }

  const metricsText = [
    metrics.weight ? `Cân nặng: ${metrics.weight} kg` : null,
    metrics.height ? `Chiều cao: ${metrics.height} cm` : null,
    metrics.age ? `Tuổi: ${metrics.age}` : null,
    metrics.gender ? `Giới tính: ${metrics.gender === "female" ? "Nữ" : "Nam"}` : null,
    metrics.bodyFat ? `Mỡ cơ thể: ${metrics.bodyFat}%` : null,
    leanMass ? `Khối lượng nạc: ${leanMass} kg` : null,
    bmi ? `BMI: ${bmi}` : null,
    bmr ? `BMR (trao đổi chất cơ bản): ${bmr} kcal/ngày` : null,
    metrics.muscle ? `Khối lượng cơ: ${metrics.muscle} kg` : null,
  ].filter(Boolean).join("\n");

  const prompt = `Bạn là chuyên gia dinh dưỡng thể thao. Dựa trên chỉ số cơ thể dưới đây, hãy tạo kế hoạch dinh dưỡng tối ưu cho mục tiêu tăng cơ giảm mỡ (body recomposition).

Chỉ số cơ thể:
${metricsText}

Trả về DUY NHẤT JSON hợp lệ, KHÔNG có markdown:
{
  "workoutDay": {
    "calories": 2400,
    "protein": 180,
    "carbs": 260,
    "fat": 65,
    "explanation": "Lý do ngắn gọn (1-2 câu) tại sao chọn các con số này cho ngày tập"
  },
  "restDay": {
    "calories": 2000,
    "protein": 175,
    "carbs": 180,
    "fat": 65,
    "explanation": "Lý do ngắn gọn cho ngày nghỉ"
  }
}`;

  const completion = await groq.chat.completions.create({
    model,
    temperature: 0.3,
    messages: [{ role: "user", content: prompt }],
  });

  const text = (completion.choices[0]?.message?.content ?? "").trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("AI không trả về kế hoạch hợp lệ. Vui lòng thử lại.");

  const parsed = JSON.parse(jsonMatch[0]);

  function parsePlan(p: Record<string, unknown>) {
    return {
      calories: Math.round(Number(p.calories) || 0),
      protein: Math.round(Number(p.protein) || 0),
      carbs: Math.round(Number(p.carbs) || 0),
      fat: Math.round(Number(p.fat) || 0),
      explanation: String(p.explanation ?? ""),
    };
  }

  return {
    workoutDay: parsePlan(parsed.workoutDay as Record<string, unknown>),
    restDay: parsePlan(parsed.restDay as Record<string, unknown>),
  };
}

// ===================== EXERCISE PROGRESS ANALYSIS =====================

export type ExerciseSessionData = {
  date: string; // dd/MM/yyyy
  volume: number; // weight × reps summed across sets
  e1rm: number; // best estimated 1RM in the session
  maxWeight: number;
  totalSets: number;
  totalReps: number;
};

export type ExerciseAnalysisResult = {
  summary: string;
  suggestions: string[];
  warnings: string[];
};

export async function analyzeExerciseData(
  exerciseName: string,
  sessions: ExerciseSessionData[]
): Promise<ExerciseAnalysisResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY chưa được cấu hình");

  const proxyUrl =
    process.env.HTTPS_PROXY ||
    process.env.HTTP_PROXY ||
    process.env.https_proxy ||
    process.env.http_proxy;

  let fetchFn: typeof globalThis.fetch | undefined;
  if (proxyUrl) {
    const proxyAgent = new ProxyAgent(proxyUrl);
    fetchFn = (input, init) =>
      globalThis.fetch(input, { ...(init ?? {}), dispatcher: proxyAgent } as RequestInit);
  }

  const groq = new Groq({ apiKey, ...(fetchFn ? { fetch: fetchFn } : {}) });
  const model = process.env.GROQ_MODEL ?? "meta-llama/llama-4-scout-17b-16e-instruct";

  // Build data table for the prompt
  const dataTable = sessions
    .map(
      (s) =>
        `${s.date} | Volume: ${s.volume}kg | e1RM: ${s.e1rm}kg | Max: ${s.maxWeight}kg | ${s.totalSets} sets × ${s.totalReps} reps`
    )
    .join("\n");

  const totalSessions = sessions.length;
  const firstDate = sessions[0]?.date ?? "N/A";
  const lastDate = sessions[sessions.length - 1]?.date ?? "N/A";

  const prompt = `Bạn là huấn luyện viên thể hình chuyên nghiệp. Hãy phân tích tiến độ bài tập "${exerciseName}" dựa trên dữ liệu sau.

## Dữ liệu (${totalSessions} buổi tập, từ ${firstDate} đến ${lastDate}):
${dataTable}

## Yêu cầu phân tích:
1. **summary**: Viết 1-2 câu nhận xét tổng quan về xu hướng hiệu suất (tăng/giảm/plateau). Dùng ngôn ngữ tích cực, khuyến khích. Viết bằng tiếng Việt.
2. **suggestions**: Đưa ra 2-3 gợi ý cụ thể dựa trên nguyên tắc progressive overload:
   - Nếu volume đang tăng đều: khuyên tiếp tục
   - Nếu plateau (không thay đổi 3+ buổi): gợi ý tăng reps, weight, hoặc sets
   - Nếu giảm: khuyên kiểm tra recovery, sleep, nutrition
   - Gợi ý con số cụ thể nếu có thể (VD: "thử tăng 2.5kg cho set đầu tiên")
3. **warnings**: Cảnh báo nếu phát hiện:
   - Volume giảm liên tục
   - Không tập bài này > 2 tuần
   - Tần suất tập quá dày hoặc quá thưa
   - Nếu không có cảnh báo, trả mảng rỗng

Trả về DUY NHẤT JSON hợp lệ, KHÔNG markdown, KHÔNG backtick:
{
  "summary": "...",
  "suggestions": ["...", "..."],
  "warnings": ["..."]
}`;

  const completion = await groq.chat.completions.create({
    model,
    temperature: 0.3,
    messages: [{ role: "user", content: prompt }],
  });

  const text = (completion.choices[0]?.message?.content ?? "").trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("AI không trả về phân tích hợp lệ. Vui lòng thử lại.");

  const parsed = JSON.parse(jsonMatch[0]);

  return {
    summary: String(parsed.summary ?? "Không đủ dữ liệu để phân tích."),
    suggestions: Array.isArray(parsed.suggestions)
      ? parsed.suggestions.map((s: unknown) => String(s))
      : [],
    warnings: Array.isArray(parsed.warnings)
      ? parsed.warnings.map((w: unknown) => String(w))
      : [],
  };
}
