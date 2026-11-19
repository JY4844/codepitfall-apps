import { NextRequest, NextResponse } from "next/server";
import { TaskPriority } from "@/types/task";

const ALLOWED_GEMINI_MODELS = [
  "gemini-3.8-flash",
  "gemini-4-hydrogen",
] as const;

type GeminiModel = (typeof ALLOWED_GEMINI_MODELS)[number];

type MachiEyeErrorCode =
  | "INVALID_JSON"
  | "MISSING_INPUT"
  | "INVALID_IMAGE"
  | "UNSUPPORTED_MODEL"
  | "MISSING_API_KEY"
  | "RATE_LIMITED"
  | "UPSTREAM_TIMEOUT"
  | "UPSTREAM_UNREACHABLE"
  | "UPSTREAM_ERROR"
  | "INVALID_AI_OUTPUT"
  | "INTERNAL_ERROR";

interface MachiEyePrivacyCheck {
  has_face: boolean;
  has_license_plate: boolean;
  has_nameplate: boolean;
  warning_message: string;
}

interface MachiEyeTask {
  title: string;
  priority: TaskPriority;
  memo: string;
}

interface MachiEyeAnalysis {
  title: string;
  category: string;
  severity: number;
  department: string;
  report_draft: string;
  eco_disaster_impact: string;
  privacy_check: MachiEyePrivacyCheck;
  recommended_action: string;
  suggested_tasks: MachiEyeTask[];
}

const DEFAULT_GEMINI_MODEL: GeminiModel = "gemini-3.8-flash";
const GEMINI_TIMEOUT_MS = 35_000;
const MAX_IMAGE_BASE64_LENGTH = 7_000_000;
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    title: { type: "STRING" },
    category: { type: "STRING" },
    severity: { type: "INTEGER" },
    department: { type: "STRING" },
    report_draft: { type: "STRING" },
    eco_disaster_impact: { type: "STRING" },
    privacy_check: {
      type: "OBJECT",
      properties: {
        has_face: { type: "BOOLEAN" },
        has_license_plate: { type: "BOOLEAN" },
        has_nameplate: { type: "BOOLEAN" },
        warning_message: { type: "STRING" },
      },
      required: [
        "has_face",
        "has_license_plate",
        "has_nameplate",
        "warning_message",
      ],
    },
    recommended_action: { type: "STRING" },
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
    "category",
    "severity",
    "department",
    "report_draft",
    "eco_disaster_impact",
    "privacy_check",
    "recommended_action",
    "suggested_tasks",
  ],
};

function errorResponse(code: MachiEyeErrorCode, error: string, status: number) {
  return NextResponse.json({ error, code }, { status });
}

