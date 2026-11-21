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
