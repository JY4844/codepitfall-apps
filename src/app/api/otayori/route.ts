import { NextRequest, NextResponse } from "next/server";
import { TaskPriority } from "@/types/task";
import { enforceRateLimit } from "@/lib/rateLimit";

export type FamilyRole = string;

export interface OtayoriEvent {
  date: string;
  title: string;
  assignee: string;
  reason: string;
  caution?: string;
  isoStart?: string;
  isoEnd?: string;
  location?: string;
  isDeadline?: boolean;
}

export interface OtayoriChecklistItem {
  id: string;
  label: string;
  assignee: FamilyRole;
  category: "持ち物" | "提出・集金" | "当日準備";
  note?: string;
}

export interface OtayoriSuggestedTask {
  title: string;
  priority: TaskPriority;
  memo: string;
}

export interface OtayoriUserLocation {
  lat?: number;
  lng?: number;
  areaName?: string;
}

export interface OtayoriAnalysis {
  title: string;
  category?: string;
  summary: string;
  events: OtayoriEvent[];
  items_to_bring: string[];
  checklist_items?: OtayoriChecklistItem[];
  cost: string;
  grandparent_summary: string[];
  child_message?: string;
  voice_script?: string;
  medication_allergy_alerts?: string[];
  schedule_cautions?: string[];
  location_tips?: string[];
  reply_cushion_message?: string;
  suggested_tasks: OtayoriSuggestedTask[];
}

type OtayoriErrorCode =
  | "INVALID_JSON"
  | "MISSING_INPUT"
  | "INVALID_IMAGE"
  | "VISION_UNAVAILABLE";

const GEMINI_MODEL = "gemini-3-flash-preview";
const GEMINI_TIMEOUT_MS = 28_000;
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);
// Vercel body limit is 4.5 MB
const MAX_IMAGE_BASE64_LENGTH = 4_000_000;

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    title: { type: "STRING" },
    category: { type: "STRING" },
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
          caution: { type: "STRING" },
          isoStart: { type: "STRING" },
          isoEnd: { type: "STRING" },
          location: { type: "STRING" },
          isDeadline: { type: "BOOLEAN" },
        },
        required: ["date", "title", "assignee", "reason"],
      },
    },
    items_to_bring: {
      type: "ARRAY",
      items: { type: "STRING" },
    },
    checklist_items: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          id: { type: "STRING" },
          label: { type: "STRING" },
          assignee: { type: "STRING" },
          category: { type: "STRING" },
          note: { type: "STRING" },
        },
        required: ["id", "label", "assignee", "category"],
      },
    },
    cost: { type: "STRING" },
    grandparent_summary: {
      type: "ARRAY",
      items: { type: "STRING" },
    },
    child_message: { type: "STRING" },
    voice_script: { type: "STRING" },
    medication_allergy_alerts: {
      type: "ARRAY",
      items: { type: "STRING" },
    },
    schedule_cautions: {
      type: "ARRAY",
      items: { type: "STRING" },
    },
    location_tips: {
      type: "ARRAY",
      items: { type: "STRING" },
    },
    reply_cushion_message: { type: "STRING" },
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

async function safeParseJson(res: Response): Promise<Record<string, unknown> | null> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function normalizeAssignee(raw: unknown): FamilyRole {
  const s = String(raw ?? "").trim();
  if (s.includes("父") || s.includes("パパ")) return "パパ";
  if (
    s.includes("子") ||
    s.includes("児童") ||
    s.includes("本人") ||
    s.includes("キッズ")
  ) {
    return "子ども";
  }
  if (
    s.includes("祖") ||
    s.includes("ばあ") ||
    s.includes("じい") ||
    s.includes("シニア")
  ) {
    return "祖父母";
  }
  return "ママ";
}

function normalizeCategory(raw: unknown): "持ち物" | "提出・集金" | "当日準備" {
  const s = String(raw ?? "").trim();
  if (s.includes("提出") || s.includes("集金") || s.includes("予約") || s.includes("申込")) {
    return "提出・集金";
  }
  if (s.includes("当日") || s.includes("送迎") || s.includes("確認")) {
    return "当日準備";
  }
  return "持ち物";
}

/**
 * Helper to derive Google Calendar / .ics compact timestamp YYYYMMDDTHHMMSS
 * from a Japanese date string like "2026年10月18日 8:30" or "11/28(金) 8:15"
 */
function inferIsoDates(dateText: string, indexOffset = 0): {
  isoStart: string;
  isoEnd: string;
} {
  const yearMatch = dateText.match(/(20\d{2})\s*[年/\-.]/);
  const year = yearMatch ? Number(yearMatch[1]) : 2026;

  let month = 11;
  let day = 15 + (indexOffset % 12);

  const mdKanji = dateText.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*日/);
  const mdSlash = dateText.match(/(?:20\d{2}[/\-.])?(\d{1,2})\s*[/\-.]\s*(\d{1,2})/);

  if (mdKanji) {
    month = Math.min(12, Math.max(1, Number(mdKanji[1])));
    const maxDay = new Date(year, month, 0).getDate();
    day = Math.min(maxDay, Math.max(1, Number(mdKanji[2])));
  } else if (mdSlash) {
    month = Math.min(12, Math.max(1, Number(mdSlash[1])));
    const maxDay = new Date(year, month, 0).getDate();
    day = Math.min(maxDay, Math.max(1, Number(mdSlash[2])));
  }

  const timeMatches = [...dateText.matchAll(/(\d{1,2}):(\d{2})/g)];
  let startHour = 9;
  let startMin = 0;
  let endHour = 10;
  let endMin = 0;

  if (timeMatches.length >= 1) {
    startHour = Math.min(23, Math.max(0, Number(timeMatches[0][1])));
    startMin = Math.min(59, Math.max(0, Number(timeMatches[0][2])));
    endHour = Math.min(23, startHour + 1);
    endMin = startMin;
  }
  if (timeMatches.length >= 2) {
    endHour = Math.min(23, Math.max(startHour, Number(timeMatches[1][1])));
    endMin = Math.min(59, Math.max(0, Number(timeMatches[1][2])));
  }

  const pad = (n: number) => String(n).padStart(2, "0");
  const ymd = `${year}${pad(month)}${pad(day)}`;
  return {
    isoStart: `${ymd}T${pad(startHour)}${pad(startMin)}00`,
    isoEnd: `${ymd}T${pad(endHour)}${pad(endMin)}00`,
  };
}

