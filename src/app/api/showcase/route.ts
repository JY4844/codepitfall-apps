import { NextRequest, NextResponse } from "next/server";
import { SHOWCASE_APPS, ShowcaseAppId } from "@/lib/showcaseConfigs";

const GEMINI_MODEL = "gemini-3.8-flash";
const GEMINI_TIMEOUT_MS = 10_000;
const OLLAMA_TIMEOUT_MS = 60_000;
const DEFAULT_OLLAMA_BASE_URL = "http://127.0.0.1:11434";
const DEFAULT_OLLAMA_MODEL = "llama3.2-3b-32k:latest";

interface ShowcaseItem {
  label: string;
  badge: string;
  detail: string;
}

interface ShowcaseTask {
  title: string;
  priority: "high" | "medium" | "low";
  memo: string;
}

interface ShowcaseResult {
  title: string;
  summary: string;
  alert_level: "high" | "medium" | "low";
  alert_title: string;
  alert_message: string;
  items: ShowcaseItem[];
  checklist: string[];
  copyable_draft: string;
  suggested_tasks: ShowcaseTask[];
}

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

function normalizeResult(raw: unknown, fallbackTitle: string): ShowcaseResult {
  const obj = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const level =
    obj.alert_level === "high" || obj.alert_level === "medium" || obj.alert_level === "low"
      ? obj.alert_level
      : "medium";

  const items: ShowcaseItem[] = Array.isArray(obj.items)
    ? obj.items
        .map((it) => {
          const item = (typeof it === "object" && it !== null ? it : {}) as Record<string, unknown>;
          return {
            label: typeof item.label === "string" && item.label.trim() ? item.label.trim() : "項目",
            badge: typeof item.badge === "string" && item.badge.trim() ? item.badge.trim() : "確認",
            detail: typeof item.detail === "string" ? item.detail.trim() : "",
          };
        })
        .filter((it) => it.detail || it.label)
    : [];

  const checklist: string[] = Array.isArray(obj.checklist)
    ? obj.checklist.filter((c): c is string => typeof c === "string" && c.trim().length > 0)
    : [];

  const suggested_tasks: ShowcaseTask[] = Array.isArray(obj.suggested_tasks)
    ? obj.suggested_tasks
        .map((t) => {
          const task = (typeof t === "object" && t !== null ? t : {}) as Record<string, unknown>;
          const pr =
            task.priority === "high" || task.priority === "medium" || task.priority === "low"
              ? task.priority
              : "medium";
          return {
            title: typeof task.title === "string" ? task.title.trim() : "",
            priority: pr as "high" | "medium" | "low",
            memo: typeof task.memo === "string" ? task.memo.trim() : "",
          };
        })
        .filter((t) => t.title.length > 0)
    : [];

  return {
    title: typeof obj.title === "string" && obj.title.trim() ? obj.title.trim() : fallbackTitle,
    summary: typeof obj.summary === "string" ? obj.summary.trim() : "",
    alert_level: level,
    alert_title:
      typeof obj.alert_title === "string" && obj.alert_title.trim()
        ? obj.alert_title.trim()
        : "解析結果",
    alert_message: typeof obj.alert_message === "string" ? obj.alert_message.trim() : "",
    items,
    checklist,
    copyable_draft: typeof obj.copyable_draft === "string" ? obj.copyable_draft.trim() : "",
    suggested_tasks,
  };
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start !== -1 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("Invalid JSON from AI");
  }
}

async function tryOllamaFallback(
  prompt: string,
  fallbackTitle: string
): Promise<{ result: ShowcaseResult; usedModel: string }> {
  const baseUrl = (process.env.OLLAMA_BASE_URL || DEFAULT_OLLAMA_BASE_URL).replace(/\/+$/, "");
  const model = process.env.OLLAMA_MODEL || DEFAULT_OLLAMA_MODEL;

  const jsonPrompt = [
    prompt,
    "",
    "必ず以下のキーを持つ有効な JSON オブジェクトのみを日本語で出力してください（Markdown の ```json は不要）。",
    '{"title":"string","summary":"string","alert_level":"high|medium|low","alert_title":"string","alert_message":"string","items":[{"label":"string","badge":"string","detail":"string"}],"checklist":["string"],"copyable_draft":"string","suggested_tasks":[{"title":"string","priority":"high|medium|low","memo":"string"}]}',
  ].join("\n");

  const res = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(OLLAMA_TIMEOUT_MS),
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You are a helpful Japanese assistant that outputs only valid JSON." },
        { role: "user", content: jsonPrompt },
      ],
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || "Ollama fallback failed");
  }
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("Empty Ollama response");
  }
  return {
    result: normalizeResult(extractJson(content), fallbackTitle),
    usedModel: `ollama:${model}`,
  };
}

export async function POST(request: NextRequest) {
  try {
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

    const apiKey = process.env.GEMINI_API_KEY;
    let geminiFailureReason = "";

    if (apiKey) {
      try {
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
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (res.ok && text) {
          return NextResponse.json({
            result: normalizeResult(JSON.parse(text), config.name),
            usedModel: GEMINI_MODEL,
          });
        }
        geminiFailureReason = data?.error?.message || `HTTP ${res.status}`;
      } catch (err) {
        geminiFailureReason = err instanceof Error ? err.message : "Gemini request failed";
      }
    } else {
      geminiFailureReason = "GEMINI_API_KEY not configured";
    }

    // Fallback to local Ollama when Gemini is unavailable or high-demand
    if (sourceText) {
      try {
        const fallback = await tryOllamaFallback(prompt, config.name);
        return NextResponse.json(fallback);
      } catch (ollamaErr) {
        console.error("Ollama fallback error:", ollamaErr);
      }
    }

    return NextResponse.json(
      {
        error: geminiFailureReason || "AI の呼び出しに失敗しました。",
        code: "UPSTREAM_ERROR",
      },
      { status: 502 }
    );
  } catch (err) {
    console.error("API /api/showcase error:", err);
    return NextResponse.json(
      { error: "解析中に予期しないエラーが発生しました。", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
