import { NextRequest, NextResponse } from "next/server";
import { TaskPriority } from "@/types/task";

export interface OtayoriEvent {
  date: string;
  title: string;
  assignee: string;
  reason: string;
}

export interface OtayoriSuggestedTask {
  title: string;
  priority: TaskPriority;
  memo: string;
}

export interface OtayoriAnalysis {
  title: string;
  summary: string;
  events: OtayoriEvent[];
  items_to_bring: string[];
  cost: string;
  grandparent_summary: string[];
  suggested_tasks: OtayoriSuggestedTask[];
}

type OtayoriErrorCode =
  | "INVALID_JSON"
  | "MISSING_INPUT"
  | "INVALID_IMAGE"
  | "MISSING_API_KEY"
  | "RATE_LIMITED"
  | "UPSTREAM_TIMEOUT"
  | "UPSTREAM_UNREACHABLE"
  | "UPSTREAM_ERROR"
  | "INVALID_AI_OUTPUT"
  | "INTERNAL_ERROR";

const GEMINI_MODEL = "gemini-3.8-flash";
const GEMINI_TIMEOUT_MS = 35_000;
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);
// 5 MB binary ≈ 6.67 MB base64
const MAX_IMAGE_BASE64_LENGTH = 7_000_000;

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    title: { type: "STRING" },
    summary: { type: "STRING" },
    events: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          date: { type: "STRING" },
          title: { type: "STRING" },
          assignee: { type: "STRING" },
          reason: { type: "STRING" },
        },
        required: ["date", "title", "assignee", "reason"],
      },
    },
    items_to_bring: {
      type: "ARRAY",
      items: { type: "STRING" },
    },
    cost: { type: "STRING" },
    grandparent_summary: {
      type: "ARRAY",
      items: { type: "STRING" },
    },
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
    "events",
    "items_to_bring",
    "cost",
    "grandparent_summary",
    "suggested_tasks",
  ],
};

function errorResponse(code: OtayoriErrorCode, error: string, status: number) {
  return NextResponse.json({ error, code }, { status });
}

function isTimeoutError(err: unknown): boolean {
  return (
    err instanceof Error &&
    (err.name === "TimeoutError" || err.name === "AbortError")
  );
}

