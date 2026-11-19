import { NextRequest, NextResponse } from "next/server";
import { SHOWCASE_APPS, ShowcaseAppId } from "@/lib/showcaseConfigs";

const GEMINI_MODEL = "gemini-3.8-flash";
const GEMINI_TIMEOUT_MS = 35_000;

const SHOWCASE_SCHEMA = {
  type: "OBJECT",
  properties: {
    title: { type: "STRING" },
    summary: { type: "STRING" },
    alert_level: { type: "STRING", enum: ["high", "medium", "low"] },
    alert_title: { type: "STRING" },
    alert_message: { type: "STRING" },
    items: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          label: { type: "STRING" },
          badge: { type: "STRING" },
          detail: { type: "STRING" },
        },
        required: ["label", "badge", "detail"],
      },
    },
    checklist: {
      type: "ARRAY",
      items: { type: "STRING" },
    },
    copyable_draft: { type: "STRING" },
    suggested_tasks: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING" },
          priority: { type: "STRING", enum: ["high", "medium", "low"] },
          memo: { type: "STRING" },
        },
        required: ["title", "priority", "memo"],
      },
    },
  },
  required: [
    "title",
    "summary",
    "alert_level",
    "alert_title",
    "alert_message",
    "items",
    "checklist",
    "copyable_draft",
    "suggested_tasks",
  ],
};

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY が設定されていません。", code: "MISSING_API_KEY" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const appId = body?.appId as ShowcaseAppId;
    const config = SHOWCASE_APPS[appId];
    if (!config) {
      return NextResponse.json(
        { error: "不正なアプリ指定です。", code: "INVALID_APP" },
        { status: 400 }
      );
    }

    const sourceText = typeof body?.sourceText === "string" ? body.sourceText.trim() : "";
    const locationText = typeof body?.locationText === "string" ? body.locationText.trim() : "";
    const imageBase64 = typeof body?.imageBase64 === "string" ? body.imageBase64 : "";
    const imageMimeType = typeof body?.imageMimeType === "string" ? body.imageMimeType : "";

    if (!sourceText && !imageBase64) {
      return NextResponse.json(
        { error: "写真またはテキストを入力してください。", code: "MISSING_INPUT" },
        { status: 400 }
      );
    }

    const prompt = [
      config.systemInstruction,
      "",
      locationText ? `【場所・位置情報】\n${locationText}` : "",
      sourceText ? `【ユーザー入力】\n${sourceText}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const parts: Array<Record<string, unknown>> = [{ text: prompt }];
    if (imageBase64 && imageMimeType) {
      parts.push({
        inline_data: {
          mime_type: imageMimeType,
          data: imageBase64,
        },
      });
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(
      apiKey
    )}`;

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.3,
          responseMimeType: "application/json",
          responseSchema: SHOWCASE_SCHEMA,
        },
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        {
          error: data?.error?.message || "Gemini API の呼び出しに失敗しました。",
          code: res.status === 429 ? "RATE_LIMITED" : "UPSTREAM_ERROR",
        },
        { status: res.status === 429 ? 429 : 502 }
      );
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return NextResponse.json(
        { error: "Gemini API から解析結果を取得できませんでした。", code: "INVALID_AI_OUTPUT" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      result: JSON.parse(text),
      usedModel: GEMINI_MODEL,
    });
  } catch (err) {
    console.error("API /api/showcase error:", err);
    return NextResponse.json(
      { error: "解析中に予期しないエラーが発生しました。", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
