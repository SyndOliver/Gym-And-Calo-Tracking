import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

export interface FoodItem {
  name: string;
  portion: string;
  calories: number;
}

export interface CalorieAnalysis {
  foods: FoodItem[];
  totalCalories: number;
  notes: string;
}

const PROMPT = `Bạn là chuyên gia dinh dưỡng. Hãy phân tích ảnh thức ăn này và ước tính calories.

Trả về JSON theo đúng format sau (chỉ JSON, không có text hay markdown):
{
  "foods": [
    {"name": "tên món ăn", "portion": "khẩu phần ước tính", "calories": số_calories}
  ],
  "totalCalories": tổng_calories,
  "notes": "ghi chú về độ chính xác hoặc thông tin thêm"
}

Lưu ý:
- Ước tính khẩu phần dựa trên hình ảnh (so sánh với vật thể tham chiếu nếu có)
- Dùng giá trị trung bình phổ biến cho thức ăn Việt Nam nếu có thể
- Nếu không nhận ra món ăn, ghi "Không xác định" và ước tính hợp lý`;

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY chưa được cấu hình" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { imageBase64, mimeType } = body as {
      imageBase64: string;
      mimeType: string;
    };

    if (!imageBase64 || !mimeType) {
      return NextResponse.json(
        { error: "Thiếu imageBase64 hoặc mimeType" },
        { status: 400 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const result = await model.generateContent([
      PROMPT,
      {
        inlineData: {
          data: imageBase64,
          mimeType: mimeType,
        },
      },
    ]);

    const text = result.response.text().trim();

    // Tách JSON ra khỏi markdown code block nếu có
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) ?? null;
    const jsonText = jsonMatch ? jsonMatch[1].trim() : text;

    const analysis = JSON.parse(jsonText) as CalorieAnalysis;

    return NextResponse.json(analysis);
  } catch (err) {
    console.error("[calories/analyze]", err);
    const message = err instanceof Error ? err.message : "Lỗi không xác định";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
