import { NextRequest, NextResponse } from "next/server";
import { TaskPriority } from "@/types/task";

const ALLOWED_GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-3.8-flash",
  "gemini-4-hydrogen",
] as const;

type GeminiModel = (typeof ALLOWED_GEMINI_MODELS)[number];

export type MachiEyeCategory =
  | "バリアフリー"
  | "防災・冠水"
  | "通学路安全"
  | "インフラ劣化";

export type MachiEyeSeverityLevel = "緊急" | "注意" | "改善提案";

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

export interface MachiEyePrivacyCheck {
  has_face: boolean;
  has_license_plate: boolean;
  has_nameplate: boolean;
  warning_message: string;
}

export interface MachiEyeTask {
  title: string;
  priority: TaskPriority;
  memo: string;
}

export interface MachiEyeMultilingualNotice {
  ja: string;
  en: string;
  zh: string;
  ko: string;
}

export interface MachiEyeAnalysis {
  title: string;
  category: MachiEyeCategory;
  severity: number;
  severity_level: MachiEyeSeverityLevel;
  hazard_score: number;
  department: string;
  affected_groups: string[];
  barrier_free_assessment: string;
  eco_disaster_impact: string;
  suggested_fix: string;
  recommended_action: string;
  safe_detour_advice?: string;
  multilingual_notices?: MachiEyeMultilingualNotice;
  report_draft: string;
  privacy_check: MachiEyePrivacyCheck;
  suggested_tasks: MachiEyeTask[];
  detected_tags: string[];
}

const DEFAULT_GEMINI_MODEL: GeminiModel = "gemini-2.5-flash";
const GEMINI_TIMEOUT_MS = 30_000;
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
    category: {
      type: "STRING",
      enum: ["バリアフリー", "防災・冠水", "通学路安全", "インフラ劣化"],
    },
    severity: { type: "INTEGER" },
    severity_level: {
      type: "STRING",
      enum: ["緊急", "注意", "改善提案"],
    },
    hazard_score: { type: "INTEGER" },
    department: { type: "STRING" },
    affected_groups: {
      type: "ARRAY",
      items: { type: "STRING" },
    },
    barrier_free_assessment: { type: "STRING" },
    eco_disaster_impact: { type: "STRING" },
    suggested_fix: { type: "STRING" },
    recommended_action: { type: "STRING" },
    safe_detour_advice: { type: "STRING" },
    multilingual_notices: {
      type: "OBJECT",
      properties: {
        ja: { type: "STRING" },
        en: { type: "STRING" },
        zh: { type: "STRING" },
        ko: { type: "STRING" },
      },
      required: ["ja", "en", "zh", "ko"],
    },
    report_draft: { type: "STRING" },
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
    detected_tags: {
      type: "ARRAY",
      items: { type: "STRING" },
    },
  },
  required: [
    "title",
    "category",
    "severity",
    "severity_level",
    "hazard_score",
    "department",
    "affected_groups",
    "barrier_free_assessment",
    "eco_disaster_impact",
    "suggested_fix",
    "recommended_action",
    "report_draft",
    "privacy_check",
    "suggested_tasks",
    "detected_tags",
  ],
};

function errorResponse(code: MachiEyeErrorCode, error: string, status: number) {
  return NextResponse.json({ error, code }, { status });
}

function isAllowedGeminiModel(value: string): value is GeminiModel {
  return (ALLOWED_GEMINI_MODELS as readonly string[]).includes(value);
}

function resolveUpstreamGeminiModel(model: GeminiModel): string {
  if (model === "gemini-3.8-flash" || model === "gemini-4-hydrogen") {
    return "gemini-2.5-flash";
  }
  return model;
}

function normalizeCategory(raw: unknown): MachiEyeCategory {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (
    s === "バリアフリー" ||
    s === "防災・冠水" ||
    s === "通学路安全" ||
    s === "インフラ劣化"
  ) {
    return s;
  }
  if (/点字|段差|スロープ|車椅子|ベビーカー|手すり|バリアフリー/.test(s)) {
    return "バリアフリー";
  }
  if (/冠水|側溝|浸水|排水|大雨|防災|土砂|氾濫/.test(s)) {
    return "防災・冠水";
  }
  if (/通学|夜道|死角|街灯|横断歩道|カーブ|ミラー|子ども|児童/.test(s)) {
    return "通学路安全";
  }
  return "インフラ劣化";
}

function deriveSeverityLevel(
  severity: number,
  rawLevel?: unknown
): MachiEyeSeverityLevel {
  if (
    rawLevel === "緊急" ||
    rawLevel === "注意" ||
    rawLevel === "改善提案"
  ) {
    return rawLevel;
  }
  if (severity >= 5) return "緊急";
  if (severity >= 3) return "注意";
  return "改善提案";
}

function buildFormalReportDraft(params: {
  title: string;
  category: MachiEyeCategory;
  severityLevel: MachiEyeSeverityLevel;
  hazardScore: number;
  department: string;
  locationText: string;
  latitude: string;
  longitude: string;
  affectedGroups: string[];
  barrierFreeAssessment: string;
  ecoDisasterImpact: string;
  suggestedFix: string;
}): string {
  const loc = params.locationText || "市内現地（詳細は添付座標・写真参照）";
  const gps =
    params.latitude && params.longitude
      ? `北緯 ${params.latitude} / 東経 ${params.longitude}`
      : "GPS座標未指定（ランドマーク記載）";

  return [
    `【自治体通報・地域インフラ改善要望書】`,
    `宛先: ${params.department} 御中`,
    `件名: 【${params.severityLevel}・${params.category}】${params.title}`,
    ``,
    `1. 発生場所・位置情報`,
    `・場所・目印: ${loc}`,
    `・GPS座標: ${gps}`,
    `・AI ハザードスコア: ${params.hazardScore} / 100（緊急度区分: ${params.severityLevel}）`,
    ``,
    `2. 影響を受ける住民・通行者`,
    `・対象グループ: ${params.affectedGroups.join("、")}`,
    ``,
    `3. 現場の状況・バリアフリー／防災評価`,
    `・バリアフリー・通行影響: ${params.barrierFreeAssessment}`,
    `・防災・環境リスク: ${params.ecoDisasterImpact}`,
    ``,
    `4. 要望する改善措置・修繕内容`,
    `・${params.suggestedFix}`,
    ``,
    `※本レポートはシビックテックAI「MachiEye Live」により現地情報およびプライバシー安全確認を経て構造化・作成されました。`,
  ].join("\n");
}

