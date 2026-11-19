import { NextRequest, NextResponse } from "next/server";
import { StudyAnalysis } from "@/types/study";
import { TaskPriority } from "@/types/task";

type AnalyzeProvider = "gemini" | "ollama" | "xestrata";

const ALLOWED_GEMINI_MODELS = [
  "gemini-3.8-flash",
  "gemini-4-hydrogen",
] as const;

type GeminiModel = (typeof ALLOWED_GEMINI_MODELS)[number];

type AnalyzeErrorCode =
  | "INVALID_JSON"
  | "MISSING_INPUT"
  | "INVALID_IMAGE"
  | "UNSUPPORTED_MODEL"
  | "IMAGE_UNSUPPORTED_LOCAL"
  | "MISSING_API_KEY"
  | "RATE_LIMITED"
  | "UPSTREAM_TIMEOUT"
  | "UPSTREAM_UNREACHABLE"
  | "UPSTREAM_ERROR"
  | "INVALID_AI_OUTPUT"
  | "INTERNAL_ERROR";

const DEFAULT_GEMINI_MODEL: GeminiModel = "gemini-3.8-flash";
const DEFAULT_OLLAMA_BASE_URL = "http://127.0.0.1:11434";
const DEFAULT_OLLAMA_MODEL = "llama3.2";
const DEFAULT_XESTRATA_BASE_URL = "http://127.0.0.1:8080";
const DEFAULT_XESTRATA_MODEL = "local-xestrata";

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);
// 5 MB binary ≈ 6.67 MB base64
const MAX_IMAGE_BASE64_LENGTH = 7_000_000;

const GEMINI_TIMEOUT_MS = 35_000;
const LOCAL_LLM_TIMEOUT_MS = 60_000;

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    topic_title: { type: "STRING" },
    summary: { type: "STRING" },
    prerequisites: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          concept: { type: "STRING" },
          why_needed: { type: "STRING" },
          quick_refresher: { type: "STRING" },
        },
        required: ["concept", "why_needed", "quick_refresher"],
      },
    },
    steps: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          step_title: { type: "STRING" },
          explanation: { type: "STRING" },
          common_pitfall: { type: "STRING" },
        },
        required: ["step_title", "explanation", "common_pitfall"],
      },
    },
    quiz: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          question: { type: "STRING" },
          choices: { type: "ARRAY", items: { type: "STRING" } },
          correct_index: { type: "INTEGER" },
          explanation: { type: "STRING" },
          related_prerequisite_index: { type: "INTEGER" },
        },
        required: [
          "question",
          "choices",
          "correct_index",
          "explanation",
          "related_prerequisite_index",
        ],
      },
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
    next_topics: {
      type: "ARRAY",
      items: { type: "STRING" },
    },
  },
  required: [
    "topic_title",
    "summary",
    "prerequisites",
    "steps",
    "quiz",
    "suggested_tasks",
    "next_topics",
  ],
};

function errorResponse(code: AnalyzeErrorCode, error: string, status: number) {
  return NextResponse.json({ error, code }, { status });
}

function resolveProvider(raw: unknown): AnalyzeProvider {
  if (raw === "ollama") return "ollama";
  if (raw === "xestrata") return "xestrata";
  return "gemini";
}

function isAllowedGeminiModel(value: string): value is GeminiModel {
  return (ALLOWED_GEMINI_MODELS as readonly string[]).includes(value);
}