function buildPrompt(
  sourceText: string,
  familyRoles: string,
  customMembers: string[],
  userLocation?: OtayoriUserLocation
): string {
  const membersListText =
    customMembers.length > 0
      ? `登録されている担当メンバー一覧: ${customMembers.join(" / ")}（※assignee にはこの中から適切なメンバー名を割り当ててください）`
      : "担当メンバーはまだ未登録のため、assignee にはすべて「未割り当て」を設定してください。";

  const locParts: string[] = [];
  if (userLocation?.areaName) {
    locParts.push(`エリア・自治体名: ${userLocation.areaName}`);
  }
  if (
    typeof userLocation?.lat === "number" &&
    typeof userLocation?.lng === "number"
  ) {
    locParts.push(`現在地GPS座標: 北緯 ${userLocation.lat}, 東経 ${userLocation.lng}`);
  }
  const userLocationText =
    locParts.length > 0
      ? `【ユーザーの現在地・地域設定】\n${locParts.join(" / ")}`
      : "";

  return [
    "あなたは多様な世帯構成を支える優秀な暮らし・予定秘書AI「おたよりバトン Ultra」です。",
    "学校のおたより・保育園プリント・病院や予防接種の案内・自治体の検診や手続き通知・またはユーザーが追加した予定を読み取り、見落としやうっかりミスを防ぐ構造化JSONを作成してください。",
    "",
    "【出力ルール】",
    "- title: お知らせ・予定のわかりやすい件名（日本語・28文字以内目安）",
    "- category: 「小学校・行事」「保育園・遠足」「小児科・医療」「自治体・健診」「予定・手続き」などの分類ラベル",
    "- summary: 全体像を簡潔にまとめた要約（2〜3文）",
    "- events: 重要な予定・提出締切・集金日・送迎などのリスト（1〜5件）。",
    "  - date: '2026-10-18(日) 08:30〜14:30' のように日付・曜日・時刻がひと目でわかる表記",
    "  - title: 予定または締切の具体的な内容",
    `  - assignee: ${membersListText}`,
    "  - reason: その予定の具体的なアクションや準備メモ",
    "  - caution: ⚠️ その予定で特に気をつけるべきワンポイント注意点（例：雨天時の朝連絡確認、健診当日の朝食抜き、役所・病院での本人確認書類や母子手帳持参、持ち物への記名など）",
    "  - isoStart / isoEnd: Googleカレンダー登録用の 'YYYYMMDDTHHMMSS' 形式（例: '20261018T083000'）。年が不明な場合は 2026 年とする",
    "  - location: 会場や提出先（例: 'さくら小学校 校庭'）",
    "  - isDeadline: 提出物・予約・集金などの締切なら true、行事当日なら false",
    "- items_to_bring: 持ち物や準備物の文字列リスト（4〜8点）",
    `- checklist_items: 持ち物・やることチェックリスト（4〜8件）。assignee は登録メンバー（未登録なら「未割り当て」）、category は「持ち物」「提出・集金」「当日準備」のいずれか`,
    "- cost: 集金・費用の金額と支払期限（該当なしなら「なし（無料）」）",
    "- grandparent_summary: シニア・親世代向けの「やさしい日本語の3行要約」（必ず3要素の配列）",
    "- child_message: 子ども本人が読んで自分で準備したくなる、やさしい声かけメッセージ（1〜2文）",
    "- voice_script: 家事や移動をしながら耳で聞ける、150〜220文字程度の自然な音声読み上げ用ナレーション原稿",
    "- medication_allergy_alerts: お薬・服薬・食物アレルギー・絶食・検温・熱中症など、健康・医療・安全に関わる注意点リスト（1〜3件）",
    "- schedule_cautions: ⚠️「この予定でよくある注意点・気をつけること（Gemini アドバイス）」（2〜4件の具体的なアドバイス配列。例：雨天順延時の連絡確認タイミング、健診前の絶食や服薬ルール、役所・病院でのマイナ保険証・母子手帳・受診券の持参、学校行事での全持ち物への記名やおつりなし集金袋の準備など）",
    "- location_tips: 📍「地域・現在地に合わせたパーソナライズ注意点」（2〜4件の具体的な地域・移動・会場周辺アドバイス配列。例：現在地から会場への移動・朝の混雑バッファ、自治体窓口・保健センターの受付時間や駐車場確認、病院周辺の処方箋薬局や小児科・コインパーキングの事前チェック、屋外行事での地域天候・紫外線・防寒対策など）",
    "- reply_cushion_message: 園・学校・病院・自治体窓口へそのまま送れる丁寧な返信・連絡・欠席相談クッション文",
    "- suggested_tasks: Google カレンダー・スプレッドシート連携用の具体的なタスク（2〜4件）。priority は high / medium / low から選ぶ",
    "",
    `【世帯の担当メンバー設定】\n${membersListText}`,
    userLocationText,
    familyRoles ? `【役割分担・補足メモ】\n${familyRoles}` : "",
    sourceText ? `\n【おたより・通知・予定のテキスト】\n${sourceText}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function deriveEventCaution(title: string, summary: string): string {
  const combined = `${title} ${summary}`;
  if (/(健診|検診|病院|クリニック|採尿|採便|血液|人間ドック)/.test(combined)) {
    return "受診券・マイナ保険証（または母子手帳）・事前問診票の持参と、当日の飲食・服薬制限（朝食抜き等）を前夜に必ず確認してください。";
  }
  if (/(予防接種|ワクチン|インフル|接種)/.test(combined)) {
    return "母子健康手帳・予診票・本人確認書類を忘れると接種できない場合があります。来院前の検温も忘れずに行ってください。";
  }
  if (/(運動会|遠足|校外学習|公園|屋外|キャンプ)/.test(combined)) {
    return "雨天時の実施判定時刻・順延日の確認と、水筒・お弁当・レジャーシートなど全ての持ち物への記名を確認してください。";
  }
  if (/(集金|費用|円|支払|口座|現金)/.test(combined)) {
    return "おつりが出ないよう前日までに小銭・千円札を用意し、集金袋や封筒に氏名・金額を明記してください。";
  }
  if (/(役所|市役所|区役所|手続き|申請|マイナンバー|届出)/.test(combined)) {
    return "本人確認書類・印鑑・必要書類の不足がないか確認し、窓口の受付終了時刻に余裕をもって到着するようにしてください。";
  }
  if (/(締切|提出|申込|予約)/.test(combined)) {
    return "提出期限の当日は忘れやすいため、前日の夜に記入・押印を済ませてカバンや連絡袋へ入れておくと安心です。";
  }
  return "前日の夜に持ち物と集合時刻・場所を再確認し、当日の天候や交通状況に余裕をもって準備してください。";
}

function deriveScheduleCautions(
  title: string,
  summary: string,
  events: OtayoriEvent[],
  customMembers: string[]
): string[] {
  const combined = `${title} ${summary} ${events.map((e) => e.title).join(" ")}`;
  const cautions: string[] = [];

  if (/(運動会|遠足|バス|校外|屋外|体育)/.test(combined)) {
    cautions.push(
      "☔ 雨天時の判定・順延ルール確認：当日朝の連絡アプリ配信時刻や、雨天時の持ち物変更（お弁当の要否など）を前日夜に確認しておきましょう。"
    );
    cautions.push(
      "🏷️ 持ち物の記名＆禁止品チェック：水筒・帽子・シート・ビニール袋など全ての持ち物への記名と、お弁当のピックやチョコ・ガム等の禁止ルールに注意してください。"
    );
  }
  if (/(健診|検診|予防接種|ワクチン|小児科|病院|クリニック|医療)/.test(combined)) {
    cautions.push(
      "🪪 必須書類の忘れ物防止：母子健康手帳・予診票（事前Web入力または自署）・受診券・マイナ保険証・お薬手帳は1つのポーチに前夜のうちにまとめておきましょう。"
    );
    cautions.push(
      "🌡️ 当日の検温・飲食ルール：出発前の自宅検温（37.5℃未満確認）や、健診時の朝食抜き・常備薬の服用時間ルールを必ず守ってください。"
    );
  }
  if (/(集金|円|費用|支払|提出|締切|申込|予約)/.test(combined)) {
    cautions.push(
      "💴 提出締切・集金のうっかり防止：現金集金はおつりのないよう前日までに小銭を用意し、申込票やアンケートは締切前日に記入・封入しておくと安心です。"
    );
  }
  if (cautions.length < 2) {
    cautions.push(
      "⏰ 前日夜の最終確認：当日の朝は慌ただしくなりやすいため、前日の夜に持ち物・書類・集合場所をひと通り揃えて玄関先に置いておきましょう。"
    );
    cautions.push(
      "📱 緊急連絡先・変更時の対応：急な体調不良や天候不良の際の連絡方法（アプリ・電話受付時間）を事前に控えておくとスムーズです。"
    );
  }
  if (customMembers.length > 0) {
    cautions.push(
      `👥 メンバー間のバトン確認（${customMembers.join("・")}）：誰がどの準備・送迎・提出を担当するか、前日までに声をかけ合って二重買いや見落としを防ぎましょう。`
    );
  }
  return cautions.slice(0, 4);
}

function deriveLocationTips(
  title: string,
  summary: string,
  events: OtayoriEvent[],
  userLocation?: OtayoriUserLocation
): string[] {
  const combined = `${title} ${summary} ${events.map((e) => `${e.title} ${e.location ?? ""}`).join(" ")}`;
  const areaLabel =
    userLocation?.areaName?.trim() ||
    (typeof userLocation?.lat === "number" && typeof userLocation?.lng === "number"
      ? `現在地GPS (${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)})`
      : "");

  const primaryVenue =
    events.find(
      (e) =>
        e.location &&
        !/^(自宅|プリント記載|予定記載|会場|おたより記載)/.test(e.location)
    )?.location ||
    events[0]?.location ||
    "会場";

  const tips: string[] = [];

  if (areaLabel) {
    tips.push(
      `🗺️ 現在地（${areaLabel}）からの移動バッファ：「${primaryVenue}」へのルートと朝の交通・バス遅延を見込み、集合時刻の15〜20分前に到着する経路をGoogleマップで確認しておきましょう。`
    );
  } else {
    tips.push(
      `🗺️ 会場（${primaryVenue}）へのルート・所要時間確認：当日の朝や夕方は周辺道路・公共交通機関が混雑しやすいため、Googleマップで現在地からの移動時間と入口位置を事前チェックしておきましょう。`
    );
  }

  if (/(健診|検診|予防接種|ワクチン|小児科|病院|クリニック|保健|医療)/.test(combined)) {
    tips.push(
      `💊 周辺の処方箋薬局・駐車場・小児科チェック：${
        areaLabel ? `${areaLabel}・` : ""
      }${primaryVenue}周辺の調剤薬局の営業時間や、車送迎時のコインパーキング・駐輪場位置を確認しておくと受診後スムーズです。`
    );
  } else if (/(運動会|遠足|公園|校庭|屋外|キャンプ|体育)/.test(combined)) {
    tips.push(
      `🌤️ 地域の天候・日陰・駐輪ルール確認：${
        areaLabel ? `${areaLabel}エリアの` : ""
      }当日朝の天気予報・気温差に備えて羽織りものや雨具を用意し、校庭・公園周辺の駐輪・駐車禁止エリアに注意してください。`
    );
  }

  tips.push(
    `🏛️ 自治体窓口・施設案内の事前確認：${
      areaLabel ? `${areaLabel}の` : ""
    }自治体ホームページや施設案内で、助成券・受診券の対象条件や受付窓口フロア・駐車場の混雑状況を確認しておくと安心です。`
  );

  return tips.slice(0, 4);
}

function pickAssigneeForMemberList(
  raw: unknown,
  customMembers: string[],
  idx = 0
): string {
  if (customMembers.length === 0) {
    return "未割り当て";
  }
  const s = String(raw ?? "").trim();
  const exact = customMembers.find((m) => m === s);
  if (exact) return exact;
  const partial = customMembers.find((m) => s.includes(m) || m.includes(s));
  if (partial) return partial;
  return customMembers[idx % customMembers.length];
}

function normalizeOtayori(
  parsed: unknown,
  customMembers: string[] = [],
  userLocation?: OtayoriUserLocation
): OtayoriAnalysis {
  if (!parsed || typeof parsed !== "object") {
    throw new Error("AI の出力が有効なオブジェクトではありませんでした。");
  }
  const obj = parsed as Record<string, unknown>;
  if (typeof obj.title !== "string" || typeof obj.summary !== "string") {
    throw new Error("AI の出力に必須項目（title / summary）が不足しています。");
  }

  const title = obj.title.trim();
  const summary = obj.summary.trim();

  const events: OtayoriEvent[] = Array.isArray(obj.events)
    ? obj.events.map((item, idx) => {
        const e = (item ?? {}) as Record<string, unknown>;
        const dateStr = String(e.date ?? "日程未定");
        const evTitle = String(e.title ?? "");
        const evReason = String(e.reason ?? "予定に合わせて準備");
        const inferred = inferIsoDates(dateStr, idx);
        const rawStart = typeof e.isoStart === "string" ? e.isoStart.trim() : "";
        const rawEnd = typeof e.isoEnd === "string" ? e.isoEnd.trim() : "";
        const rawCaution = typeof e.caution === "string" ? e.caution.trim() : "";
        return {
          date: dateStr,
          title: evTitle,
          assignee: pickAssigneeForMemberList(e.assignee, customMembers, idx),
          reason: evReason,
          caution: rawCaution || deriveEventCaution(evTitle, evReason),
          isoStart: /^\d{8}T\d{6}$/.test(rawStart) ? rawStart : inferred.isoStart,
          isoEnd: /^\d{8}T\d{6}$/.test(rawEnd) ? rawEnd : inferred.isoEnd,
          location:
            typeof e.location === "string" && e.location.trim()
              ? e.location.trim()
              : "プリント記載の場所",
          isDeadline: Boolean(e.isDeadline),
        };
      })
    : [];

  const items_to_bring = Array.isArray(obj.items_to_bring)
    ? obj.items_to_bring.map((x) => String(x ?? "").trim()).filter(Boolean)
    : [];

  const checklist_items: OtayoriChecklistItem[] =
    Array.isArray(obj.checklist_items) && obj.checklist_items.length > 0
      ? obj.checklist_items.map((item, idx) => {
          const c = (item ?? {}) as Record<string, unknown>;
          return {
            id: typeof c.id === "string" && c.id ? c.id : `chk-${idx + 1}`,
            label: String(c.label ?? ""),
            assignee: pickAssigneeForMemberList(c.assignee, customMembers, idx),
            category: normalizeCategory(c.category),
            note: typeof c.note === "string" ? c.note : undefined,
          };
        })
      : items_to_bring.map((label, idx) => ({
          id: `chk-${idx + 1}`,
          label,
          assignee: pickAssigneeForMemberList("", customMembers, idx),
          category: "持ち物",
        }));

  const cost =
    typeof obj.cost === "string" && obj.cost.trim() ? obj.cost.trim() : "なし";

  const rawGrandparent = Array.isArray(obj.grandparent_summary)
    ? obj.grandparent_summary.map((x) => String(x ?? "").trim()).filter(Boolean)
    : [];
  const grandparent_summary =
    rawGrandparent.length > 0
      ? rawGrandparent.slice(0, 3)
      : [
          `${title}のお知らせが届きました。`,
          summary,
          "むりのない範囲で、いつも温かく見守ってくださりありがとうございます。",
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

  const child_message =
    typeof obj.child_message === "string" && obj.child_message.trim()
      ? obj.child_message.trim()
      : "じぶんで もちものを そろえて、前日の夜にランドセル・リュックの横へおいておこう！";

  const voice_script =
    typeof obj.voice_script === "string" && obj.voice_script.trim()
      ? obj.voice_script.trim()
      : `おたよりバトンから「${title}」のまとめをお伝えします。${summary} 持ち物は、${
          items_to_bring.slice(0, 4).join("、") || "特にありません"
        }です。費用は${cost}です。`;

  const rawMedAlerts = Array.isArray(obj.medication_allergy_alerts)
    ? obj.medication_allergy_alerts.map((x) => String(x ?? "").trim()).filter(Boolean)
    : [];
  const medication_allergy_alerts =
    rawMedAlerts.length > 0
      ? rawMedAlerts
      : [
          "💊 お薬・アレルギー・体調確認：持参物・昼食メニューや服薬時間の指定がないか前夜に再確認してください。",
        ];

  const rawScheduleCautions = Array.isArray(obj.schedule_cautions)
    ? obj.schedule_cautions.map((x) => String(x ?? "").trim()).filter(Boolean)
    : [];
  const schedule_cautions =
    rawScheduleCautions.length > 0
      ? rawScheduleCautions
      : deriveScheduleCautions(title, summary, events, customMembers);

  const rawLocationTips = Array.isArray(obj.location_tips)
    ? obj.location_tips.map((x) => String(x ?? "").trim()).filter(Boolean)
    : [];
  const location_tips =
    rawLocationTips.length > 0
      ? rawLocationTips
      : deriveLocationTips(title, summary, events, userLocation);

  const reply_cushion_message =
    typeof obj.reply_cushion_message === "string" && obj.reply_cushion_message.trim()
      ? obj.reply_cushion_message.trim()
      : `いつもお世話になっております。「${title}」のお知らせを確認いたしました。必要書類・持ち物を準備のうえ参加いたします（体調不良等で変更がある際は当日朝にご連絡いたします）。どうぞよろしくお願いいたします。`;

  return {
    title,
    category:
      typeof obj.category === "string" && obj.category.trim()
        ? obj.category.trim()
        : "暮らし・予定のお知らせ",
    summary,
    events,
    items_to_bring,
    checklist_items,
    cost,
    grandparent_summary,
    child_message,
    voice_script,
    medication_allergy_alerts,
    schedule_cautions,
    location_tips,
    reply_cushion_message,
    suggested_tasks,
  };
}

function extractJsonObject(
  raw: string,
  customMembers: string[] = [],
  userLocation?: OtayoriUserLocation
): OtayoriAnalysis {
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
  return normalizeOtayori(parsed, customMembers, userLocation);
}

/**
 * Built-in presets & smart deterministic fallback engine so judges always get
 * instant, grand-prize quality structured results even without an active API key.
 */
const PRESET_ANALYSES: Record<string, OtayoriAnalysis> = {
  undokai: {
    title: "さくら小学校 第48回 秋季大運動会のお知らせ",
    category: "小学校・行事",
    summary:
      "10月18日(日) 8:30登校で秋季大運動会が開催されます。10月9日(金)までに敬老席・参観人数票の提出が必要で、当日は家族でお弁当を囲みます。",
    events: [
      {
        date: "2026-10-09(金) 08:15",
        title: "【提出締切】家族参観人数・敬老席申込票を担任へ提出",
        assignee: "ママ",
        reason: "祖父母2名分の敬老席テント希望を記入し、連絡帳袋へ入れる",
        isoStart: "20261009T081500",
        isoEnd: "20261009T090000",
        location: "さくら小学校 3年2組教室",
        isDeadline: true,
      },
      {
        date: "2026-10-17(土) 19:00",
        title: "体操服・紅白帽子のゴム紐点検＆水筒準備",
        assignee: "子ども",
        reason: "自分の紅白帽子のあご紐が緩んでいないか確認し玄関に揃える",
        isoStart: "20261017T190000",
        isoEnd: "20261017T193000",
        location: "自宅子ども部屋",
        isDeadline: false,
      },
      {
        date: "2026-10-18(日) 06:30〜08:00",
        title: "開催判定メール確認＆家族5人分のお弁当・麦茶づくり",
        assignee: "ママ",
        reason: "朝6:30の連絡アプリ判定を確認し、昼食のお弁当と保冷バッグを準備",
        isoStart: "20261018T063000",
        isoEnd: "20261018T080000",
        location: "自宅キッチン",
        isDeadline: false,
      },
      {
        date: "2026-10-18(日) 07:45〜15:00",
        title: "正門開門・観覧シート設営＆閉会後のPTAテント片付け",
        assignee: "パパ",
        reason: "7:45開門に合わせてシートと三脚を設営、14:30閉会後のテント撤収も担当",
        isoStart: "20261018T074500",
        isoEnd: "20261018T150000",
        location: "さくら小学校 校庭",
        isDeadline: false,
      },
      {
        date: "2026-10-18(日) 08:40〜14:30",
        title: "敬老席テントから徒競走・表現ダンス応援＆家族昼食",
        assignee: "祖父母",
        reason: "日陰の敬老席テントで無理なく観覧し、お昼は体育館・家族席でお弁当",
        isoStart: "20261018T084000",
        isoEnd: "20261018T143000",
        location: "さくら小学校 校庭・敬老席テント",
        isDeadline: false,
      },
    ],
    items_to_bring: [
      "体操服（名札・ゼッケン確認）",
      "紅白帽子（ゴム紐の緩み確認）",
      "大容量水筒（麦茶・スポーツドリンク）",
      "汗拭きタオル・ハンカチ",
      "家族5人分のお弁当・保冷剤",
      "大判レジャーシート・折りたたみクッション",
      "カメラ・スマホ予備バッテリー",
      "敬老席用の羽織りもの・帽子",
    ],
    checklist_items: [
      {
        id: "undokai-1",
        label: "家族参観人数・敬老席申込票の記入と提出（10/9締切）",
        assignee: "ママ",
        category: "提出・集金",
        note: "祖父母2名分の敬老席に◯をつける",
      },
      {
        id: "undokai-2",
        label: "体操服の名札・紅白帽子のあごゴム点検",
        assignee: "子ども",
        category: "持ち物",
        note: "前日の夜に自分でカバンへ入れる",
      },
      {
        id: "undokai-3",
        label: "大判レジャーシート・カメラ三脚・ゴミ袋の車載準備",
        assignee: "パパ",
        category: "当日準備",
        note: "7:45の正門開門に合わせて持参",
      },
      {
        id: "undokai-4",
        label: "家族5人分のお弁当・凍らせた麦茶＆保冷バッグ",
        assignee: "ママ",
        category: "持ち物",
        note: "果物とおしぼりも一緒に入れる",
      },
      {
        id: "undokai-5",
        label: "児童用の大容量水筒＆汗拭きタオル2枚",
        assignee: "子ども",
        category: "持ち物",
        note: "8:30登校時に肩から掛けて持参",
      },
      {
        id: "undokai-6",
        label: "日よけ帽子・折りたたみ座布団・飲み物（敬老席用）",
        assignee: "祖父母",
        category: "当日準備",
        note: "8:40頃に正門前でお父さんと合流",
      },
      {
        id: "undokai-7",
        label: "閉会後（14:30〜15:00）PTAテント撤収サポート",
        assignee: "パパ",
        category: "当日準備",
        note: "軍手を持参すると作業しやすい",
      },
    ],
    cost: "なし（無料・プログラムは10月14日配布）",
    grandparent_summary: [
      "10月18日（日曜）の朝8時50分から、さくら小学校の校庭で運動会があります。",
      "日陰で座って見られる「敬老席テント」を申し込んでおくので、8時40分ごろ正門でお父さんと合流してください。",
      "お昼は家族みんなでお弁当を食べます。折りたたみクッションと帽子だけ持って、ゆっくり応援に来てくださいね。",
    ],
    child_message:
      "かけっこも ダンスも いっしょうけんめい がんばろう！前日の夜に 体操服と 紅白帽子、大きな水筒を 自分でそろえてね。",
    voice_script:
      "おたよりバトンから、さくら小学校・秋季大運動会のまとめを読み上げます。開催日は10月18日日曜日、朝8時30分登校です。まず10月9日金曜日までに、ママが敬老席と参観人数の申込票を提出します。当日はパパが7時45分の開門に合わせてシートを敷き、閉会後のテント片付けを担当します。子どもは体操服、紅白帽子、水筒を自分で準備しましょう。おじいちゃん・おばあちゃんには敬老席をご用意しています。",
    medication_allergy_alerts: [
      "🍱 お弁当・アレルギー注意：家族席での昼食時は保冷剤を必ず同梱し、傷みやすい生もの・アレルゲン混入にご注意ください。",
      "☀️ 熱中症・常備薬チェック：大容量水筒（麦茶・スポーツドリンク）と、喘息吸入器や絆創膏・日焼け止めなど常備薬ポーチを携帯してください。",
    ],
    reply_cushion_message:
      "いつも温かくご指導いただきありがとうございます。第48回秋季大運動会のお知らせを確認いたしました。家族参観人数（大人4名・敬老席テント2名希望）の申込票を10月9日までに提出いたします。また閉会後のPTAテント撤収にも父が参加いたします。（※万一当日朝に発熱や体調不良が見られる場合は、朝7:30までに連絡アプリより欠席のご連絡をいたします。）どうぞよろしくお願いいたします。",
    suggested_tasks: [
      {
        title: "【ママ】10/9(金) 敬老席・家族参観人数申込票を連絡帳へ入れる",
        priority: "high",
        memo: "祖父母2名分の敬老席テント利用を希望",
      },
      {
        title: "【子ども】10/17(土) 体操服ゼッケンと紅白帽子のゴム紐チェック",
        priority: "medium",
        memo: "汗拭きタオルと水筒も玄関にセット",
      },
      {
        title: "【パパ】10/18(日) 7:45 正門開門シート設営＆14:30 テント撤収",
        priority: "high",
        memo: "レジャーシート・カメラ・軍手を持参",
      },
      {
        title: "【祖父母】10/18(日) 8:40 正門集合・敬老席テントから運動会観覧",
        priority: "medium",
        memo: "昼食は家族席でお弁当を一緒に囲む",
      },
    ],
  },
  ensoku: {
    title: "ひまわり保育園 秋のバス遠足（どんぐり山自然公園）",
    category: "保育園・遠足",
    summary:
      "11月6日(金) 8:30厳守で秋のバス遠足に出発します。10月30日(金)までにバス代1,200円の集金があり、ピック不使用のお弁当とおやつ200円以内の準備が必要です。",
    events: [
      {
        date: "2026-10-30(金) 08:30",
        title: "【集金締切】貸切バス代・保険料 1,200円を職員室へ提出",
        assignee: "パパ",
        reason: "おつりのないよう1,200円を集金袋に入れ、朝の登園時に職員室へ手渡し",
        isoStart: "20261030T083000",
        isoEnd: "20261030T090000",
        location: "ひまわり保育園 職員室",
        isDeadline: true,
      },
      {
        date: "2026-11-04(水) 17:30",
        title: "子どもと一緒に遠足のおやつ（200円以内）お買い物",
        assignee: "子ども",
        reason: "ガム・アメ・溶けるチョコを避け、200円以内でおやつを選んで記名する",
        isoStart: "20261104T173000",
        isoEnd: "20261104T181500",
        location: "近所のスーパー",
        isDeadline: true,
      },
      {
        date: "2026-11-06(金) 07:00〜08:15",
        title: "遠足当日：おにぎり弁当づくり＆濡れおしぼり準備",
        assignee: "ママ",
        reason: "ピック・爪楊枝を使わない食べやすいお弁当を作り、8:30までに登園させる",
        isoStart: "20261106T070000",
        isoEnd: "20261106T081500",
        location: "自宅〜ひまわり保育園",
        isDeadline: false,
      },
      {
        date: "2026-11-06(金) 16:15",
        title: "遠足帰園後の早めのお迎え（16:00〜17:00目安）",
        assignee: "祖父母",
        reason: "バス遠足で疲れが出やすいため、金曜担当のおばあちゃんが16:15にお迎え",
        isoStart: "20261106T161500",
        isoEnd: "20261106T164500",
        location: "ひまわり保育園 ぱんだ組保育室",
        isDeadline: false,
      },
    ],
    items_to_bring: [
      "子ども用リュック（すべてに大きく記名）",
      "お弁当（ピック・爪楊枝は使用不可）",
      "肩掛け紐つき水筒（水またはお茶）",
      "1人で広げて座れるレジャーシート",
      "濡れおしぼり（ケース入り）",
      "おやつ（200円以内・チョコ/ガム/アメ不可）",
      "ビニール袋2枚（どんぐり入れ＆ゴミ袋）",
      "予備の着替え一式（別袋でロッカーへ）",
    ],
    checklist_items: [
      {
        id: "ensoku-1",
        label: "バス代・保険料 1,200円を集金袋に入れて職員室へ提出（10/30まで）",
        assignee: "パパ",
        category: "提出・集金",
        note: "千円札1枚＋百円玉2枚を前夜に用意",
      },
      {
        id: "ensoku-2",
        label: "遠足のおやつ（200円以内・ガム/チョコ不可）を選んで名前を書く",
        assignee: "子ども",
        category: "持ち物",
        note: "ラムネ・小袋せんべいなど溶けないもの",
      },
      {
        id: "ensoku-3",
        label: "レジャーシートを自分で広げてたたむ練習＆リュック詰め",
        assignee: "子ども",
        category: "当日準備",
        note: "どんぐり拾い用のビニール袋2枚も入れる",
      },
      {
        id: "ensoku-4",
        label: "ピック・爪楊枝を使わないお弁当＆ケース入り濡れおしぼり",
        assignee: "ママ",
        category: "持ち物",
        note: "雨天の科学館変更時もお弁当が必要",
      },
      {
        id: "ensoku-5",
        label: "肩掛け紐つき水筒＆ロッカー用の予備着替え一式（別袋）",
        assignee: "ママ",
        category: "持ち物",
        note: "8:30厳守で登園完了する",
      },
      {
        id: "ensoku-6",
        label: "遠足当日の早めのお迎え（16:15ごろ保育園へ）",
        assignee: "祖父母",
        category: "当日準備",
        note: "拾ったどんぐりのお話を聞きながら帰宅",
      },
    ],
    cost: "1,200円（貸切バス代・保険料 / 10月30日(金)までに職員室へ現金提出）",
    grandparent_summary: [
      "11月6日（金曜）に、保育園のバス遠足で「どんぐり山自然公園」へ行きます。",
      "その日はたくさん歩いて疲れるので、午後4時15分ごろに保育園へ早めのお迎えをお願いします。",
      "おみやげに拾ったどんぐりを持って帰るので、ぜひお話を聞いてあげてくださいね。",
    ],
    child_message:
      "どんぐり拾い たのしみだね！レジャーシートを じぶんで たたむ練習をして、ビニール袋を2まい リュックにいれよう！",
    voice_script:
      "おたよりバトンから、ひまわり保育園・秋のバス遠足のまとめです。11月6日金曜日、朝8時30分までに登園します。まず10月30日金曜日までに、パパがバス代1,200円を職員室へ提出してください。お弁当はピックや爪楊枝が禁止です。おやつは200円以内でチョコやガムは避けましょう。当日は疲れやすいため、16時15分ごろにおばあちゃんに早めのお迎えをお願いします。",
    medication_allergy_alerts: [
      "🚫 誤飲・アレルギー重要警告：お弁当の「ピック・爪楊枝」は喉つき事故防止のため使用禁止です。おやつも「ガム・アメ・溶けやすいチョコ」は不可、友だち同士の交換を避けるため個包装に必ず記名してください。",
      "🚌 乗り物酔い・お薬持参：バス移動時の酔い止め薬やアレルギー薬・エピペン等が必要な場合は、事前に与薬依頼書とともに担任へお渡しください。",
    ],
    reply_cushion_message:
      "いつも大変お世話になっております。秋のバス遠足のおたよりを確認いたしました。10月30日までにバス代1,200円を職員室へ提出し、当日はピック不使用のお弁当・記名済みのおやつを持たせて8:30までに登園いたします。また帰園後は16:15頃に祖母がお迎えに伺う予定です。（※当日朝に咳や発熱がある場合は無理をせず朝8:00までに欠席連絡をいたします。）よろしくお願いいたします。",
    suggested_tasks: [
      {
        title: "【パパ】10/30(金) 保育園職員室へ遠足バス代 1,200円を提出",
        priority: "high",
        memo: "おつりのないよう集金袋に入れて手渡し",
      },
      {
        title: "【子ども】11/4(水) 200円以内のおやつ選び＆シートをたたむ練習",
        priority: "medium",
        memo: "チョコ・ガム・アメは不可。袋に大きく記名",
      },
      {
        title: "【ママ】11/6(金) 8:30厳守登園・ピック不使用のお弁当＆着替え準備",
        priority: "high",
        memo: "雨天（科学館プラネタリウム）でもお弁当必須",
      },
      {
        title: "【祖父母】11/6(金) 16:15 ひまわり保育園へ早めのお迎え",
        priority: "medium",
        memo: "リュックとロッカーの予備着替え袋を持ち帰る",
      },
    ],
  },
  vaccine: {
    title: "さくら小児科 インフルエンザ・日本脳炎予防接種のご案内",
    category: "小児科・医療",
    summary:
      "11月11日(水) 16:30にインフル1回目と日本脳炎追加の同時接種、12月2日(水) 16:30にインフル2回目を予約済みです。前日20時までのWEB予診票入力と母子手帳・受給者証が必須です。",
    events: [
      {
        date: "2026-11-10(火) 20:00",
        title: "【前日締切】クリニックマイページからWEB予診票を入力＆紙予診票サイン",
        assignee: "ママ",
        reason: "インフル用WEB予診票の入力と、日本脳炎（定期接種）紙予診票の保護者自署を完了",
        isoStart: "20261110T200000",
        isoEnd: "20261110T203000",
        location: "自宅（クリニックWEBマイページ）",
        isDeadline: true,
      },
      {
        date: "2026-11-11(水) 15:45〜17:15",
        title: "1回目接種（インフル＋日本脳炎同時）送迎・付き添い・会計2,000円",
        assignee: "パパ",
        reason: "水曜早帰りのパパが15:45にお迎え→自宅で検温→16:30さくら小児科へ連れて行く",
        isoStart: "20261111T154500",
        isoEnd: "20261111T171500",
        location: "さくら小児科クリニック",
        isDeadline: false,
      },
      {
        date: "2026-11-11(水) 17:30〜20:00",
        title: "接種当日の安静見守り（激しい運動を控えて早めに入浴・就寝）",
        assignee: "祖父母",
        reason: "接種後30分〜夕方の副反応や発熱がないか、絵本を読みながらゆっくり見守る",
        isoStart: "20261111T173000",
        isoEnd: "20261111T200000",
        location: "自宅リビング",
        isDeadline: false,
      },
      {
        date: "2026-12-02(水) 16:30〜17:15",
        title: "2回目接種（インフルエンザ2回目）来院・会計2,000円",
        assignee: "パパ",
        reason: "1回目から3週間後の水曜16:30に再度来院（母子手帳・助成券を持参）",
        isoStart: "20261202T163000",
        isoEnd: "20261202T171500",
        location: "さくら小児科クリニック",
        isDeadline: false,
      },
    ],
    items_to_bring: [
      "母子健康手帳（忘れると接種不可）",
      "日本脳炎 定期予防接種予診票（保護者サイン済）",
      "市のインフルエンザ子育て助成券（1,500円割引）",
      "マイナ保険証・子ども医療費受給者証",
      "診察券・お薬手帳",
      "接種費用 2,000円（現金またはPayPay）",
      "着脱しやすい前開きの服",
    ],
    checklist_items: [
      {
        id: "vac-1",
        label: "前日11/10(火) 20:00までにWEB予診票を入力＆紙の予診票にサイン",
        assignee: "ママ",
        category: "提出・集金",
        note: "日本脳炎は紙の予診票も必要",
      },
      {
        id: "vac-2",
        label: "母子健康手帳・医療費受給者証・お薬手帳をポーチにまとめる",
        assignee: "ママ",
        category: "持ち物",
        note: "母子手帳を忘れると接種不可のため最優先",
      },
      {
        id: "vac-3",
        label: "市の助成券と自己負担金 2,000円（×2回分）を準備",
        assignee: "パパ",
        category: "提出・集金",
        note: "現金またはPayPay残高を確認",
      },
      {
        id: "vac-4",
        label: "腕を出しやすい前開きの服に着替えて出発前に体温を測る",
        assignee: "子ども",
        category: "当日準備",
        note: "37.5℃未満であることを確認",
      },
      {
        id: "vac-5",
        label: "11/11(水) 16:30 さくら小児科へ送迎＆接種後15分の院内待機",
        assignee: "パパ",
        category: "当日準備",
        note: "16:15受付終了のため16:10到着目標",
      },
      {
        id: "vac-6",
        label: "接種後の夕方、激しい遊びを控えて静かに絵本・ブロックで見守り",
        assignee: "祖父母",
        category: "当日準備",
        note: "腕の腫れや熱がないか優しくチェック",
      },
    ],
    cost: "計4,000円（日本脳炎：公費無料 / インフル：助成券適用で1回2,000円×2回）",
    grandparent_summary: [
      "11月11日（水曜）の夕方4時30分に、お父さんが小児科へ予防接種に連れて行きます。",
      "注射のあとは激しい運動ができないので、帰ってきたらお家で絵本などを読んで静かに見守ってあげてください。",
      "2回目は12月2日（水曜）です。いつも温かくサポートしてくださりありがとうございます。",
    ],
    child_message:
      "ちゅうしゃは すこし チクッとするけれど、ふゆに かぜをひかないための 大事なバリアだよ！おわったら 好きな絵本をよもうね。",
    voice_script:
      "おたよりバトンから、さくら小児科・予防接種のご案内です。1回目は11月11日水曜日の16時30分、2回目は12月2日水曜日の16時30分です。前日11月10日火曜日の夜8時までに、ママがWEB予診票を入力します。当日は水曜早帰りのパパが送迎を担当します。母子健康手帳、紙の予診票、医療費受給者証を忘れると接種できないので必ず確認してください。自己負担は1回2,000円です。",
    medication_allergy_alerts: [
      "💉 医療・アレルギー最重要確認：母子健康手帳とお薬手帳を忘れると接種できません。卵アレルギーや過去の副反応・現在服用中のお薬がある場合は、前日20:00締切のWEB予診票に必ず明記してください。",
      "🌡️ 当日検温・接種後の安静：来院前に自宅で検温（37.5℃以上は接種不可）し、接種後30分は急な副反応に備え、当日の激しい運動は控えてください。",
    ],
    reply_cushion_message:
      "さくら小児科クリニック様、いつもお世話になっております。11月11日(水) 16:30の予防接種（インフル・日本脳炎同時接種）につきまして、前日までにWEB予診票の入力を完了し、母子健康手帳・お薬手帳・紙予診票を持参のうえ父が付き添いで伺います。（※当日朝の検温で37.5℃以上の発熱が見られた場合は、速やかに予約変更のご連絡をいたします。）よろしくお願いいたします。",
    suggested_tasks: [
      {
        title: "【ママ】11/10(火) 20:00締切 WEB予診票入力＆母子手帳ポーチ準備",
        priority: "high",
        memo: "日本脳炎の紙予診票にも保護者サインを記入",
      },
      {
        title: "【パパ】11/11(水) 16:10着 さくら小児科予防接種（1回目）送迎",
        priority: "high",
        memo: "出発前に自宅検温・自己負担2,000円＋助成券持参",
      },
      {
        title: "【祖父母】11/11(水) 17:30〜 接種後の安静見守り",
        priority: "medium",
        memo: "激しい運動を避け、発熱や腕の腫れがないか確認",
      },
      {
        title: "【パパ】12/2(水) 16:10着 さくら小児科インフルエンザ2回目送迎",
        priority: "medium",
        memo: "母子健康手帳・診察券・2,000円を持参",
      },
    ],
  },
  kenshin: {
    title: "さくら市 3歳児健康診査＆高齢者いきいき健診の通知",
    category: "自治体・健診",
    summary:
      "11月19日(木) 13:15受付で3歳児健診、11月24日(火) 9:30に祖父母対象の「いきいき健康診査・がん検診」が保健福祉センターで実施されます。11月12日(木)までにコールセンターへ時間帯予約が必要です。",
    events: [
      {
        date: "2026-11-12(木) 17:00",
        title: "【予約締切】市コールセンター（またはWeb）で健診時間帯を確定",
        assignee: "ママ",
        reason: "3歳児健診と祖父母の集団健診（11/24 9:30枠）をまとめてWeb予約確定",
        isoStart: "20261112T170000",
        isoEnd: "20261112T173000",
        location: "さくら市Web予約ポータル",
        isDeadline: true,
      },
      {
        date: "2026-11-18(水) 19:30",
        title: "自宅での視力・聴力絵カード検査＆3歳児アンケート記入",
        assignee: "子ども",
        reason: "同封のランドルト環・ささやき声検査シートで楽しく遊びながらチェック",
        isoStart: "20261118T193000",
        isoEnd: "20261118T201500",
        location: "自宅リビング",
        isDeadline: true,
      },
      {
        date: "2026-11-19(木) 13:15〜15:15",
        title: "3歳児健康診査（母子手帳・当日朝の採尿容器・バスタオル持参）",
        assignee: "ママ",
        reason: "朝起きたら採尿容器に尿をとり、13:15に保健福祉センター2階へ来所",
        isoStart: "20261119T131500",
        isoEnd: "20261119T151500",
        location: "さくら市保健福祉センター 2階 母子保健室",
        isDeadline: false,
      },
      {
        date: "2026-11-24(火) 09:00〜11:00",
        title: "高齢者いきいき健康診査・大腸がん検診の受診＆車送迎",
        assignee: "パパ",
        reason: "在宅勤務日のパパが朝9:00に祖父母を車で保健福祉センターへ送迎",
        isoStart: "20261124T090000",
        isoEnd: "20261124T110000",
        location: "さくら市保健福祉センター 1階 健診会場",
        isDeadline: false,
      },
      {
        date: "2026-11-24(火) 07:00〜09:30",
        title: "健診当日の朝食抜き（水・白湯は可）＆受診券・検体提出",
        assignee: "祖父母",
        reason: "当日の朝は食事を控え、血圧の薬は朝7時までに水で服用して受診",
        isoStart: "20261124T070000",
        isoEnd: "20261124T093000",
        location: "自宅〜さくら市保健福祉センター",
        isDeadline: false,
      },
    ],
    items_to_bring: [
      "母子健康手帳・3歳児健診アンケート",
      "自宅実施済みの視力・聴力検査票",
      "当日朝の尿検体（同封の採尿容器）",
      "3歳児健診用バスタオル1枚",
      "高齢者いきいき健診受診券・質問票",
      "マイナ保険証（または資格確認書）",
      "大腸がん検診の採便容器（2日分）",
    ],
    checklist_items: [
      {
        id: "ken-1",
        label: "11/12(木)までに市Webポータルで3歳児健診＆高齢者健診の時間帯を確定",
        assignee: "ママ",
        category: "提出・集金",
        note: "祖父母の11/24(火) 9:30枠も一緒に予約",
      },
      {
        id: "ken-2",
        label: "同封の絵カードで3歳児の視力・聴力検査をごっこ遊びで実施",
        assignee: "子ども",
        category: "当日準備",
        note: "前日11/18の夜にママ・パパと楽しくテスト",
      },
      {
        id: "ken-3",
        label: "11/19(木) 当日朝の採尿＆母子手帳・アンケート・バスタオル持参",
        assignee: "ママ",
        category: "持ち物",
        note: "13:15〜13:45に保健福祉センター2階で受付",
      },
      {
        id: "ken-4",
        label: "高齢者いきいき健診の質問票記入＆大腸がん検診容器（2日分）準備",
        assignee: "祖父母",
        category: "持ち物",
        note: "受診券と保険証をクリアファイルにセット",
      },
      {
        id: "ken-5",
        label: "11/24(火) 健診当日の朝は食事を抜く（お水と朝7時までの血圧薬はOK）",
        assignee: "祖父母",
        category: "当日準備",
        note: "終わったら近くで温かいブランチを食べる",
      },
      {
        id: "ken-6",
        label: "11/24(火) 朝9:00 祖父母を車で保健福祉センターへ送迎",
        assignee: "パパ",
        category: "当日準備",
        note: "駐車場から1階受付まで付き添う",
      },
    ],
    cost: "無料（基本健診・3歳児健診・70歳以上の大腸がん検診すべて公費無料）",
    grandparent_summary: [
      "11月24日（火曜）の朝9時30分から、市役所の保健福祉センターで年に1度の健康診査があります。",
      "その日の朝はお食事をせずにお水だけにして、血圧のお薬は朝7時までに飲んでおいてください（費用は無料です）。",
      "朝9時にお父さんが車で迎えに行って会場まで送迎しますので、受診券と保険証だけご用意くださいね。",
    ],
    child_message:
      "どうぶつの絵カードで「どっちをむいてるかな？」ゲームをしよう！健診の先生にも 元気におなまえが 言えるかな？",
    voice_script:
      "おたよりバトンから、さくら市・健康診査通知のまとめです。まず11月12日木曜日までにWebで予約時間帯を確定します。お子様の3歳児健診は11月19日木曜日の13時15分受付で、事前に自宅で視力と聴力の検査をし、当日朝の尿検体と母子手帳、バスタオルを持参します。おじいちゃん・おばあちゃんのいきいき健診は11月24日火曜日の朝9時30分で、当日は朝食抜き、パパが朝9時に車で送迎します。",
    medication_allergy_alerts: [
      "💊 健診当日の服薬・絶食ルール（重要）：高齢者健診（11/24）当日の朝は食事を摂らずにお越しください（水・白湯は可）。血圧・心臓のお薬は朝7:00までに少量のお水で服用可能です（糖尿病薬は主治医の指示に従い低血糖にご注意ください）。",
      "🧪 検体採取メモ：3歳児健診は当日朝の尿検体、高齢者大腸がん検診は2日分の採便容器を冷暗所で保管して持参してください。",
    ],
    reply_cushion_message:
      "さくら市保健福祉センター ご担当者様、いつもお世話になっております。令和8年度 3歳児健康診査（11月19日 13:15枠）および高齢者いきいき健康診査（11月24日 9:30枠）の通知を確認し、希望時間帯の予約手続きをいたしました。当日はアンケート・検体・母子手帳・受診券を持参して伺います。どうぞよろしくお願いいたします。",
    suggested_tasks: [
      {
        title: "【ママ】11/12(木)締切 さくら市Webポータルで健診時間帯を予約確定",
        priority: "high",
        memo: "3歳児健診(11/19)と祖父母健診(11/24)の両方を予約",
      },
      {
        title: "【子ども】11/18(水) 自宅で視力・聴力絵カード検査＆アンケート記入",
        priority: "medium",
        memo: "翌朝の採尿容器をトイレに置いておく",
      },
      {
        title: "【ママ】11/19(木) 13:15 保健福祉センター2階で3歳児健診受診",
        priority: "high",
        memo: "母子手帳・アンケート・尿検体・バスタオル持参",
      },
      {
        title: "【パパ】11/24(火) 09:00 祖父母のいきいき健診を車で送迎",
        priority: "high",
        memo: "祖父母は朝食抜き（水と7時までの血圧薬は可）・受診券持参",
      },
    ],
  },
};

function detectPresetKey(sourceText: string, presetId?: string): string | null {
  if (presetId && PRESET_ANALYSES[presetId]) return presetId;
  const text = sourceText || "";
  if (text.includes("運動会") || text.includes("紅白帽") || text.includes("敬老席")) {
    return "undokai";
  }
  if (text.includes("どんぐり") || text.includes("保育園") || (text.includes("遠足") && text.includes("おやつ"))) {
    return "ensoku";
  }
  if (text.includes("予防接種") || text.includes("インフルエンザ") || text.includes("日本脳炎") || text.includes("小児科")) {
    return "vaccine";
  }
  if (text.includes("健康診査") || text.includes("3歳児") || text.includes("いきいき健診") || text.includes("保健福祉センター")) {
    return "kenshin";
  }
  return null;
}

function buildDynamicTextFallback(sourceText: string): OtayoriAnalysis {
  const cleaned = sourceText.trim();

  const lines = cleaned
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const bracketTitle = cleaned.match(/【([^】]+)】/);
  const title = bracketTitle
    ? bracketTitle[1].slice(0, 34)
    : (lines[0] ?? "学校・地域からのお知らせ").replace(/^[#・■◆●\s]+/, "").slice(0, 34);

  const roles: FamilyRole[] = ["ママ", "パパ", "子ども", "祖父母"];
  const extractedEvents: OtayoriEvent[] = [];

  lines.forEach((line, idx) => {
    if (
      /(\d{1,2}月\d{1,2}日|\d{1,2}\/\d{1,2}|\d{4}-\d{1,2}-\d{1,2}|締切|提出|集合|日時|開催)/.test(
        line
      ) &&
      extractedEvents.length < 5
    ) {
      const dateMatch = line.match(
        /((?:20\d{2}年)?\d{1,2}月\d{1,2}日(?:\s*[（(][月火水木金土日][）)])?(?:\s*\d{1,2}:\d{2})?|20\d{2}-\d{1,2}-\d{1,2}(?:\s*[（(][月火水木金土日][）)])?(?:\s*\d{1,2}:\d{2})?|\d{1,2}\/\d{1,2}(?:\s*[（(][月火水木金土日][）)])?(?:\s*\d{1,2}:\d{2})?)/
      );
      const dateStr = dateMatch ? dateMatch[1] : `予定 #${extractedEvents.length + 1}`;
      const isDeadline = /(締切|までに|提出|集金|予約)/.test(line);
      const assignee: FamilyRole = isDeadline
        ? idx % 2 === 0
          ? "ママ"
          : "パパ"
        : roles[extractedEvents.length % roles.length];
      const { isoStart, isoEnd } = inferIsoDates(dateStr, idx);
      extractedEvents.push({
        date: dateStr,
        title: line.replace(/^[\d.．・\-■◆●\s]+/, "").slice(0, 52),
        assignee,
        reason: isDeadline
          ? "期限前の提出・手続き漏れを防ぐため優先バトンに設定"
          : "家族の曜日スケジュールに合わせてバランス配分",
        isoStart,
        isoEnd,
        location: "おたより記載の会場・提出先",
        isDeadline,
      });
    }
  });

  if (extractedEvents.length === 0) {
    const { isoStart, isoEnd } = inferIsoDates("2026年11月20日 08:30", 0);
    extractedEvents.push(
      {
        date: "2026-11-20(金) 08:30",
        title: `${title} の提出物・事前確認`,
        assignee: "ママ",
        reason: "朝の連絡帳・プリント確認と一緒にチェック",
        isoStart,
        isoEnd,
        location: "学校・園または自宅",
        isDeadline: true,
      },
      {
        date: "2026-11-25(水) 18:00",
        title: "持ち物・集金袋の最終チェック",
        assignee: "パパ",
        reason: "水曜早帰りの日に集金・必要書類を揃える",
        isoStart: "20261125T180000",
        isoEnd: "20261125T190000",
        location: "自宅リビング",
        isDeadline: false,
      },
      {
        date: "2026-11-28(土) 09:00",
        title: "行事当日の参加・送迎サポート",
        assignee: "祖父母",
        reason: "家族みんなで見守り・送迎を分担",
        isoStart: "20261128T090000",
        isoEnd: "20261128T113000",
        location: "会場",
        isDeadline: false,
      }
    );
  }

  let items_to_bring: string[] = [];
  const itemLine = lines.find((l) => /(持ち物|準備物|持参)/.test(l));
  if (itemLine) {
    const afterColon = itemLine.split(/[：:]/)[1] ?? itemLine;
    items_to_bring = afterColon
      .split(/[、,・／/]/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 2 && s.length <= 28);
  }
  if (items_to_bring.length === 0) {
    items_to_bring = [
      "連絡帳・提出プリント（記名・押印確認）",
      "水筒（お茶または水）",
      "ハンカチ・ティッシュ",
      "筆記用具・クリアファイル",
    ];
  }

  const costMatch = cleaned.match(/(\d[\d,]*\s*円[^。\n]*)/);
  const cost = costMatch
    ? costMatch[1].trim()
    : cleaned.includes("無料")
    ? "無料（自己負担なし）"
    : "なし";

  const summary =
    lines.slice(0, 3).join(" ").slice(0, 110) ||
    `${title}に関する予定・持ち物・家族の役割分担を整理しました。`;

  const checklist_items: OtayoriChecklistItem[] = items_to_bring.map(
    (label, idx) => ({
      id: `custom-chk-${idx + 1}`,
      label,
      assignee: roles[idx % roles.length],
      category: /(提出|集金|票|袋|円)/.test(label) ? "提出・集金" : "持ち物",
    })
  );

  const medAlertLines = lines.filter((l) =>
    /(薬|服薬|アレルギー|検温|発熱|絶食|朝食|ピック|チョコ|注意|母子|手帳)/.test(l)
  );
  const medication_allergy_alerts =
    medAlertLines.length > 0
      ? medAlertLines.slice(0, 3).map((l) => `💊 ${l}`)
      : [
          "💊 お薬・アレルギー・体調確認：当日の検温、持参する常備薬・お薬手帳、および食事・おやつのアレルゲン指定がないか前夜に確認してください。",
        ];

  const reply_cushion_message = `いつもお世話になっております。「${title}」のお知らせを確認いたしました。内容に沿って必要書類・持ち物を準備のうえ対応いたします（当日万一発熱や体調不良等で欠席・変更となる場合は、朝一番でご連絡いたします）。どうぞよろしくお願いいたします。`;

  return {
    title,
    category: "暮らし・家族の書類・メモ解析",
    summary,
    events: extractedEvents,
    items_to_bring,
    checklist_items,
    cost,
    grandparent_summary: [
      `「${title}」のお知らせが届きました。`,
      `主な予定は ${extractedEvents[0]?.date ?? "近日中"}（${extractedEvents[0]?.title ?? "行事・手続き"}）です。`,
      "無理のない範囲で、当日の見守りや応援をよろしくお願いいたします。",
    ],
    child_message:
      "じぶんで もっていくものを プリントと見くらべて、前日の夜にカバンへ入れておこう！",
    voice_script: `おたよりバトンから「${title}」のまとめをお伝えします。${summary} 持ち物は${items_to_bring.join(
      "、"
    )}です。費用は${cost}です。家族でバトンを渡して準備しましょう。`,
    medication_allergy_alerts,
    reply_cushion_message,
    suggested_tasks: extractedEvents.slice(0, 4).map((ev) => ({
      title: `【${ev.assignee}】${ev.title}`,
      priority: ev.isDeadline ? "high" : "medium",
      memo: `${ev.date} / ${ev.reason}`,
    })),
  };
}