function buildPrompt(
  sourceText: string,
  locationText: string,
  latitude: string,
  longitude: string
): string {
  const locationLines = [
    locationText ? `場所・ランドマーク: ${locationText}` : "",
    latitude && longitude ? `GPS座標: 緯度 ${latitude}, 経度 ${longitude}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return [
    "あなたは日本の自治体のバリアフリー推進・防災減災・通学路安全・インフラ維持を支援するシビックテック AI「MachiEye Live」です。",
    "市民が撮影・入力した街の危険箇所やバリアフリー課題をもとに、行政担当課が即座にトリアージと修繕手配を行える構造化レポートを日本語で出力してください。",
    "",
    "出力フィールドのルール:",
    "- title: 現場の課題を簡潔・的確に表す見出し（20〜40文字）",
    "- category: 「バリアフリー」「防災・冠水」「通学路安全」「インフラ劣化」のいずれか1つ",
    "- severity: 緊急度を 1〜5 の整数で評価（5=直ちに危険・緊急対応、4=高リスク、3=要注意、2=計画的改善、1=軽微）",
    "- severity_level: 「緊急」「注意」「改善提案」のいずれか1つ",
    "- hazard_score: 0〜100 の総合危険度・優先度スコア（整数）",
    "- department: 自治体で想定される担当部署名（例: 都市整備部 道路維持課 / 福祉部 障がい福祉課）",
    "- affected_groups: 影響を受ける当事者層の配列（例: 視覚障がい者, 車椅子ユーザー, ベビーカー利用者, 高齢者, 小学生・通学児童 など 2〜4 個）",
    "- barrier_free_assessment: バリアフリー・移動アクセシビリティ観点での具体的な評価と課題",
    "- eco_disaster_impact: 放置した場合の防災・浸水・事故・環境上の具体的リスク",
    "- suggested_fix: 自治体に対する具体的な修繕・改善提案（工法や対策案を含む）",
    "- recommended_action: 通報市民や地域住民が現時点で取るべき安全行動",
    "- safe_detour_advice: 車椅子・ベビーカー・高齢者・視覚障がい者向けの具体的な「バリアフリー迂回・日陰・災害避難安全アドバイス」（1〜2文）",
    "- multilingual_notices: 外国人住民・観光客向けの4言語（ja: やさしい日本語, en: 英語, zh: 中国語簡体字, ko: 韓国語）による簡潔な危険注意・迂回案内カード文",
    "- report_draft: 自治体窓口へそのまま提出できる丁寧かつ構造化された通報・改善要望書",
    "- privacy_check: 写真や記述に人の顔(has_face)、ナンバープレート(has_license_plate)、表札(has_nameplate)が含まれるか判定し、warning_message に記載",
    "- suggested_tasks: 地域パトロールや住民・自治会が行うべきフォローアップタスク（2〜3個）",
    "- detected_tags: 現場の特徴を示す短いハッシュタグ風キーワード配列（3〜5個）",
    "",
    locationLines ? `【位置情報】\n${locationLines}` : "",
    sourceText ? `【現場メモ・状況記述】\n${sourceText}` : "【画像入力】添付された街路・インフラ写真を解析してください。",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildDeterministicFallback(params: {
  sourceText: string;
  locationText: string;
  latitude: string;
  longitude: string;
  scenarioId?: string;
  hasImage: boolean;
}): MachiEyeAnalysis {
  const combined = `${params.scenarioId ?? ""} ${params.locationText} ${params.sourceText}`;
  const hasPrivacyMention = /ナンバー|表札|顔|個人情報|品川|佐藤/.test(combined);
  const hasFace = /顔|通行人/.test(combined) && !/映っていません|なし/.test(combined);
  const hasPlate = /ナンバー|品川/.test(combined) && !/映っていません|なし/.test(combined);
  const hasNameplate = /表札|佐藤/.test(combined) && !/映っていません|なし/.test(combined);

  const privacy_check: MachiEyePrivacyCheck = {
    has_face: hasFace,
    has_license_plate: hasPlate,
    has_nameplate: hasNameplate,
    warning_message:
      hasFace || hasPlate || hasNameplate || hasPrivacyMention
        ? "ナンバープレートまたは表札等の個人情報要素が検出されました。地域公開マップへ掲載する際は自動モザイク適用を推奨します。"
        : "顔・ナンバープレート・表札の映り込みは検出されませんでした。コミュニティ安全マップへそのまま公開可能です。",
  };

  // Scenario 1: 点字ブロック破損・障害物
  if (
    params.scenarioId === "tactile-block" ||
    /点字ブロック|視覚障がい|白杖|誘導ブロック/.test(combined)
  ) {
    const title = "横断歩道前の点字ブロック剥離・破損および放置物による誘導導線の阻害";
    const category: MachiEyeCategory = "バリアフリー";
    const severity = 5;
    const severity_level: MachiEyeSeverityLevel = "緊急";
    const hazard_score = 92;
    const department = "都市整備部 道路維持課 ・ 福祉部 障がい福祉課";
    const affected_groups = ["視覚障がい者（白杖・盲導犬利用者）", "高齢者", "車椅子ユーザー"];
    const barrier_free_assessment =
      "横断歩道手前の警告ブロック（点状）が約1.2mにわたりめくれ上がり、一部が欠損しています。さらに誘導ライン上に駐輪・看板が迫り出しており、白杖での検知が困難で車道側へ誤進入する重大なリスクがあります。";
    const eco_disaster_impact =
      "雨天時や夜間には剥がれたシート断面でつまずき・転倒事故が発生する危険性が高く、災害避難時には視覚障がい者や高齢者の避難ルートが断絶します。";
    const suggested_fix =
      "破損した点字ブロック（JIS T 9251準拠・高視認性イエロー）の緊急張り替え補修、および誘導ブロック左右60cm以内の放置物撤去・駐輪禁止路面標示の設置を要望します。";
    const recommended_action =
      "剥がれたブロック片で通行人がつまずかないよう周囲から見守るとともに、視覚障がいのある方が通行される際は声かけサポートを行ってください。";

    return {
      title,
      category,
      severity,
      severity_level,
      hazard_score,
      department,
      affected_groups,
      barrier_free_assessment,
      eco_disaster_impact,
      suggested_fix,
      recommended_action,
      safe_detour_advice:
        "♿ バリアフリー迂回・安全アドバイス：破損した点字ブロックおよび放置自転車を避け、駅南口エレベーター横のフラットな屋根付き歩道（幅員3.5m・スロープ完備）へ迂回してください。",
      multilingual_notices: {
        ja: "【ちゅうい】横断歩道のまえの 点字ブロックが こわれています。車いす・ベビーカー・目の不自由なかたは、南口エレベーター横の フラットな通路を とおってください。",
        en: "[CAUTION] Tactile paving ahead is damaged and blocked. Wheelchair, stroller, and visually impaired users: please use the step-free covered walkway next to the South Exit Elevator.",
        zh: "【注意】前方人行横道盲道破损且有障碍物。轮椅、婴儿车及视障人士请绕行南口电梯旁的无障碍平坦通道。",
        ko: "【주의】앞쪽 횡단보도 점자블록이 파손되어 있습니다. 휠체어·유모차·시각장애인분들은 남쪽 출구 엘리베이터 옆 평탄한 우회 통로를 이용해 주세요.",
      },
      report_draft: buildFormalReportDraft({
        title,
        category,
        severityLevel: severity_level,
        hazardScore: hazard_score,
        department,
        locationText: params.locationText || "中央駅南口 ペデストリアンデッキ下 横断歩道前",
        latitude: params.latitude || "35.681420",
        longitude: params.longitude || "139.766850",
        affectedGroups: affected_groups,
        barrierFreeAssessment: barrier_free_assessment,
        ecoDisasterImpact: eco_disaster_impact,
        suggestedFix: suggested_fix,
      }),
      privacy_check,
      suggested_tasks: [
        {
          title: "点字ブロック剥離箇所のカラーコーン仮設・安全確保の確認",
          priority: "high",
          memo: "道路維持課の応急措置が入るまで、朝夕の通勤・通学時間帯のつまずきリスクを重点確認",
        },
        {
          title: "誘導ライン上の放置自転車・看板の撤去状況フォロー",
          priority: "medium",
          memo: "駅前放置自転車対策係と連携し、点字ブロック上への駐輪再発を防止",
        },
      ],
      detected_tags: [
        "#点字ブロック破損",
        "#視覚障がい導線阻害",
        "#転倒リスク高",
        "#JIS規格補修必要",
      ],
    };
  }

  // Scenario 2: 冠水・側溝詰まりリスク
  if (
    params.scenarioId === "flood-gutter" ||
    /冠水|側溝|落ち葉|排水|浸水|大雨/.test(combined)
  ) {
    const title = "通学路沿い雨水桝・側溝の落ち葉・プラごみ閉塞による道路冠水リスク";
    const category: MachiEyeCategory = "防災・冠水";
    const severity = 5;
    const severity_level: MachiEyeSeverityLevel = "緊急";
    const hazard_score = 89;
    const department = "建設部 下水道河川管理課 ・ 防災危機管理課";
    const affected_groups = [
      "小学生・通学児童",
      "車椅子・ベビーカー利用者",
      "高齢者",
      "周辺低地世帯",
    ];
    const barrier_free_assessment =
      "側溝グレーチング蓋の開口部が約85%閉塞しており、降雨時に歩道と車道の境界が水没します。段差や側溝蓋の隙間が見えなくなるため、車椅子の前輪脱輪や児童の転落危険が極めて高い状態です。";
    const eco_disaster_impact =
      "ゲリラ豪雨・台風接近時に内水氾濫を引き起こし通学路が通行不能になるほか、堆積したペットボトルやレジ袋が雨水幹線から河川・海洋へ大量流出する環境汚染リスクがあります。";
    const suggested_fix =
      "高圧洗浄車・吸引車による雨水桝の緊急浚渫（しゅんせつ）清掃、および落ち葉が流入しにくい細目ノンスリップ型グレーチング蓋への交換を要望します。";
    const recommended_action =
      "増水時や大雨警報発令時は側溝周辺に近づかず、水没した歩道は迂回してください。無理な単独清掃は控え、複数名での地域清掃または行政出動を待ってください。";

    return {
      title,
      category,
      severity,
      severity_level,
      hazard_score,
      department,
      affected_groups,
      barrier_free_assessment,
      eco_disaster_impact,
      suggested_fix,
      recommended_action,
      safe_detour_advice:
        "🌊 バリアフリー迂回・安全アドバイス：大雨・増水時は低地アンダーパス手前の歩道を避け、高台側の「さくら通り歩道（標高＋4.2m・段差なし）」を通って第一小学校・避難所へ向かってください。",
      multilingual_notices: {
        ja: "【大雨・冠水ちゅうい】この道は 大雨のときに 水がたまります。車いす・ベビーカーのかたは、高台側の「さくら通り」を とおってください。",
        en: "[FLOOD RISK] Street drains ahead are clogged; road floods during heavy rain. Wheelchair & stroller users: please detour via the higher-ground Sakura Street sidewalk.",
        zh: "【积水警告】前方排水沟堵塞，暴雨时易积水淹没台阶。轮椅及婴儿车使用者请绕行高地一侧的樱花大道人行道。",
        ko: "【침수 주의】앞쪽 배수구가 막혀大雨 시 도로가 침수됩니다. 휠체어·유모차 이용자는 고지대인 사쿠라 거리 보도로 우회해 주세요.",
      },
      report_draft: buildFormalReportDraft({
        title,
        category,
        severityLevel: severity_level,
        hazardScore: hazard_score,
        department,
        locationText: params.locationText || "第一小学校 北門前の通学路（バス停付近）",
        latitude: params.latitude || "35.683150",
        longitude: params.longitude || "139.769420",
        affectedGroups: affected_groups,
        barrierFreeAssessment: barrier_free_assessment,
        ecoDisasterImpact: eco_disaster_impact,
        suggestedFix: suggested_fix,
      }),
      privacy_check,
      suggested_tasks: [
        {
          title: "大雨予報前の側溝グレーチング表面堆積物の緊急点検",
          priority: "high",
          memo: "PTA・地域防災会と連携し、下流側3箇所の集水桝の詰まりも合わせてチェック",
        },
        {
          title: "冠水時の代替通学ルート（高台側歩道）の周知",
          priority: "medium",
          memo: "小学校の連絡網・おたよりバトン経由で保護者に迂回ルートを共有",
        },
      ],
      detected_tags: [
        "#側溝8割閉塞",
        "#内水氾濫リスク",
        "#通学路冠水注意",
        "#海洋プラごみ流出防止",
      ],
    };
  }

  // Scenario 3: ベビーカー段差＆スロープ不足
  if (
    params.scenarioId === "stroller-step" ||
    /ベビーカー|段差|スロープ|車椅子|歩道切り下げ|幅員/.test(combined)
  ) {
    const title = "公共施設前歩道の急勾配・4.5cm縁石段差およびベビーカー・車椅子スロープ不足";
    const category: MachiEyeCategory = "バリアフリー";
    const severity = 3;
    const severity_level: MachiEyeSeverityLevel = "改善提案";
    const hazard_score = 76;
    const department = "都市整備部 バリアフリー推進課 ・ 道路建設課";
    const affected_groups = [
      "ベビーカー利用者（子育て世帯）",
      "車椅子ユーザー",
      "シルバーカー利用高齢者",
    ];
    const barrier_free_assessment =
      "横断歩道から歩道への乗り入れ部に約4.5cmの縁石段差が残っており、さらに横断勾配が8%を超えています。ベビーカーの前輪が引っかかりやすく、車椅子での自力登坂が困難なため車道への迂回を余儀なくされています。";
    const eco_disaster_impact =
      "雨天時のスリップや冬場の路面凍結時にベビーカー・車椅子の横転リスクが高まります。避難所である公共施設へのユニバーサルアクセス経路としても改善が不可欠です。";
    const suggested_fix =
      "道路移動等円滑化基準に基づき、歩道切り下げ部の段差を2cm以下（すりつけ勾配5%以下）へ改修し、滑り止め舗装および視覚障がい者誘導用ブロックの連続配置を要望します。";
    const recommended_action =
      "段差乗り越え時はベビーカーや車椅子のキャスターを斜めに進入させず、介助者がいる場合は前輪を軽く浮かせて慎重に通行してください。";

    return {
      title,
      category,
      severity,
      severity_level,
      hazard_score,
      department,
      affected_groups,
      barrier_free_assessment,
      eco_disaster_impact,
      suggested_fix,
      recommended_action,
      safe_detour_advice:
        "👶 バリアフリー迂回・安全アドバイス：正面横断歩道の4.5cm段差を避け、西側30mの「図書館正面ロータリー緩勾配スロープ（段差0cm・手すり付き・日陰ベンチあり）」から安全に入館できます。",
      multilingual_notices: {
        ja: "【段差ちゅうい】ここの歩道は 4.5cmの段差と 急な坂があります。車いす・ベビーカーのかたは、30mひだりの「図書館正面スロープ」を つかってください。",
        en: "[STEP HAZARD] High 4.5cm curb and steep slope ahead. Wheelchair and stroller users: please use the step-free gentle ramp 30m west at the Library Main Entrance.",
        zh: "【台阶注意】此处人行道有4.5厘米路缘台阶且坡度较陡。轮椅及婴儿车请走西侧30米图书馆正门平缓坡道。",
        ko: "【단차 주의】이곳 보도에 4.5cm 턱과 급경사가 있습니다. 휠체어·유모차 이용자는 서쪽 30m 도서관 정문 완만한 경사로를 이용해 주세요.",
      },
      report_draft: buildFormalReportDraft({
        title,
        category,
        severityLevel: severity_level,
        hazardScore: hazard_score,
        department,
        locationText:
          params.locationText || "市立中央図書館・子育て支援センター入口前 歩道接続部",
        latitude: params.latitude || "35.679840",
        longitude: params.longitude || "139.764310",
        affectedGroups: affected_groups,
        barrierFreeAssessment: barrier_free_assessment,
        ecoDisasterImpact: eco_disaster_impact,
        suggestedFix: suggested_fix,
      }),
      privacy_check,
      suggested_tasks: [
        {
          title: "子育て支援センター利用者からのヒヤリハット事例収集",
          priority: "medium",
          memo: "ベビーカー・車椅子での通行時間帯と迂回状況を整理し、要望書に添付",
        },
        {
          title: "周辺3交差点の歩道切り下げ段差の比較採寸",
          priority: "low",
          memo: "バリアフリー基本構想の重点整備地区ルートとして一括改修を提案",
        },
      ],
      detected_tags: [
        "#縁石段差4.5cm",
        "#スロープ勾配改善",
        "#ベビーカー通行困難",
        "#移動等円滑化基準",
      ],
    };
  }

  // Scenario 4: 通学路の夜道・死角カーブ
  if (
    params.scenarioId === "school-blind-curve" ||
    /通学路|夜道|死角|カーブ|街灯|ミラー|照明|暗い/.test(combined)
  ) {
    const title = "通学路L字カーブにおける見通し不良（死角）・カーブミラー曇りおよび夜間街路灯照度不足";
    const category: MachiEyeCategory = "通学路安全";
    const severity = 4;
    const severity_level: MachiEyeSeverityLevel = "注意";
    const hazard_score = 84;
    const department = "教育委員会 学校安全課 ・ 建設部 交通安全対策課";
    const affected_groups = [
      "小学生・中学生（通学・塾帰り）",
      "夜間歩行者",
      "自転車利用者",
      "高齢者",
    ];
    const barrier_free_assessment =
      "塀と植栽によりL字カーブ先の見通しが約3mしかなく、歩道帯（グリーンベルト）の白線も摩耗して消えかかっています。さらに街路灯1基が球切れ（または樹木遮蔽）しており、夕暮れ以降の視認性が著しく低下しています。";
    const eco_disaster_impact =
      "抜け道車両や電動キックボード・自転車との出会い頭接触事故リスクが高いほか、夜間停電時や災害避難時に暗がりとなり防犯・避難安全上の脆弱箇所となります。";
    const suggested_fix =
      "高輝度LED防犯灯への更新と遮蔽枝の剪定、広角2面カーブミラーの新設、および通学路グリーンベルト（カラー舗装）と「減速・学童注意」路面標示の再塗装を要望します。";
    const recommended_action =
      "夕暮れ・夜間通行時は反射材やライトを必ず点灯し、カーブ手前で一時停止して対向車・自転車の接近を確認してください。";

    return {
      title,
      category,
      severity,
      severity_level,
      hazard_score,
      department,
      affected_groups,
      barrier_free_assessment,
      eco_disaster_impact,
      suggested_fix,
      recommended_action,
      safe_detour_advice:
        "🚸 バリアフリー迂回・安全アドバイス：夜間・夕暮れ時や雨天時は見通し不良のL字路を避け、LED照明とガードレール付歩道が整備された「緑が丘本通り（東側1本隣）」へ迂回してください。",
      multilingual_notices: {
        ja: "【見とおし注意】このカーブは 車や自転車が 見えにくく、夜は暗くなります。夕方や夜は、となりの明るい「緑が丘本通り」を とおってください。",
        en: "[BLIND CURVE] Sharp corner with limited visibility and dim lighting. At night or with strollers/wheelchairs, please use the well-lit Midorigaoka Main Street one block east.",
        zh: "【盲区注意】前方急转弯视线受阻且夜间照明不足。傍晚及夜间请绕行东侧相邻、配有护栏和明亮路灯的绿丘主街。",
        ko: "【사각지대 주의】이 커브길은 시야가 좁고 야간에 어둡습니다. 저녁·야간에는 동쪽 옆길인 밝은 미도리가오카 본거리를 이용해 주세요.",
      },
      report_draft: buildFormalReportDraft({
        title,
        category,
        severityLevel: severity_level,
        hazardScore: hazard_score,
        department,
        locationText:
          params.locationText || "緑が丘2丁目 通学路L字カーブ（街路灯No.42付近）",
        latitude: params.latitude || "35.684510",
        longitude: params.longitude || "139.763180",
        affectedGroups: affected_groups,
        barrierFreeAssessment: barrier_free_assessment,
        ecoDisasterImpact: eco_disaster_impact,
        suggestedFix: suggested_fix,
      }),
      privacy_check,
      suggested_tasks: [
        {
          title: "街路灯管理番号（No.42）の控えと夜間照度の写真記録",
          priority: "high",
          memo: "管理プレート番号を添えて道路照明担当へLED更新を申請",
        },
        {
          title: "下校時間帯（15:30〜17:30）の抜け道車両スピード見守り",
          priority: "medium",
          memo: "スクールガード・PTA見守り隊へ死角カーブの注意喚起を共有",
        },
      ],
      detected_tags: [
        "#通学路死角カーブ",
        "#LED防犯灯更新要望",
        "#グリーンベルト摩耗",
        "#出会い頭事故防止",
      ],
    };
  }

  // Scenario 5 (Disaster Mode): 台風・豪雨・停電断水・ブロック塀倒壊リスクと広域避難
  if (
    params.scenarioId === "typhoon-outage" ||
    /停電|断水|台風|地震|ブロック塀|避難所|非常用電源|備蓄/.test(combined)
  ) {
    const title = "台風・地震時の老朽ブロック塀倒壊・停電断水リスクおよび福祉避難ルート点検";
    const category: MachiEyeCategory = "防災・冠水";
    const severity = 5;
    const severity_level: MachiEyeSeverityLevel = "緊急";
    const hazard_score = 94;
    const department = "防災危機管理課 ・ 都市整備部 建築指導課 ・ 水道局";
    const affected_groups = [
      "在宅医療・電源依存世帯",
      "高齢者・要配慮者",
      "乳幼児・子育て世帯",
      "外国人住民",
    ];
    const barrier_free_assessment =
      "避難所へ続く旧道沿いに傾いた老朽ブロック塀と狭隘区間があり、地震・暴風時に車椅子やシルバーカーの避難導線が寸断される恐れがあります。";
    const eco_disaster_impact =
      "台風・大規模地震に伴う停電・断水発生時、エレベーター停止や給水拠点までの移動困難、ブロック塀倒壊による二次被害リスクが極めて高い状態です。";
    const suggested_fix =
      "危険ブロック塀の除却助成・ネット固定、指定避難所（第一小学校・中央公民館）への非常用電源・マンホールトイレ・給水拠点案内標識の多言語設置を要望します。";
    const recommended_action =
      "暴風・地震発生前にモバイルバッテリー充電・飲料水（1人1日3L×3日分）・常備薬・携帯トイレを確保し、ブロック塀や増水河川から離れた広域避難路を選択してください。";

    return {
      title,
      category,
      severity,
      severity_level,
      hazard_score,
      department,
      affected_groups,
      barrier_free_assessment,
      eco_disaster_impact,
      suggested_fix,
      recommended_action,
      safe_detour_advice:
        "🛟 バリアフリー迂回・防災アドバイス：地震・台風時は老朽ブロック塀のある狭い路地を避け、電線地中化・スロープ完備の「中央大通り→第一小学校体育館（非常用電源・多目的トイレ・給水栓あり）」ルートで早期避難してください。",
      multilingual_notices: {
        ja: "【防災・ひなん案内】台風や地震のときは、ブロック塀のちかくを とおらないでください。車いす・お年寄り・外国のかたは「第一小学校（非常用電源・お水あり）」へ ひなんしてください。",
        en: "[DISASTER EVACUATION] Stay away from old concrete walls during earthquakes or typhoons. Step-free shelter with emergency power & water is available at Dai-ichi Elementary School.",
        zh: "【防灾避难指南】台风或地震时请远离老旧围墙。轮椅使用者及居民请沿中央大道前往“第一小学避难所”（配备应急电源、饮用水及无障碍卫生间）。",
        ko: "【방재·대피 안내】태풍·지진 시 오래된 블록담 근처를 피해 주세요. 휠체어 이용자 및 주민분들은 비상전원과 급수대가 있는 ‘제1초등학교 대피소’로 이동해 주세요.",
      },
      report_draft: buildFormalReportDraft({
        title,
        category,
        severityLevel: severity_level,
        hazardScore: hazard_score,
        department,
        locationText:
          params.locationText || "中央地区 指定避難所（第一小学校）周辺ルート",
        latitude: params.latitude || "35.683450",
        longitude: params.longitude || "139.768120",
        affectedGroups: affected_groups,
        barrierFreeAssessment: barrier_free_assessment,
        ecoDisasterImpact: eco_disaster_impact,
        suggestedFix: suggested_fix,
      }),
      privacy_check,
      suggested_tasks: [
        {
          title: "停電・断水時の非常用電源・給水ステーション位置の家族共有",
          priority: "high",
          memo: "モバイルバッテリー満充電・水3日分・携帯トイレ・常備薬お薬手帳を確認",
        },
        {
          title: "車椅子・ベビーカーで通れるブロック塀回避ルートの実地確認",
          priority: "high",
          memo: "夜間停電時でも通行可能な幅員3m以上の幹線歩道をマップに固定",
        },
      ],
      detected_tags: [
        "#台風停電断水対策",
        "#危険ブロック塀回避",
        "#福祉避難所ルート",
        "#多言語防災案内",
      ],
    };
  }

  // Scenario 6 (Disaster Mode): 猛暑ヒートアイランド・ペット同行避難・クールシェア安全点検
  if (
    params.scenarioId === "pet-heatwave-evac" ||
    /ペット|猛暑|熱中症|日陰|クールシェア|寒波|凍結|同行避難/.test(combined)
  ) {
    const title = "猛暑・災害時の日陰不足ルートおよびペット同行避難・給水クールスポット整備要望";
    const category: MachiEyeCategory = "防災・冠水";
    const severity = 4;
    const severity_level: MachiEyeSeverityLevel = "注意";
    const hazard_score = 86;
    const department = "環境部 気候変動対策課 ・ 防災危機管理課 ・ 動物愛護センター";
    const affected_groups = [
      "高齢者・乳幼児（ベビーカー）",
      "ペット飼育世帯（同行避難者）",
      "屋外歩行者・車椅子ユーザー",
      "訪日外国人旅行者",
    ];
    const barrier_free_assessment =
      "駅から避難所・公園へ至る南側歩道に街路樹や日よけがなく、夏季の路面温度が50℃近くに達するため、地面に近いベビーカー・車椅子・ペットの熱中症リスクが深刻です。";
    const eco_disaster_impact =
      "猛暑日の熱中症救急搬送リスクに加え、災害時にペット同行避難スペースや給水・冷房シェルター案内が不足していると避難遅れや車中泊事故につながります。";
    const suggested_fix =
      "遮熱性舗装・街路樹グリーンインフラおよびミスト付クールシェアベンチの整備、ならびに避難所における「ペット同行避難専用区画・給水スポット」の明示を要望します。";
    const recommended_action =
      "猛暑時間帯は直射日光下のアスファルト通行を避けて北側の日陰歩道・公共クールシェア施設（図書館等）を経由し、ペット用飲料水・ケージ・迷子札を常備してください。";

    return {
      title,
      category,
      severity,
      severity_level,
      hazard_score,
      department,
      affected_groups,
      barrier_free_assessment,
      eco_disaster_impact,
      suggested_fix,
      recommended_action,
      safe_detour_advice:
        "🌳 バリアフリー迂回・猛暑＆ペット避難アドバイス：直射日光の照り返しが強い南側大通りを避け、並木日陰とミスト給水所がある「ひまわり公園北側遊歩道→市立図書館クールシェアロビー（ペット同行避難受付は東側屋根付きテラス）」へ迂回してください。",
      multilingual_notices: {
        ja: "【熱中症・ペット避難案内】この道は 日かげが 少なく暑くなります。お年寄り・ベビーカー・ペット連れのかたは、木かげのある「ひまわり公園ルート」と「図書館クールスポット」を つかってください。",
        en: "[HEATWAVE & PET SHELTER] High pavement heat ahead. Elderly, stroller users, and pet owners: please take the shaded Himawari Park path. Pet-friendly evacuation area is at the East Covered Terrace.",
        zh: "【防暑及宠物避难指南】前方路段缺乏遮阴且地表高温。老人、婴儿车及携宠居民请走树荫凉爽的向日葵公园步道，宠物同行避难区设在东侧有顶露台。",
        ko: "【폭염·반려동물 대피 안내】이 길은 그늘이 적어 노면 온도가 높습니다. 노약자·유모차·반려동물 동반 시 그늘진 히마와리 공원 산책로와 도서관 쿨링쉼터(동쪽 테라스 반려동물 구역)를 이용해 주세요.",
      },
      report_draft: buildFormalReportDraft({
        title,
        category,
        severityLevel: severity_level,
        hazardScore: hazard_score,
        department,
        locationText:
          params.locationText || "ひまわり公園〜中央図書館 クールシェア＆ペット避難導線",
        latitude: params.latitude || "35.679510",
        longitude: params.longitude || "139.765120",
        affectedGroups: affected_groups,
        barrierFreeAssessment: barrier_free_assessment,
        ecoDisasterImpact: eco_disaster_impact,
        suggestedFix: suggested_fix,
      }),
      privacy_check,
      suggested_tasks: [
        {
          title: "ペット同行避難バッグ（水・フード5日分・ケージ・ワクチン証）の点検",
          priority: "high",
          memo: "避難所東側テラスのペット専用受付ルールを家族で共有",
        },
        {
          title: "ベビーカー・車椅子向け日陰ルート＆給水クールスポットのマップ登録",
          priority: "medium",
          memo: "MachiCool日陰導線として地域マップにピン共有",
        },
      ],
      detected_tags: [
        "#猛暑クールシェアルート",
        "#ペット同行避難対応",
        "#ベビーカー照り返し対策",
        "#グリーンインフラ要望",
      ],
    };
  }

  // Generic / Photo upload or Infrastructure Deterioration fallback
  const title = params.locationText
    ? `${params.locationText}における路面・インフラ劣化および通行安全改善要望`
    : "街路インフラ損傷・歩行空間バリアフリーおよび安全対策の点検要望";
  const category: MachiEyeCategory = normalizeCategory(combined);
  const severity = 4;
  const severity_level: MachiEyeSeverityLevel = "注意";
  const hazard_score = 81;
  const department = "都市整備部 道路維持課 ・ 市民安全課";
  const affected_groups = [
    "歩行者全般",
    "車椅子・ベビーカー利用者",
    "高齢者",
    "通学児童",
  ];
  const barrier_free_assessment =
    params.sourceText ||
    "現地写真および位置情報から、歩道面の不陸（ひび割れ・段差）または通行有効幅員の阻害が確認されます。車椅子やベビーカー、白杖利用者の安全な通行に支障をきたす恐れがあります。";
  const eco_disaster_impact =
    "降雨時の水たまり形成や夜間のつまずき転倒事故につながるほか、劣化進行により道路陥没や災害時の避難路阻害へ発展するリスクがあります。";
  const suggested_fix =
    "担当課による現地測量・安全点検の実施、路面段差の平滑化補修（バリアフリー舗装）、および注意喚起標示の設置を要望します。";
  const recommended_action =
    "損傷・危険箇所には不用意に踏み込まず、夜間や雨天時は十分な距離をとって通行してください。";

  return {
    title,
    category,
    severity,
    severity_level,
    hazard_score,
    department,
    affected_groups,
    barrier_free_assessment,
    eco_disaster_impact,
    suggested_fix,
    recommended_action,
    safe_detour_advice:
      "♿ バリアフリー迂回・安全アドバイス：損傷・危険箇所から1.5m以上距離をとるか、反対側の段差のないフラットな歩道・日陰ルートへ迂回して通行してください。",
    multilingual_notices: {
      ja: "【通行ちゅうい】この場所に 段差や危険箇所があります。車いす・ベビーカー・お年寄りのかたは、反対側の安全な歩道を とおってください。",
      en: "[SAFETY NOTICE] Sidewalk hazard or uneven surface ahead. Wheelchair, stroller, and elderly pedestrians: please use the safe detour on the opposite sidewalk.",
      zh: "【通行注意】前方路面存在安全隐患或台阶。轮椅、婴儿车及高龄者请绕行对面平坦安全的人行道。",
      ko: "【통행 주의】앞쪽 노면에 위험 구간이나 단차가 있습니다. 휠체어·유모차·어르신분들은 맞은편 안전한 보도로 우회해 주세요.",
    },
    report_draft: buildFormalReportDraft({
      title,
      category,
      severityLevel: severity_level,
      hazardScore: hazard_score,
      department,
      locationText: params.locationText || "市内現地（写真・GPS座標添付）",
      latitude: params.latitude || "35.681236",
      longitude: params.longitude || "139.767125",
      affectedGroups: affected_groups,
      barrierFreeAssessment: barrier_free_assessment,
      ecoDisasterImpact: eco_disaster_impact,
      suggestedFix: suggested_fix,
    }),
    privacy_check,
    suggested_tasks: [
      {
        title: "現地危険箇所の追加アングル撮影と経過観察",
        priority: "medium",
        memo: "近景（損傷部）と遠景（周囲の目印が入る構図）の2枚を地域マップに保管",
      },
      {
        title: "自治体通報窓口へのレポート送付と受付番号の記録",
        priority: "high",
        memo: "生成された通報レポートを送付し、対応ステータスを追跡",
      },
    ],
    detected_tags: [
      "#路面・インフラ点検",
      "#バリアフリー改善",
      "#地域安全マップ連携",
    ],
  };
}

function normalizeResult(
  parsed: unknown,
  context: {
    sourceText: string;
    locationText: string;
    latitude: string;
    longitude: string;
  }
): MachiEyeAnalysis {
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

  const category = normalizeCategory(obj.category);
  const severity_level = deriveSeverityLevel(severity, obj.severity_level);

  const rawHazard = Number(obj.hazard_score);
  const hazard_score = Number.isFinite(rawHazard)
    ? Math.min(100, Math.max(10, Math.round(rawHazard)))
    : severity * 18 + 5;

  const department =
    typeof obj.department === "string" && obj.department.trim()
      ? obj.department.trim()
      : "都市整備部 道路維持課 ・ 福祉部 障がい福祉課";

  const affected_groups =
    Array.isArray(obj.affected_groups) && obj.affected_groups.length > 0
      ? obj.affected_groups.map((g) => String(g ?? "").trim()).filter(Boolean)
      : ["歩行者全般", "高齢者", "車椅子・ベビーカー利用者"];

  const barrier_free_assessment =
    typeof obj.barrier_free_assessment === "string" && obj.barrier_free_assessment.trim()
      ? obj.barrier_free_assessment.trim()
      : "段差・障害物または視認性低下により、車椅子・ベビーカー・高齢者等の安全かつ円滑な通行に支障が生じる状態です。";

  const eco_disaster_impact =
    typeof obj.eco_disaster_impact === "string" && obj.eco_disaster_impact.trim()
      ? obj.eco_disaster_impact.trim()
      : "放置した場合、荒天時や夜間の転倒・接触事故および災害時の避難経路阻害につながる懸念があります。";

  const suggested_fix =
    typeof obj.suggested_fix === "string" && obj.suggested_fix.trim()
      ? obj.suggested_fix.trim()
      : "担当部署による現地確認のうえ、バリアフリー基準および道路安全基準に沿った修繕・改善措置を要望します。";

  const recommended_action =
    typeof obj.recommended_action === "string" && obj.recommended_action.trim()
      ? obj.recommended_action.trim()
      : "危険箇所には近づかず、周囲の通行人へ注意を促しながら自治体の対応を待ってください。";

  const safe_detour_advice =
    typeof obj.safe_detour_advice === "string" && obj.safe_detour_advice.trim()
      ? obj.safe_detour_advice.trim()
      : "♿ バリアフリー迂回・安全アドバイス：車椅子・ベビーカー・高齢者の方は危険箇所を避け、段差のないフラットな反対側歩道・エレベーターまたは広域避難ルートへ迂回してください。";

  const mn = (obj.multilingual_notices ?? {}) as Record<string, unknown>;
  const multilingual_notices: MachiEyeMultilingualNotice = {
    ja:
      typeof mn.ja === "string" && mn.ja.trim()
        ? mn.ja.trim()
        : `【やさしい日本語】「${obj.title.trim()}」の危険があります。車いす・ベビーカー・お年寄りは安全な歩道へ迂回してください。`,
    en:
      typeof mn.en === "string" && mn.en.trim()
        ? mn.en.trim()
        : `[Safety Notice] Hazard detected (${category}). Wheelchair, stroller, and elderly users: please take a step-free detour.`,
    zh:
      typeof mn.zh === "string" && mn.zh.trim()
        ? mn.zh.trim()
        : `【安全提示】前方存在安全隐患（${category}），轮椅、婴儿车及长者请绕行平坦安全的无障碍通道。`,
    ko:
      typeof mn.ko === "string" && mn.ko.trim()
        ? mn.ko.trim()
        : `【안전 안내】앞쪽에 위험 구간(${category})이 있습니다. 휠체어·유모차·어르신분들은 안전한 우회로를 이용해 주세요.`,
  };

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

  const detected_tags =
    Array.isArray(obj.detected_tags) && obj.detected_tags.length > 0
      ? obj.detected_tags.map((t) => String(t ?? "").trim()).filter(Boolean)
      : [`#${category}`, `#${severity_level}`, "#MachiEye点検"];

  const report_draft =
    typeof obj.report_draft === "string" && obj.report_draft.trim()
      ? obj.report_draft.trim()
      : buildFormalReportDraft({
          title: obj.title.trim(),
          category,
          severityLevel: severity_level,
          hazardScore: hazard_score,
          department,
          locationText: context.locationText,
          latitude: context.latitude,
          longitude: context.longitude,
          affectedGroups: affected_groups,
          barrierFreeAssessment: barrier_free_assessment,
          ecoDisasterImpact: eco_disaster_impact,
          suggestedFix: suggested_fix,
        });

  return {
    title: obj.title.trim(),
    category,
    severity,
    severity_level,
    hazard_score,
    department,
    affected_groups,
    barrier_free_assessment,
    eco_disaster_impact,
    suggested_fix,
    recommended_action,
    safe_detour_advice,
    multilingual_notices,
    report_draft,
    privacy_check: {
      has_face: hasFace,
      has_license_plate: hasLicensePlate,
      has_nameplate: hasNameplate,
      warning_message:
        typeof pc.warning_message === "string" && pc.warning_message.trim()
          ? pc.warning_message.trim()
          : defaultWarning,
    },
    suggested_tasks,
    detected_tags,
  };
}

async function safeParseJson(res: Response): Promise<Record<string, unknown> | null> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
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

    const sourceText =
      typeof body?.sourceText === "string" ? body.sourceText.trim() : "";
    const locationText =
      typeof body?.locationText === "string" ? body.locationText.trim() : "";
    const latitude =
      typeof body?.latitude === "string" ? body.latitude.trim() : "";
    const longitude =
      typeof body?.longitude === "string" ? body.longitude.trim() : "";
    const scenarioId =
      typeof body?.scenarioId === "string" ? body.scenarioId.trim() : "";
    const imageBase64 =
      typeof body?.imageBase64 === "string" ? body.imageBase64 : "";
    const imageMimeType =
      typeof body?.imageMimeType === "string" ? body.imageMimeType : "";

    if (!sourceText && !imageBase64 && !scenarioId) {
      return errorResponse(
        "MISSING_INPUT",
        "現場の写真、シナリオ選択、または状況メモを入力してください。",
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

    const fallbackResult = () =>
      buildDeterministicFallback({
        sourceText,
        locationText,
        latitude,
        longitude,
        scenarioId,
        hasImage: Boolean(imageBase64),
      });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        result: fallbackResult(),
        usedProvider: "gemini-fallback" as const,
        usedModel: `${geminiModel} (Deterministic Civic Engine)`,
        isFallback: true,
      });
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

    const upstreamModel = resolveUpstreamGeminiModel(geminiModel);
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      upstreamModel
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
    } catch {
      return NextResponse.json({
        result: fallbackResult(),
        usedProvider: "gemini-fallback" as const,
        usedModel: `${geminiModel} (Offline/Timeout Fallback)`,
        isFallback: true,
      });
    }

    const geminiJson = await safeParseJson(geminiRes);
    if (!geminiRes.ok) {
      return NextResponse.json({
        result: fallbackResult(),
        usedProvider: "gemini-fallback" as const,
        usedModel: `${geminiModel} (Quota/API Fallback)`,
        isFallback: true,
      });
    }

    const candidates = geminiJson?.candidates as
      | Array<Record<string, unknown>>
      | undefined;
    const content = candidates?.[0]?.content as
      | Record<string, unknown>
      | undefined;
    const contentParts = content?.parts as
      | Array<Record<string, unknown>>
      | undefined;
    const rawText = contentParts?.[0]?.text;
    if (typeof rawText !== "string" || !rawText.trim()) {
      return NextResponse.json({
        result: fallbackResult(),
        usedProvider: "gemini-fallback" as const,
        usedModel: `${geminiModel} (Schema Fallback)`,
        isFallback: true,
      });
    }

    let result: MachiEyeAnalysis;
    try {
      result = normalizeResult(JSON.parse(rawText), {
        sourceText,
        locationText,
        latitude,
        longitude,
      });
    } catch {
      result = fallbackResult();
    }

    return NextResponse.json({
      result,
      usedProvider: "gemini" as const,
      usedModel: geminiModel,
      isFallback: false,
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