function buildPrompt(sourceText: string, question: string, strictJsonHint: boolean): string {
  return [
    "あなたは数式・論文・専門書の学習を支援する優秀なチューターです。",
    "ユーザーが提示した教材と疑問点を分析し、以下の構造化データを作成してください。",
    "- topic_title: この教材の簡潔なテーマ名（日本語）",
    "- summary: 全体が何を述べているかのわかりやすい要約（2〜3文）",
    "- prerequisites: 理解するために必要な前提知識（2〜3個）。抜け漏れやすいポイントと短いおさらいを含める。",
    "- steps: 段階的な理解ステップ（3個）。直感的な説明と、よくある誤解（common_pitfall）を含める。",
    "- quiz: 理解度チェック用の4択演習問題（2問）。correct_index は 0〜3 の整数、related_prerequisite_index は間違えたときに立ち返るべき prerequisites のインデックス（0始まり）を指定。",
    "- suggested_tasks: 学習者が次に取り組むべき具体的な復習タスク（2〜3個）。priority は high / medium / low のいずれか。",
    "- next_topics: このテーマを理解した次に進むと良い発展トピック（2〜3個の短い語句）。",
    strictJsonHint
      ? '必ず有効な JSON オブジェクトのみを出力してください（Markdown のコードブロックや前後の説明文は不要）。キー名は "topic_title", "summary", "prerequisites" (concept, why_needed, quick_refresher), "steps" (step_title, explanation, common_pitfall), "quiz" (question, choices, correct_index, explanation, related_prerequisite_index), "suggested_tasks" (title, priority, memo), "next_topics" とすること。'
      : "",
    "",
    sourceText ? `【入力テキスト・数式】\n${sourceText}` : "",
    question ? `【ユーザーの疑問点・つまずき】\n${question}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function normalizeAnalysis(parsed: unknown): StudyAnalysis {
  if (!parsed || typeof parsed !== "object") {
    throw new Error("AI の出力が有効なオブジェクトではありませんでした。");
  }
  const obj = parsed as Record<string, unknown>;
  if (typeof obj.topic_title !== "string" || typeof obj.summary !== "string") {
    throw new Error("AI の出力に必須項目（topic_title / summary）が不足しています。");
  }

  const prerequisites = Array.isArray(obj.prerequisites)
    ? obj.prerequisites.map((item) => {
        const p = (item ?? {}) as Record<string, unknown>;
        return {
          concept: String(p.concept ?? ""),
          why_needed: String(p.why_needed ?? ""),
          quick_refresher: String(p.quick_refresher ?? ""),
        };
      })
    : [];

  const steps = Array.isArray(obj.steps)
    ? obj.steps.map((item) => {
        const s = (item ?? {}) as Record<string, unknown>;
        return {
          step_title: String(s.step_title ?? ""),
          explanation: String(s.explanation ?? ""),
          common_pitfall: String(s.common_pitfall ?? ""),
        };
      })
    : [];

  const quiz = Array.isArray(obj.quiz)
    ? obj.quiz.map((item) => {
        const q = (item ?? {}) as Record<string, unknown>;
        const choices = Array.isArray(q.choices) ? q.choices.map(String) : [];
        const rawCorrect = Number(q.correct_index);
        const correct_index =
          Number.isInteger(rawCorrect) && rawCorrect >= 0 && rawCorrect < Math.max(choices.length, 1)
            ? rawCorrect
            : 0;
        const rawRel = q.related_prerequisite_index;
        const related_prerequisite_index =
          typeof rawRel === "number" &&
          Number.isInteger(rawRel) &&
          rawRel >= 0 &&
          rawRel < prerequisites.length
            ? rawRel
            : undefined;
        return {
          question: String(q.question ?? ""),
          choices,
          correct_index,
          explanation: String(q.explanation ?? ""),
          ...(related_prerequisite_index !== undefined ? { related_prerequisite_index } : {}),
        };
      })
    : [];

  const suggested_tasks = Array.isArray(obj.suggested_tasks)
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

  const next_topics = Array.isArray(obj.next_topics)
    ? obj.next_topics.map(String).filter(Boolean)
    : [];

  return {
    topic_title: obj.topic_title,
    summary: obj.summary,
    prerequisites,
    steps,
    quiz,
    suggested_tasks,
    next_topics,
  };
}

function extractJsonObject(raw: string): StudyAnalysis {
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
  return normalizeAnalysis(parsed);
}

async function safeParseJson(res: Response): Promise<Record<string, unknown> | null> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function isTimeoutError(err: unknown): boolean {
  return (
    err instanceof Error &&
    (err.name === "TimeoutError" || err.name === "AbortError")
  );
}

async function analyzeWithGemini(
  sourceText: string,
  question: string,
  imageBase64: string,
  imageMimeType: string,
  geminiModel: GeminiModel
) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return errorResponse(
      "MISSING_API_KEY",
      "環境変数 GEMINI_API_KEY が設定されていません。.env.local に Google AI Studio の API キーを設定してください。",
      500
    );
  }

  const prompt = buildPrompt(sourceText, question, false);
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
    geminiModel
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
          temperature: 0.3,
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
        },
      }),
    });
  } catch (err) {
    if (isTimeoutError(err)) {
      return errorResponse(
        "UPSTREAM_TIMEOUT",
        `Gemini API (${geminiModel}) の応答がタイムアウトしました。再度お試しください。`,
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
        `Gemini API (${geminiModel}) のレート制限に達しました。数秒待つか、ローカル Ollama に切り替えてください。`,
        429
      );
    }
    const upstreamErr = (geminiJson?.error as Record<string, unknown> | undefined)?.message;
    const msg =
      typeof upstreamErr === "string" && upstreamErr
        ? upstreamErr
        : `Gemini API (${geminiModel}) の呼び出しに失敗しました (HTTP ${geminiRes.status})。`;
    return errorResponse("UPSTREAM_ERROR", msg, 502);
  }

  const candidates = geminiJson?.candidates as Array<Record<string, unknown>> | undefined;
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

  let analysis: StudyAnalysis;
  try {
    analysis = extractJsonObject(rawText);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Gemini API の応答形式が不正です。";
    return errorResponse("INVALID_AI_OUTPUT", msg, 502);
  }

  return NextResponse.json({
    analysis,
    usedProvider: "gemini" as const,
    usedModel: geminiModel,
  });
}

interface OpenAICompatConfig {
  provider: "ollama" | "xestrata";
  displayName: string;
  baseUrl: string;
  model: string;
  useJsonResponseFormat: boolean;
}

async function analyzeWithOpenAICompat(
  sourceText: string,
  question: string,
  hasImage: boolean,
  config: OpenAICompatConfig
) {
  if (hasImage && !sourceText) {
    return errorResponse(
      "IMAGE_UNSUPPORTED_LOCAL",
      `ローカルの ${config.displayName} サーバーはテキスト解析向けです。画像解析を行う場合は「Gemini API」を選択してください。`,
      400
    );
  }

  const baseUrl = config.baseUrl.replace(/\/+$/, "");
  const prompt = buildPrompt(sourceText, question, true);

  const payload: Record<string, unknown> = {
    model: config.model,
    temperature: 0.3,
    messages: [
      {
        role: "system",
        content: "You are a helpful math and science tutor that outputs only valid JSON.",
      },
      { role: "user", content: prompt },
    ],
  };
  if (config.useJsonResponseFormat) {
    payload.response_format = { type: "json_object" };
  }

  let res: Response;
  try {
    res = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(LOCAL_LLM_TIMEOUT_MS),
      body: JSON.stringify(payload),
    });
  } catch (err) {
    if (isTimeoutError(err)) {
      return errorResponse(
        "UPSTREAM_TIMEOUT",
        `ローカルの ${config.displayName} サーバー (${baseUrl}) の応答がタイムアウトしました。`,
        504
      );
    }
    return errorResponse(
      "UPSTREAM_UNREACHABLE",
      `ローカルの ${config.displayName} サーバー (${baseUrl}) に接続できません。サーバーが起動しているか確認してください。`,
      502
    );
  }

  const data = await safeParseJson(res);
  if (!res.ok) {
    const upstreamErr = (data?.error as Record<string, unknown> | undefined)?.message;
    const msg =
      typeof upstreamErr === "string" && upstreamErr
        ? upstreamErr
        : `${config.displayName} サーバーの呼び出しに失敗しました (HTTP ${res.status})。`;
    return errorResponse("UPSTREAM_ERROR", msg, 502);
  }

  const choices = data?.choices as Array<Record<string, unknown>> | undefined;
  const message = choices?.[0]?.message as Record<string, unknown> | undefined;
  const content = message?.content;
  if (typeof content !== "string" || !content.trim()) {
    return errorResponse(
      "INVALID_AI_OUTPUT",
      `${config.displayName} サーバーから有効な応答が得られませんでした。`,
      502
    );
  }

  let analysis: StudyAnalysis;
  try {
    analysis = extractJsonObject(content);
  } catch (err) {
    const msg =
      err instanceof Error
        ? err.message
        : `${config.displayName} の出力を JSON として解析できませんでした。`;
    return errorResponse("INVALID_AI_OUTPUT", msg, 502);
  }

  return NextResponse.json({
    analysis,
    usedProvider: config.provider,
    usedModel: config.model,
  });
}

export async function POST(request: NextRequest) {
  try {
    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return errorResponse(
        "INVALID_JSON",
        "リクエスト本文が有効な JSON ではありません。",
        400
      );
    }

    const provider = resolveProvider(body?.provider);
    const sourceText = typeof body?.sourceText === "string" ? body.sourceText.trim() : "";
    const question = typeof body?.question === "string" ? body.question.trim() : "";
    const imageBase64 = typeof body?.imageBase64 === "string" ? body.imageBase64 : "";
    const imageMimeType = typeof body?.imageMimeType === "string" ? body.imageMimeType : "";

    if (!sourceText && !imageBase64) {
      return errorResponse(
        "MISSING_INPUT",
        "数式・論文テキスト、またはノート／専門書の画像をアップロードしてください。",
        400
      );
    }

    if (imageBase64) {
      if (imageBase64.length > MAX_IMAGE_BASE64_LENGTH) {
        return errorResponse(
          "INVALID_IMAGE",
          "画像サイズが大きすぎます（上限 5MB）。圧縮するかテキスト入力をお試しください。",
          400
        );
      }
      if (imageMimeType && !ALLOWED_IMAGE_MIME_TYPES.has(imageMimeType)) {
        return errorResponse(
          "INVALID_IMAGE",
          `未対応の画像形式です (${imageMimeType})。PNG / JPEG / WebP / GIF をご利用ください。`,
          400
        );
      }
    }

    if (provider === "ollama") {
      return await analyzeWithOpenAICompat(sourceText, question, Boolean(imageBase64), {
        provider: "ollama",
        displayName: "Ollama",
        baseUrl: process.env.OLLAMA_BASE_URL || DEFAULT_OLLAMA_BASE_URL,
        model: process.env.OLLAMA_MODEL || DEFAULT_OLLAMA_MODEL,
        useJsonResponseFormat: true,
      });
    }

    if (provider === "xestrata") {
      return await analyzeWithOpenAICompat(sourceText, question, Boolean(imageBase64), {
        provider: "xestrata",
        displayName: "XeStrata",
        baseUrl: process.env.XESTRATA_BASE_URL || DEFAULT_XESTRATA_BASE_URL,
        model: DEFAULT_XESTRATA_MODEL,
        useJsonResponseFormat: false,
      });
    }

    const rawGeminiModel =
      typeof body?.geminiModel === "string" ? body.geminiModel.trim() : "";
    let geminiModel: GeminiModel = DEFAULT_GEMINI_MODEL;
    if (rawGeminiModel) {
      if (!isAllowedGeminiModel(rawGeminiModel)) {
        return errorResponse(
          "UNSUPPORTED_MODEL",
          `未対応の Gemini モデルです: "${rawGeminiModel}"。選択可能: ${ALLOWED_GEMINI_MODELS.join(", ")}`,
          400
        );
      }
      geminiModel = rawGeminiModel;
    }

    return await analyzeWithGemini(
      sourceText,
      question,
      imageBase64,
      imageMimeType,
      geminiModel
    );
  } catch (error) {
    console.error("API /api/analyze error:", error);
    return errorResponse(
      "INTERNAL_ERROR",
      "教材の解析中に予期しないエラーが発生しました。",
      500
    );
  }
}