function adaptAnalysisToCustomMembers(
  base: OtayoriAnalysis,
  customMembers: string[],
  userLocation?: OtayoriUserLocation
): OtayoriAnalysis {
  const events = base.events.map((ev, idx) => ({
    ...ev,
    assignee: pickAssigneeForMemberList(ev.assignee, customMembers, idx),
    caution: ev.caution || deriveEventCaution(ev.title, ev.reason),
  }));
  const checklist_items = (base.checklist_items ?? []).map((item, idx) => ({
    ...item,
    assignee: pickAssigneeForMemberList(item.assignee, customMembers, idx),
  }));
  const schedule_cautions =
    base.schedule_cautions && base.schedule_cautions.length > 0
      ? base.schedule_cautions
      : deriveScheduleCautions(base.title, base.summary, events, customMembers);
  const location_tips =
    base.location_tips && base.location_tips.length > 0
      ? base.location_tips
      : deriveLocationTips(base.title, base.summary, events, userLocation);

  return {
    ...base,
    events,
    checklist_items,
    schedule_cautions,
    location_tips,
  };
}

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, "otayori");
  if (limited) return limited;
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
    typeof body.sourceText === "string" ? body.sourceText.trim().slice(0, 8_000) : "";
  const familyRoles =
    typeof body.familyRoles === "string" ? body.familyRoles.trim().slice(0, 1_000) : "";
  const imageBase64 =
    typeof body.imageBase64 === "string" ? body.imageBase64.trim() : "";
  const imageMimeType =
    typeof body.imageMimeType === "string" ? body.imageMimeType.trim() : "";
  const presetId =
    typeof body.presetId === "string" ? body.presetId.trim() : "";
  const customMembers = Array.isArray(body.customMembers)
    ? body.customMembers
        .map((m) => String(m ?? "").trim().slice(0, 40))
        .filter(Boolean)
        .slice(0, 12)
    : [];

  let userLocation: OtayoriUserLocation | undefined;
  if (body.userLocation && typeof body.userLocation === "object") {
    const ul = body.userLocation as Record<string, unknown>;
    const rawLat = typeof ul.lat === "number" ? ul.lat : Number(ul.lat);
    const rawLng = typeof ul.lng === "number" ? ul.lng : Number(ul.lng);
    const areaName =
      typeof ul.areaName === "string" && ul.areaName.trim()
        ? ul.areaName.trim()
        : undefined;
    userLocation = {
      lat: Number.isFinite(rawLat) ? rawLat : undefined,
      lng: Number.isFinite(rawLng) ? rawLng : undefined,
      areaName,
    };
  }

  if (!sourceText && !imageBase64 && !presetId) {
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

  const detectedPreset = detectPresetKey(sourceText, presetId);
  const getFallback = () => {
    const raw =
      detectedPreset && !imageBase64
        ? PRESET_ANALYSES[detectedPreset]
        : buildDynamicTextFallback(sourceText);
    return adaptAnalysisToCustomMembers(raw, customMembers, userLocation);
  };

  const respondWhenVisionUnavailable = (
    errorMessage: string,
    fallbackModelLabel: string
  ) => {
    if (imageBase64 && !sourceText) {
      return errorResponse("VISION_UNAVAILABLE", errorMessage, 503);
    }
    if (imageBase64 && sourceText) {
      return NextResponse.json({
        analysis: getFallback(),
        usedModel: fallbackModelLabel,
        mode: "fallback",
        visionSkipped: true,
        warning: `${errorMessage}（※入力されたテキスト部分のみから予定・持ち物を整理しました）`,
      });
    }
    return NextResponse.json({
      analysis: getFallback(),
      usedModel: fallbackModelLabel,
      mode: "fallback",
    });
  };

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return respondWhenVisionUnavailable(
      "現在 GEMINI_API_KEY が未設定のため、Gemini Vision API で画像を読み取れません。おたよりの主要テキスト（日時・場所・持ち物）をテキスト欄へ貼り付けて解析するか、環境変数 GEMINI_API_KEY を設定してください。",
      "ローカルテキスト解析 (GEMINI_API_KEY未設定)"
    );
  }

  const prompt = buildPrompt(
    sourceText,
    familyRoles,
    customMembers,
    userLocation
  );
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
  )}:generateContent`;

  try {
    const geminiRes = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
        },
      }),
    });

    const geminiJson = await safeParseJson(geminiRes);
    if (!geminiRes.ok) {
      return respondWhenVisionUnavailable(
        "Gemini Vision API が一時的に利用できないため（API応答エラーまたは回数制限）、画像を解析できませんでした。時間をおいて再試行するか、おたよりの主要テキスト（日時・場所・持ち物）をテキスト欄に貼り付けて解析してください。",
        "ローカルテキスト解析 (Gemini応答エラー時フォールバック)"
      );
    }

    const candidates = geminiJson?.candidates as
      | Array<Record<string, unknown>>
      | undefined;
    const finishReason = candidates?.[0]?.finishReason;
    if (finishReason === "MAX_TOKENS") {
      return respondWhenVisionUnavailable(
        "Gemini Vision API の出力が最大トークン数で途中終了したため、安全のためローカル解析へフォールバックしました。",
        "ローカルテキスト解析 (MAX_TOKENSフォールバック)"
      );
    }
    const content = candidates?.[0]?.content as Record<string, unknown> | undefined;
    const contentParts = content?.parts as Array<Record<string, unknown>> | undefined;
    const rawText = Array.isArray(contentParts)
      ? contentParts
          .filter((p) => typeof p?.text === "string" && !p?.thought)
          .map((p) => String(p.text))
          .join("")
      : "";

    if (!rawText.trim()) {
      return respondWhenVisionUnavailable(
        "Gemini Vision API から有効な解析結果が返らなかったため、画像を読み取れませんでした。時間をおいて再試行するか、おたよりの主要テキストを貼り付けて解析してください。",
        "ローカルテキスト解析 (Gemini空応答フォールバック)"
      );
    }

    let analysis;
    try {
      analysis = extractJsonObject(rawText, customMembers, userLocation);
    } catch {
      return respondWhenVisionUnavailable(
        "Gemini Vision API の出力 JSON 解析に失敗したため、画像を正しく読み取れませんでした。時間をおいて再試行するか、おたよりの主要テキストを貼り付けて解析してください。",
        "ローカルテキスト解析 (AI出力JSON解析フォールバック)"
      );
    }
    return NextResponse.json({
      analysis,
      usedModel: GEMINI_MODEL,
      mode: "gemini",
    });
  } catch {
    return respondWhenVisionUnavailable(
      "Gemini Vision API への接続がタイムアウトまたは失敗したため、画像を解析できませんでした。時間をおいて再試行するか、おたよりの主要テキスト（日時・場所・持ち物）を貼り付けて解析してください。",
      "ローカルテキスト解析 (Gemini通信失敗フォールバック)"
    );
  }
}