async function safeParseJson(res: Response): Promise<Record<string, unknown> | null> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function buildPrompt(sourceText: string, familyRoles: string): string {
  return [
    "あなたは共働き・三世代家庭を支える優秀な家族秘書AI「おたよりバトン」です。",
    "学校のおたより・自治体の通知・お薬手帳などの画像やテキストを読み取り、家族全員で負担を分け合える構造化JSONを作成してください。",
    "",
    "【出力ルール】",
    "- title: お知らせのわかりやすい件名（日本語・25文字以内目安）",
    "- summary: 全体像を家族向けに簡潔にまとめた要約（2文程度）",
    "- events: 重要な予定・締切・送迎などのリスト（3〜5件）。date は 'YYYY-MM-DD' または '11/28(金) 8:15' など分かりやすい表記。assignee は必ず「母」「父」「祖母」のいずれか1つを選び、家族の役割分担に沿ってバランスよく振り分ける。reason はその担当にした理由を短く書く。",
    "- items_to_bring: 持ち物や準備物のリスト（該当なしなら空配列）",
    "- cost: 集金・費用の金額と支払期限（該当なしなら「なし」）",
    "- grandparent_summary: おばあちゃん（高齢者）向けの「やさしい日本語の3行要約」（必ず3要素の配列）。専門用語やカタカナを避け、大きく読みやすい短い文で「いつ・なにがあるか・お願いしたいこと」を温かく伝える。",
    "- suggested_tasks: Google カレンダー・スプレッドシートに登録するための具体的な家族タスク（3〜4件）。title の先頭に【母】【父】【祖母】のように担当者を明記し、priority は high / medium / low から選ぶ。",
    "",
    familyRoles
      ? `【家族の役割・予定の目安】\n${familyRoles}`
      : "【家族の役割・予定の目安】\n母：平日朝の準備・持ち物確認 / 父：水曜は早帰り・提出物や集金担当 / 祖母：金曜の送迎・見守り担当",
    sourceText ? `\n【おたより・通知のテキスト】\n${sourceText}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function normalizeAssignee(raw: unknown): string {
  const s = String(raw ?? "").trim();
  if (s.includes("父") || s.includes("パパ")) return "父";
  if (s.includes("祖母") || s.includes("ばあ") || s.includes("祖父")) return "祖母";
  return "母";
}

function normalizeOtayori(parsed: unknown): OtayoriAnalysis {
  if (!parsed || typeof parsed !== "object") {
    throw new Error("AI の出力が有効なオブジェクトではありませんでした。");
  }
  const obj = parsed as Record<string, unknown>;
  if (typeof obj.title !== "string" || typeof obj.summary !== "string") {
    throw new Error("AI の出力に必須項目（title / summary）が不足しています。");
  }

  const events: OtayoriEvent[] = Array.isArray(obj.events)
    ? obj.events.map((item) => {
        const e = (item ?? {}) as Record<string, unknown>;
        return {
          date: String(e.date ?? "日程未定"),
          title: String(e.title ?? ""),
          assignee: normalizeAssignee(e.assignee),
          reason: String(e.reason ?? "家族の予定に合わせて提案"),
        };
      })
    : [];

  const items_to_bring = Array.isArray(obj.items_to_bring)
    ? obj.items_to_bring.map((x) => String(x ?? "").trim()).filter(Boolean)
    : [];

  const cost =
    typeof obj.cost === "string" && obj.cost.trim() ? obj.cost.trim() : "なし";

  const rawGrandparent = Array.isArray(obj.grandparent_summary)
    ? obj.grandparent_summary.map((x) => String(x ?? "").trim()).filter(Boolean)
    : [];
  const grandparent_summary =
    rawGrandparent.length > 0
      ? rawGrandparent.slice(0, 3)
      : [
          `${obj.title}のお知らせが届きました。`,
          obj.summary,
          "むりのない範囲で、いつもありがとうございます。",
        ];

  const suggested_tasks: OtayoriSuggestedTask[] = Array.isArray(obj.suggested_tasks)
    ? obj.suggested_tasks.map((item) => {
        const t = (item ?? {}) as Record<string, unknown>;
        const priority: TaskPriority =
          t.priority === "high" || t.priority === "medium" || t.priority === "low"
            ? t.priority
            : "medium";
        return {
          title: String(t.title ?? ""),
          priority,
          memo: String(t.memo ?? ""),
        };
      })
    : [];

  return {
    title: obj.title.trim(),
    summary: obj.summary.trim(),
    events,
    items_to_bring,
    cost,
    grandparent_summary,
    suggested_tasks,
  };
}

function extractJsonObject(raw: string): OtayoriAnalysis {
  const trimmed = raw.trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start !== -1 && end > start) {
      parsed = JSON.parse(trimmed.slice(start, end + 1));
    } else {
      throw new Error("AI の出力を JSON として解析できませんでした。");
    }
  }
  return normalizeOtayori(parsed);
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    const parsed = await request.json();
    if (!parsed || typeof parsed !== "object") {
      return errorResponse("INVALID_JSON", "リクエスト JSON が不正です。", 400);
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return errorResponse("INVALID_JSON", "リクエスト JSON の解析に失敗しました。", 400);
  }

  const sourceText =
    typeof body.sourceText === "string" ? body.sourceText.trim() : "";
  const familyRoles =
    typeof body.familyRoles === "string" ? body.familyRoles.trim() : "";
  const imageBase64 =
    typeof body.imageBase64 === "string" ? body.imageBase64.trim() : "";
  const imageMimeType =
    typeof body.imageMimeType === "string" ? body.imageMimeType.trim() : "";

  if (!sourceText && !imageBase64) {
    return errorResponse(
      "MISSING_INPUT",
      "おたよりの画像またはテキストを入力してください。",
      400
    );
  }

  if (imageBase64) {
    if (!ALLOWED_IMAGE_MIME_TYPES.has(imageMimeType)) {
      return errorResponse(
        "INVALID_IMAGE",
        "対応していない画像形式です。PNG / JPEG / WebP を選択してください。",
        400
      );
    }
    if (imageBase64.length > MAX_IMAGE_BASE64_LENGTH) {
      return errorResponse(
        "INVALID_IMAGE",
        "画像サイズが大きすぎます（5MB 以下にしてください）。",
        400
      );
    }
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return errorResponse(
      "MISSING_API_KEY",
      "環境変数 GEMINI_API_KEY が設定されていません。.env.local に Google AI Studio の API キーを設定してください。",
      500
    );
  }

  const prompt = buildPrompt(sourceText, familyRoles);
  const parts: Array<Record<string, unknown>> = [{ text: prompt }];
  if (imageBase64 && imageMimeType) {
    parts.push({
      inline_data: {
        mime_type: imageMimeType,
        data: imageBase64,
      },
    });
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    GEMINI_MODEL
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  let geminiRes: Response;
  try {
    geminiRes = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.25,
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
        },
      }),
    });
  } catch (err) {
    if (isTimeoutError(err)) {
      return errorResponse(
        "UPSTREAM_TIMEOUT",
        `Gemini API (${GEMINI_MODEL}) の応答がタイムアウトしました。再度お試しください。`,
        504
      );
    }
    return errorResponse(
      "UPSTREAM_UNREACHABLE",
      "Gemini API に接続できませんでした。ネットワーク接続を確認してください。",
      502
    );
  }

  const geminiJson = await safeParseJson(geminiRes);
  if (!geminiRes.ok) {
    if (geminiRes.status === 429) {
      return errorResponse(
        "RATE_LIMITED",
        "Gemini API のレート制限に達しました。数秒待ってから再度お試しください。",
        429
      );
    }
    const upstreamErr = (geminiJson?.error as Record<string, unknown> | undefined)
      ?.message;
    const msg =
      typeof upstreamErr === "string" && upstreamErr
        ? upstreamErr
        : `Gemini API の呼び出しに失敗しました (HTTP ${geminiRes.status})。`;
    return errorResponse("UPSTREAM_ERROR", msg, 502);
  }

  const candidates = geminiJson?.candidates as
    | Array<Record<string, unknown>>
    | undefined;
  const content = candidates?.[0]?.content as Record<string, unknown> | undefined;
  const contentParts = content?.parts as Array<Record<string, unknown>> | undefined;
  const rawText = contentParts?.[0]?.text;

  if (typeof rawText !== "string" || !rawText.trim()) {
    return errorResponse(
      "INVALID_AI_OUTPUT",
      "Gemini API から解析結果を取得できませんでした。",
      502
    );
  }

  try {
    const analysis = extractJsonObject(rawText);
    return NextResponse.json({
      analysis,
      usedModel: GEMINI_MODEL,
    });
  } catch (err) {
    return errorResponse(
      "INVALID_AI_OUTPUT",
      err instanceof Error ? err.message : "AI 出力の解析に失敗しました。",
      502
    );
  }
}