function isAllowedGeminiModel(value: string): value is GeminiModel {
  return (ALLOWED_GEMINI_MODELS as readonly string[]).includes(value);
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

function buildPrompt(
  sourceText: string,
  locationText: string,
  latitude: string,
  longitude: string
): string {
  const locationLines = [
    locationText ? `場所メモ: ${locationText}` : "",
    latitude && longitude ? `GPS座標: 緯度 ${latitude}, 経度 ${longitude}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return [
    "あなたは日本の自治体の防災・道路維持・環境保全を支援するシビックテック AI「MachiEye」です。",
    "住民が撮影した街の異変写真や現場メモ・位置情報をもとに、行政がすぐに対応できる構造化レポートと、地域公開前のプライバシーチェック結果を日本語で作成してください。",
    "",
    "出力フィールドのルール:",
    "- title: 現場の異変を簡潔に表す見出し（25〜40文字程度）",
    "- category: 「側溝詰まり・浸水リスク」「道路損傷・陥没」「不法投棄・環境汚染」「街灯・標識破損」「危険ブロック塀・倒木」「その他」のいずれか",
    "- severity: 緊急度を 1〜5 の整数で評価（1=軽微, 3=要確認, 5=直ちに危険・緊急対応必要）",
    "- department: 自治体で想定される担当部署名（例: 建設部 道路維持課、環境部 環境保全課 など）",
    "- report_draft: 自治体の通報フォームやメールにそのまま貼り付けて送れる丁寧な定型通報文（場所・座標がある場合は必ず含める）",
    "- eco_disaster_impact: 放置した場合の防災上・環境上の影響（例: 豪雨時の内水氾濫、プラスチックごみの河川・海洋流出など）",
    "- privacy_check: 写真（または状況記述）に人の顔（has_face）、車のナンバープレート（has_license_plate）、家の表札や個人住所（has_nameplate）が含まれるか厳密に判定し、warning_message に公開前の注意または安全確認メッセージを記載する",
    "- recommended_action: 通報した市民がその場で取るべき安全行動・避けるべき行動",
    "- suggested_tasks: 自治会・地域パトロールや住民が次に行うべき確認タスク（2〜3個）。priority は high / medium / low のいずれか",
    "",
    locationLines ? `【位置情報】\n${locationLines}` : "",
    sourceText ? `【住民の現場メモ・状況】\n${sourceText}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function normalizeResult(parsed: unknown): MachiEyeAnalysis {
  if (!parsed || typeof parsed !== "object") {
    throw new Error("AI の出力が有効なオブジェクトではありませんでした。");
  }
  const obj = parsed as Record<string, unknown>;
  if (typeof obj.title !== "string" || !obj.title.trim()) {
    throw new Error("AI の出力に必須項目（title）が不足しています。");
  }

  const rawSeverity = Number(obj.severity);
  const severity = Number.isFinite(rawSeverity)
    ? Math.min(5, Math.max(1, Math.round(rawSeverity)))
    : 3;

  const pc = (obj.privacy_check ?? {}) as Record<string, unknown>;
  const hasFace = Boolean(pc.has_face);
  const hasLicensePlate = Boolean(pc.has_license_plate);
  const hasNameplate = Boolean(pc.has_nameplate);
  const defaultWarning =
    hasFace || hasLicensePlate || hasNameplate
      ? "個人情報につながる要素が検出されました。地域マップへ公開する前にトリミングまたはモザイク処理を行ってください。"
      : "顔・ナンバープレート・表札の映り込みは検出されませんでした。地域マップへ安全に共有できます。";

  const suggested_tasks: MachiEyeTask[] = Array.isArray(obj.suggested_tasks)
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
    category: typeof obj.category === "string" && obj.category.trim() ? obj.category.trim() : "その他",
    severity,
    department:
      typeof obj.department === "string" && obj.department.trim()
        ? obj.department.trim()
        : "自治体 総合窓口（市民課・土木課）",
    report_draft: String(obj.report_draft ?? ""),
    eco_disaster_impact: String(obj.eco_disaster_impact ?? ""),
    privacy_check: {
      has_face: hasFace,
      has_license_plate: hasLicensePlate,
      has_nameplate: hasNameplate,
      warning_message:
        typeof pc.warning_message === "string" && pc.warning_message.trim()
          ? pc.warning_message.trim()
          : defaultWarning,
    },
    recommended_action: String(obj.recommended_action ?? ""),
    suggested_tasks,
  };
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

    const sourceText = typeof body?.sourceText === "string" ? body.sourceText.trim() : "";
    const locationText = typeof body?.locationText === "string" ? body.locationText.trim() : "";
    const latitude = typeof body?.latitude === "string" ? body.latitude.trim() : "";
    const longitude = typeof body?.longitude === "string" ? body.longitude.trim() : "";
    const imageBase64 = typeof body?.imageBase64 === "string" ? body.imageBase64 : "";
    const imageMimeType = typeof body?.imageMimeType === "string" ? body.imageMimeType : "";

    if (!sourceText && !imageBase64) {
      return errorResponse(
        "MISSING_INPUT",
        "現場の写真、または状況メモを入力してください。",
        400
      );
    }

    if (imageBase64) {
      if (imageBase64.length > MAX_IMAGE_BASE64_LENGTH) {
        return errorResponse(
          "INVALID_IMAGE",
          "画像サイズが大きすぎます（上限 5MB）。縮小して再度お試しください。",
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

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return errorResponse(
        "MISSING_API_KEY",
        "環境変数 GEMINI_API_KEY が設定されていません。.env.local に Google AI Studio の API キーを設定してください。",
        500
      );
    }

    const prompt = buildPrompt(sourceText, locationText, latitude, longitude);
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
            temperature: 0.2,
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
          `Gemini API (${geminiModel}) のレート制限に達しました。数秒待ってから再度お試しください。`,
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

    let result: MachiEyeAnalysis;
    try {
      result = normalizeResult(JSON.parse(rawText));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gemini API の応答形式が不正です。";
      return errorResponse("INVALID_AI_OUTPUT", msg, 502);
    }

    return NextResponse.json({
      result,
      usedProvider: "gemini" as const,
      usedModel: geminiModel,
    });
  } catch (error) {
    console.error("API /api/machieye error:", error);
    return errorResponse(
      "INTERNAL_ERROR",
      "現場データの解析中に予期しないエラーが発生しました。",
      500
    );
  }
}
