"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";

export type MachiEyeCategory =
  | "バリアフリー"
  | "防災・冠水"
  | "通学路安全"
  | "インフラ劣化";

export type MachiEyeSeverityLevel = "緊急" | "注意" | "改善提案";

export type PinWorkflowStatus = "未対応" | "自治体通報済" | "改善完了";

export interface MachiEyePrivacyCheck {
  has_face: boolean;
  has_license_plate: boolean;
  has_nameplate: boolean;
  warning_message: string;
}

export interface MachiEyeTask {
  title: string;
  priority: "high" | "medium" | "low";
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

export interface CommunitySafetyPin {
  id: string;
  createdAt: string;
  locationText: string;
  latitude: string;
  longitude: string;
  mapX: number; // 0 - 100 (%)
  mapY: number; // 0 - 100 (%)
  sourceText: string;
  imagePreview?: string;
  upvotes: number;
  workflowStatus: PinWorkflowStatus;
  usedModel: string;
  analysis: MachiEyeAnalysis;
}

interface ScenarioPreset {
  id: string;
  mode: "hazard" | "disaster";
  badge: string;
  shortTitle: string;
  subtitle: string;
  category: MachiEyeCategory;
  severityLevel: MachiEyeSeverityLevel;
  locationText: string;
  latitude: string;
  longitude: string;
  mapX: number;
  mapY: number;
  sourceText: string;
  initialAnalysis: MachiEyeAnalysis;
}

const STORAGE_KEY = "machieye_live_community_pins_v3";
const ACCEPTED_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_IMAGE_DIM = 1600;
const GOOGLE_MAPS_API_KEY = (
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""
).trim();

interface GoogleLatLngLiteral {
  lat: number;
  lng: number;
}

interface GoogleMapMouseEvent {
  latLng?: {
    lat: () => number;
    lng: () => number;
  } | null;
}

interface GoogleMapInstance {
  setCenter: (latlng: GoogleLatLngLiteral) => void;
  panTo: (latlng: GoogleLatLngLiteral) => void;
  setZoom: (zoom: number) => void;
  addListener: (
    eventName: string,
    handler: (e: GoogleMapMouseEvent) => void
  ) => { remove: () => void };
}

interface GoogleMarkerInstance {
  setMap: (map: GoogleMapInstance | null) => void;
  setPosition: (latlng: GoogleLatLngLiteral) => void;
  addListener: (eventName: string, handler: () => void) => void;
}

interface GoogleInfoWindowInstance {
  setContent: (content: string) => void;
  open: (map: GoogleMapInstance, marker: GoogleMarkerInstance) => void;
}

interface GoogleMapsNamespace {
  Map: new (
    el: HTMLElement,
    opts: Record<string, unknown>
  ) => GoogleMapInstance;
  Marker: new (opts: Record<string, unknown>) => GoogleMarkerInstance;
  InfoWindow: new (opts?: Record<string, unknown>) => GoogleInfoWindowInstance;
  SymbolPath: {
    CIRCLE: number;
  };
}

interface WindowWithGoogleMaps {
  google?: {
    maps?: GoogleMapsNamespace;
  };
  gm_authFailure?: () => void;
}

const CATEGORY_LIST: MachiEyeCategory[] = [
  "バリアフリー",
  "防災・冠水",
  "通学路安全",
  "インフラ劣化",
];

const SEVERITY_LIST: MachiEyeSeverityLevel[] = ["緊急", "注意", "改善提案"];

const BUILTIN_SCENARIOS: ScenarioPreset[] = [
  {
    id: "tactile-block",
    mode: "hazard",
    badge: "🦯 日常点検1",
    shortTitle: "点字ブロック破損・障害物",
    subtitle: "視覚障がい導線の剥離と放置物リスク",
    category: "バリアフリー",
    severityLevel: "緊急",
    locationText: "中央駅南口 ペデストリアンデッキ下 横断歩道前",
    latitude: "35.681420",
    longitude: "139.766850",
    mapX: 28,
    mapY: 42,
    sourceText:
      "駅前横断歩道手前の点字ブロック（警告ブロック）が約1.2mにわたり剥がれてめくれ上がっており、さらに誘導ブロックの上に放置自転車と立て看板が置かれて視覚障がい者の白杖導線が完全に塞がれています。高齢者や車椅子のつまずき危険も高い状態です。",
    initialAnalysis: {
      title: "横断歩道前の点字ブロック剥離・破損および放置物による誘導導線の阻害",
      category: "バリアフリー",
      severity: 5,
      severity_level: "緊急",
      hazard_score: 92,
      department: "都市整備部 道路維持課 ・ 福祉部 障がい福祉課",
      affected_groups: [
        "視覚障がい者（白杖・盲導犬利用者）",
        "高齢者",
        "車椅子ユーザー",
      ],
      barrier_free_assessment:
        "横断歩道手前の警告ブロック（点状）が約1.2mにわたりめくれ上がり、一部が欠損しています。さらに誘導ライン上に駐輪・看板が迫り出しており、白杖での検知が困難で車道側へ誤進入する重大なリスクがあります。",
      eco_disaster_impact:
        "雨天時や夜間には剥がれたシート断面でつまずき・転倒事故が発生する危険性が高く、災害避難時には視覚障がい者や高齢者の避難ルートが断絶します。",
      suggested_fix:
        "破損した点字ブロック（JIS T 9251準拠・高視認性イエロー）の緊急張り替え補修、および誘導ブロック左右60cm以内の放置物撤去・駐輪禁止路面標示の設置を要望します。",
      recommended_action:
        "剥がれたブロック片で通行人がつまずかないよう周囲から見守るとともに、視覚障がいのある方が通行される際は声かけサポートを行ってください。",
      safe_detour_advice:
        "♿ バリアフリー迂回・安全アドバイス：破損した点字ブロックおよび放置自転車を避け、駅南口エレベーター横のフラットな屋根付き歩道（幅員3.5m・スロープ完備）へ迂回してください。",
      multilingual_notices: {
        ja: "【ちゅうい】横断歩道のまえの 点字ブロックが こわれています。車いす・ベビーカー・目の不自由なかたは、南口エレベーター横の フラットな通路を とおってください。",
        en: "[CAUTION] Tactile paving ahead is damaged and blocked. Wheelchair, stroller, and visually impaired users: please use the step-free covered walkway next to the South Exit Elevator.",
        zh: "【注意】前方人行横道盲道破损且有障碍物。轮椅、婴儿车及视障人士请绕行南口电梯旁的无障碍平坦通道。",
        ko: "【주의】앞쪽 횡단보도 점자블록이 파손되어 있습니다. 휠체어·유모차·시각장애인분들은 남쪽 출구 엘리베이터 옆 평탄한 우회 통로를 이용해 주세요.",
      },
      report_draft: [
        "【自治体通報・地域インフラ改善要望書】",
        "宛先: 都市整備部 道路維持課 ・ 福祉部 障がい福祉課 御中",
        "件名: 【緊急・バリアフリー】横断歩道前の点字ブロック剥離・破損および放置物による誘導導線の阻害",
        "",
        "1. 発生場所・位置情報",
        "・場所・目印: 中央駅南口 ペデストリアンデッキ下 横断歩道前",
        "・GPS座標: 北緯 35.681420 / 東経 139.766850",
        "・AI ハザードスコア: 92 / 100（緊急度区分: 緊急）",
        "",
        "2. 影響を受ける住民・通行者",
        "・対象グループ: 視覚障がい者（白杖・盲導犬利用者）、高齢者、車椅子ユーザー",
        "",
        "3. 現場の状況・バリアフリー／防災評価",
        "・バリアフリー・通行影響: 横断歩道手前の警告ブロック（点状）が約1.2mにわたりめくれ上がり、一部が欠損しています。さらに誘導ライン上に駐輪・看板が迫り出しており、白杖での検知が困難で車道側へ誤進入する重大なリスクがあります。",
        "・防災・環境リスク: 雨天時や夜間には剥がれたシート断面でつまずき・転倒事故が発生する危険性が高く、災害避難時には視覚障がい者や高齢者の避難ルートが断絶します。",
        "",
        "4. 要望する改善措置・修繕内容",
        "・破損した点字ブロック（JIS T 9251準拠・高視認性イエロー）の緊急張り替え補修、および誘導ブロック左右60cm以内の放置物撤去・駐輪禁止路面標示の設置を要望します。",
      ].join("\n"),
      privacy_check: {
        has_face: false,
        has_license_plate: false,
        has_nameplate: false,
        warning_message:
          "顔・ナンバープレート・表札の映り込みは検出されませんでした。コミュニティ安全マップへそのまま公開可能です。",
      },
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
    },
  },
  {
    id: "flood-gutter",
    mode: "disaster",
    badge: "🌧️ 防災診断1",
    shortTitle: "豪雨冠水・側溝詰まりリスク",
    subtitle: "雨水桝85%閉塞による内水氾濫と高台迂回ルート",
    category: "防災・冠水",
    severityLevel: "緊急",
    locationText: "第一小学校 北門前の通学路（低地アンダーパス手前）",
    latitude: "35.683150",
    longitude: "139.769420",
    mapX: 66,
    mapY: 28,
    sourceText:
      "通学路沿いの雨水桝と側溝グレーチングに落ち葉・土砂・ペットボトル・レジ袋が大量に詰まり、排水口が約85%ふさがっています。ゲリラ豪雨や台風時に歩道が冠水して車道との境界が見えなくなり、児童の転落や車椅子の脱輪、河川へのプラごみ流出が懸念されます。",
    initialAnalysis: {
      title: "通学路沿い雨水桝・側溝の落ち葉・プラごみ閉塞による道路冠水リスク",
      category: "防災・冠水",
      severity: 5,
      severity_level: "緊急",
      hazard_score: 89,
      department: "建設部 下水道河川管理課 ・ 防災危機管理課",
      affected_groups: [
        "小学生・通学児童",
        "車椅子・ベビーカー利用者",
        "高齢者",
        "周辺低地世帯",
      ],
      barrier_free_assessment:
        "側溝グレーチング蓋の開口部が約85%閉塞しており、降雨時に歩道と車道の境界が水没します。段差や側溝蓋の隙間が見えなくなるため、車椅子の前輪脱輪や児童の転落危険が極めて高い状態です。",
      eco_disaster_impact:
        "ゲリラ豪雨・台風接近時に内水氾濫を引き起こし通学路が通行不能になるほか、堆積したペットボトルやレジ袋が雨水幹線から河川・海洋へ大量流出する環境汚染リスクがあります。",
      suggested_fix:
        "高圧洗浄車・吸引車による雨水桝の緊急浚渫（しゅんせつ）清掃、および落ち葉が流入しにくい細目ノンスリップ型グレーチング蓋への交換を要望します。",
      recommended_action:
        "増水時や大雨警報発令時は側溝周辺に近づかず、水没した歩道は迂回してください。無理な単独清掃は控え、行政出動または複数名での地域清掃を待ってください。",
      safe_detour_advice:
        "🌊 バリアフリー迂回・安全アドバイス：大雨・増水時は低地アンダーパス手前の歩道を避け、高台側の「さくら通り歩道（標高＋4.2m・段差なし）」を通って第一小学校・避難所へ向かってください。",
      multilingual_notices: {
        ja: "【大雨・冠水ちゅうい】この道は 大雨のときに 水がたまります。車いす・ベビーカーのかたは、高台側の「さくら通り」を とおってください。",
        en: "[FLOOD RISK] Street drains ahead are clogged; road floods during heavy rain. Wheelchair & stroller users: please detour via the higher-ground Sakura Street sidewalk.",
        zh: "【积水警告】前方排水沟堵塞，暴雨时易积水淹没台阶。轮椅及婴儿车使用者请绕行高地一侧的樱花大道人行道。",
        ko: "【침수 주의】앞쪽 배수구가 막혀 호우 시 도로가 침수됩니다. 휠체어·유모차 이용자는 고지대인 사쿠라 거리 보도로 우회해 주세요.",
      },
      report_draft: [
        "【自治体通報・地域インフラ改善要望書】",
        "宛先: 建設部 下水道河川管理課 ・ 防災危機管理課 御中",
        "件名: 【緊急・防災・冠水】通学路沿い雨水桝・側溝の落ち葉・プラごみ閉塞による道路冠水リスク",
        "",
        "1. 発生場所・位置情報",
        "・場所・目印: 第一小学校 北門前の通学路（低地アンダーパス手前）",
        "・GPS座標: 北緯 35.683150 / 東経 139.769420",
        "・AI ハザードスコア: 89 / 100（緊急度区分: 緊急）",
        "",
        "2. 影響を受ける住民・通行者",
        "・対象グループ: 小学生・通学児童、車椅子・ベビーカー利用者、高齢者、周辺低地世帯",
        "",
        "3. 現場の状況・バリアフリー／防災評価",
        "・バリアフリー・通行影響: 側溝グレーチング蓋の開口部が約85%閉塞しており、降雨時に歩道と車道の境界が水没します。",
        "・防災・環境リスク: ゲリラ豪雨・台風接近時に内水氾濫を引き起こし通学路が通行不能になるほか、堆積したプラごみが河川へ流出するリスクがあります。",
        "",
        "4. 要望する改善措置・修繕内容",
        "・高圧洗浄車・吸引車による雨水桝の緊急浚渫清掃、および細目ノンスリップ型グレーチング蓋への交換を要望します。",
      ].join("\n"),
      privacy_check: {
        has_face: false,
        has_license_plate: false,
        has_nameplate: false,
        warning_message:
          "顔・ナンバープレート・表札の映り込みは検出されませんでした。コミュニティ安全マップへそのまま公開可能です。",
      },
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
    },
  },
  {
    id: "stroller-step",
    mode: "hazard",
    badge: "👶 日常点検2",
    shortTitle: "ベビーカー段差＆スロープ不足",
    subtitle: "縁石4.5cm段差・急勾配のバリアフリー改善",
    category: "バリアフリー",
    severityLevel: "改善提案",
    locationText: "市立中央図書館・子育て支援センター入口前 歩道接続部",
    latitude: "35.679840",
    longitude: "139.764310",
    mapX: 42,
    mapY: 72,
    sourceText:
      "子育て支援センター前の横断歩道から歩道へ上がる切り下げ部に約4.5cmの縁石段差が残っており、スロープの勾配も急なため、ベビーカーの前輪が引っかかって立ち往生したり、車椅子ユーザーが自力で上がれず車道を迂回する場面が頻発しています。",
    initialAnalysis: {
      title: "公共施設前歩道の急勾配・4.5cm縁石段差およびベビーカー・車椅子スロープ不足",
      category: "バリアフリー",
      severity: 3,
      severity_level: "改善提案",
      hazard_score: 76,
      department: "都市整備部 バリアフリー推進課 ・ 道路建設課",
      affected_groups: [
        "ベビーカー利用者（子育て世帯）",
        "車椅子ユーザー",
        "シルバーカー利用高齢者",
      ],
      barrier_free_assessment:
        "横断歩道から歩道への乗り入れ部に約4.5cmの縁石段差が残っており、さらに横断勾配が8%を超えています。ベビーカーの前輪が引っかかりやすく、車椅子での自力登坂が困難なため車道への迂回を余儀なくされています。",
      eco_disaster_impact:
        "雨天時のスリップや冬場の路面凍結時にベビーカー・車椅子の横転リスクが高まります。避難所である公共施設へのユニバーサルアクセス経路としても改善が不可欠です。",
      suggested_fix:
        "道路移動等円滑化基準に基づき、歩道切り下げ部の段差を2cm以下（すりつけ勾配5%以下）へ改修し、滑り止め舗装および視覚障がい者誘導用ブロックの連続配置を要望します。",
      recommended_action:
        "段差乗り越え時はベビーカーや車椅子のキャスターを斜めに進入させず、介助者がいる場合は前輪を軽く浮かせて慎重に通行してください。",
      safe_detour_advice:
        "👶 バリアフリー迂回・安全アドバイス：正面横断歩道の4.5cm段差を避け、西側30mの「図書館正面ロータリー緩勾配スロープ（段差0cm・手すり付き・日陰ベンチあり）」から安全に入館できます。",
      multilingual_notices: {
        ja: "【段差ちゅうい】ここの歩道は 4.5cmの段差と 急な坂があります。車いす・ベビーカーのかたは、30mひだりの「図書館正面スロープ」を つかってください。",
        en: "[STEP HAZARD] High 4.5cm curb and steep slope ahead. Wheelchair and stroller users: please use the step-free gentle ramp 30m west at the Library Main Entrance.",
        zh: "【台阶注意】此处人行道有4.5厘米路缘台阶且坡度较陡。轮椅及婴儿车请走西侧30米图书馆正门平缓坡道。",
        ko: "【단차 주의】이곳 보도에 4.5cm 턱과 급경사가 있습니다. 휠체어·유모차 이용자는 서쪽 30m 도서관 정문 완만한 경사로를 이용해 주세요.",
      },
      report_draft: [
        "【自治体通報・地域インフラ改善要望書】",
        "宛先: 都市整備部 バリアフリー推進課 ・ 道路建設課 御中",
        "件名: 【改善提案・バリアフリー】公共施設前歩道の急勾配・4.5cm縁石段差およびベビーカー・車椅子スロープ不足",
        "",
        "1. 発生場所・位置情報",
        "・場所・目印: 市立中央図書館・子育て支援センター入口前 歩道接続部",
        "・GPS座標: 北緯 35.679840 / 東経 139.764310",
        "・AI ハザードスコア: 76 / 100（緊急度区分: 改善提案）",
        "",
        "2. 影響を受ける住民・通行者",
        "・対象グループ: ベビーカー利用者（子育て世帯）、車椅子ユーザー、シルバーカー利用高齢者",
        "",
        "3. 現場の状況・バリアフリー／防災評価",
        "・バリアフリー・通行影響: 横断歩道から歩道への乗り入れ部に約4.5cmの縁石段差が残っており、ベビーカーの前輪引っかかりや車椅子の登坂困難が発生しています。",
        "・防災・環境リスク: 避難所である公共施設へのユニバーサルアクセス経路として雨天・夜間時の転倒リスクがあります。",
        "",
        "4. 要望する改善措置・修繕内容",
        "・道路移動等円滑化基準に基づき、歩道切り下げ部の段差を2cm以下（すりつけ勾配5%以下）へ改修し、滑り止め舗装の施工を要望します。",
      ].join("\n"),
      privacy_check: {
        has_face: false,
        has_license_plate: false,
        has_nameplate: false,
        warning_message:
          "顔・ナンバープレート・表札の映り込みは検出されませんでした。コミュニティ安全マップへそのまま公開可能です。",
      },
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
    },
  },
  {
    id: "school-blind-curve",
    mode: "hazard",
    badge: "🚸 日常点検3",
    shortTitle: "通学路の夜道・死角カーブ",
    subtitle: "見通し不良L字路・街路灯球切れ・白線摩耗",
    category: "通学路安全",
    severityLevel: "注意",
    locationText: "緑が丘2丁目 通学路L字カーブ（街路灯No.42付近）",
    latitude: "35.684510",
    longitude: "139.763180",
    mapX: 19,
    mapY: 22,
    sourceText:
      "通学路のL字カーブでブロック塀と植栽により見通しが約3mしかなく、カーブミラーも曇っています。さらに街路灯（管理番号No.42）が球切れして夜間真っ暗になり、路側帯のグリーンベルト塗装も消えかかっているため、下校児童と抜け道車両・自転車の接触ヒヤリハットが多発しています。",
    initialAnalysis: {
      title: "通学路L字カーブにおける見通し不良（死角）・カーブミラー曇りおよび夜間街路灯照度不足",
      category: "通学路安全",
      severity: 4,
      severity_level: "注意",
      hazard_score: 84,
      department: "教育委員会 学校安全課 ・ 建設部 交通安全対策課",
      affected_groups: [
        "小学生・中学生（通学・塾帰り）",
        "夜間歩行者",
        "自転車利用者",
        "高齢者",
      ],
      barrier_free_assessment:
        "塀と植栽によりL字カーブ先の見通しが約3mしかなく、歩道帯（グリーンベルト）の白線も摩耗して消えかかっています。さらに街路灯1基が球切れしており、夕暮れ以降の視認性が著しく低下しています。",
      eco_disaster_impact:
        "抜け道車両や電動キックボード・自転車との出会い頭接触事故リスクが高いほか、夜間停電時や災害避難時に暗がりとなり防犯・避難安全上の脆弱箇所となります。",
      suggested_fix:
        "高輝度LED防犯灯への更新と遮蔽枝の剪定、広角2面カーブミラーの新設、および通学路グリーンベルト（カラー舗装）と「減速・学童注意」路面標示の再塗装を要望します。",
      recommended_action:
        "夕暮れ・夜間通行時は反射材やライトを必ず点灯し、カーブ手前で一時停止して対向車・自転車の接近を確認してください。",
      safe_detour_advice:
        "🚸 バリアフリー迂回・安全アドバイス：夜間・夕暮れ時や雨天時は見通し不良のL字路を避け、LED照明とガードレール付歩道が整備された「緑が丘本通り（東側1本隣）」へ迂回してください。",
      multilingual_notices: {
        ja: "【見とおし注意】このカーブは 車や自転車が 見えにくく、夜は暗くなります。夕方や夜は、となりの明るい「緑が丘本通り」を とおってください。",
        en: "[BLIND CURVE] Sharp corner with limited visibility and dim lighting. At night or with strollers/wheelchairs, please use the well-lit Midorigaoka Main Street one block east.",
        zh: "【盲区注意】前方急转弯视线受阻且夜间照明不足。傍晚及夜间请绕行东侧相邻、配有护栏和明亮路灯的绿丘主街。",
        ko: "【사각지대 주의】이 커브길은 시야가 좁고 야간에 어둡습니다. 저녁·야간에는 동쪽 옆길인 밝은 미도리가오카 본거리를 이용해 주세요.",
      },
      report_draft: [
        "【自治体通報・地域インフラ改善要望書】",
        "宛先: 教育委員会 学校安全課 ・ 建設部 交通安全対策課 御中",
        "件名: 【注意・通学路安全】通学路L字カーブにおける見通し不良（死角）・カーブミラー曇りおよび夜間街路灯照度不足",
        "",
        "1. 発生場所・位置情報",
        "・場所・目印: 緑が丘2丁目 通学路L字カーブ（街路灯No.42付近）",
        "・GPS座標: 北緯 35.684510 / 東経 139.763180",
        "・AI ハザードスコア: 84 / 100（緊急度区分: 注意）",
        "",
        "2. 影響を受ける住民・通行者",
        "・対象グループ: 小学生・中学生（通学・塾帰り）、夜間歩行者、自転車利用者、高齢者",
        "",
        "3. 現場の状況・バリアフリー／防災評価",
        "・バリアフリー・通行影響: L字カーブ先の見通しが約3mしかなく、グリーンベルトの白線も摩耗し、街路灯No.42の球切れにより夜間視認性が低下しています。",
        "・防災・環境リスク: 抜け道車両や自転車との出会い頭事故リスクおよび夜間防犯・避難上のリスクがあります。",
        "",
        "4. 要望する改善措置・修繕内容",
        "・高輝度LED防犯灯への更新、広角2面カーブミラーの設置、および通学路グリーンベルトの再塗装を要望します。",
      ].join("\n"),
      privacy_check: {
        has_face: false,
        has_license_plate: false,
        has_nameplate: false,
        warning_message:
          "顔・ナンバープレート・表札の映り込みは検出されませんでした。コミュニティ安全マップへそのまま公開可能です。",
      },
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
    },
  },
  {
    id: "typhoon-outage",
    mode: "disaster",
    badge: "🛟 防災診断2",
    shortTitle: "地震・台風・停電断水＆危険塀回避",
    subtitle: "老朽ブロック塀倒壊リスクと非常用電源・給水避難所",
    category: "防災・冠水",
    severityLevel: "緊急",
    locationText: "中央地区 指定避難所（第一小学校）周辺・旧道ブロック塀沿い",
    latitude: "35.683450",
    longitude: "139.768120",
    mapX: 60,
    mapY: 36,
    sourceText:
      "避難所へ向かう旧道沿いにひび割れて傾いた老朽ブロック塀があり、地震や大型台風時に倒壊して車椅子・高齢者の避難路を塞ぐ危険があります。また長期停電・断水時に備えた非常用電源・給水拠点・マンホールトイレへのバリアフリー誘導が必要です。",
    initialAnalysis: {
      title: "台風・地震時の老朽ブロック塀倒壊・停電断水リスクおよび福祉避難ルート点検",
      category: "防災・冠水",
      severity: 5,
      severity_level: "緊急",
      hazard_score: 94,
      department: "防災危機管理課 ・ 都市整備部 建築指導課 ・ 水道局",
      affected_groups: [
        "在宅医療・電源依存世帯",
        "高齢者・要配慮者",
        "乳幼児・子育て世帯",
        "外国人住民",
      ],
      barrier_free_assessment:
        "避難所へ続く旧道沿いに傾いた老朽ブロック塀と狭隘区間があり、地震・暴風時に車椅子やシルバーカーの避難導線が寸断される恐れがあります。",
      eco_disaster_impact:
        "台風・大規模地震に伴う停電・断水発生時、エレベーター停止や給水拠点までの移動困難、ブロック塀倒壊による二次被害リスクが極めて高い状態です。",
      suggested_fix:
        "危険ブロック塀の除却助成・ネット固定、指定避難所（第一小学校・中央公民館）への非常用電源・マンホールトイレ・給水拠点案内標識の多言語設置を要望します。",
      recommended_action:
        "暴風・地震発生前にモバイルバッテリー充電・飲料水（1人1日3L×3日分）・常備薬・携帯トイレを確保し、ブロック塀や増水河川から離れた広域避難路を選択してください。",
      safe_detour_advice:
        "🛟 バリアフリー迂回・防災アドバイス：地震・台風時は老朽ブロック塀のある狭い路地を避け、電線地中化・スロープ完備の「中央大通り→第一小学校体育館（非常用電源・多目的トイレ・給水栓あり）」ルートで早期避難してください。",
      multilingual_notices: {
        ja: "【防災・ひなん案内】台風や地震のときは、ブロック塀のちかくを とおらないでください。車いす・お年寄り・外国のかたは「第一小学校（非常用電源・お水あり）」へ ひなんしてください。",
        en: "[DISASTER EVACUATION] Stay away from old concrete walls during earthquakes or typhoons. Step-free shelter with emergency power & water is available at Dai-ichi Elementary School.",
        zh: "【防灾避难指南】台风或地震时请远离老旧围墙。轮椅使用者及居民请沿中央大道前往“第一小学避难所”（配备应急电源、饮用水及无障碍卫生间）。",
        ko: "【방재·대피 안내】태풍·지진 시 오래된 블록담 근처를 피해 주세요. 휠체어 이용자 및 주민분들은 비상전원과 급수대가 있는 ‘제1초등학교 대피소’로 이동해 주세요.",
      },
      report_draft: [
        "【自治体通報・地域インフラ改善要望書】",
        "宛先: 防災危機管理課 ・ 都市整備部 建築指導課 ・ 水道局 御中",
        "件名: 【緊急・防災・冠水】台風・地震時の老朽ブロック塀倒壊・停電断水リスクおよび福祉避難ルート点検",
        "",
        "1. 発生場所・位置情報",
        "・場所・目印: 中央地区 指定避難所（第一小学校）周辺・旧道ブロック塀沿い",
        "・GPS座標: 北緯 35.683450 / 東経 139.768120",
        "・AI ハザードスコア: 94 / 100（緊急度区分: 緊急）",
        "",
        "2. 影響を受ける住民・通行者",
        "・対象グループ: 在宅医療・電源依存世帯、高齢者・要配慮者、乳幼児・子育て世帯、外国人住民",
        "",
        "3. 現場の状況・バリアフリー／防災評価",
        "・バリアフリー・通行影響: 旧道沿いに傾いた老朽ブロック塀があり、地震・暴風時に車椅子や高齢者の避難導線が寸断される恐れがあります。",
        "・防災・環境リスク: 停電・断水時の給水拠点アクセス困難およびブロック塀倒壊による二次被害リスクがあります。",
        "",
        "4. 要望する改善措置・修繕内容",
        "・危険ブロック塀の安全対策および指定避難所への非常用電源・給水拠点の多言語バリアフリー誘導標識設置を要望します。",
      ].join("\n"),
      privacy_check: {
        has_face: false,
        has_license_plate: false,
        has_nameplate: false,
        warning_message:
          "顔・ナンバープレート・表札の映り込みは検出されませんでした。コミュニティ安全マップへそのまま公開可能です。",
      },
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
    },
  },
  {
    id: "pet-heatwave-evac",
    mode: "disaster",
    badge: "🐾 防災診断3",
    shortTitle: "猛暑日陰ルート＆ペット同行避難",
    subtitle: "照り返し50℃回避クールシェア＆ペット避難区画",
    category: "防災・冠水",
    severityLevel: "注意",
    locationText: "ひまわり公園〜中央図書館 クールシェア＆ペット同行避難導線",
    latitude: "35.679510",
    longitude: "139.765120",
    mapX: 48,
    mapY: 62,
    sourceText:
      "駅から避難所・公園へ至る南側歩道に街路樹や日よけがなく、夏季の路面温度が50℃近くに達するため、ベビーカー・車椅子・高齢者の熱中症リスクや、災害時のペット同行避難スペース・給水スポットの案内不足が課題となっています。",
    initialAnalysis: {
      title: "猛暑・災害時の日陰不足ルートおよびペット同行避難・給水クールスポット整備要望",
      category: "防災・冠水",
      severity: 4,
      severity_level: "注意",
      hazard_score: 86,
      department: "環境部 気候変動対策課 ・ 防災危機管理課 ・ 動物愛護センター",
      affected_groups: [
        "高齢者・乳幼児（ベビーカー）",
        "ペット飼育世帯（同行避難者）",
        "屋外歩行者・車椅子ユーザー",
        "訪日外国人旅行者",
      ],
      barrier_free_assessment:
        "南側歩道に街路樹や日よけがなく、夏季の路面温度が50℃近くに達するため、地面に近いベビーカー・車椅子・ペットの熱中症リスクが深刻です。",
      eco_disaster_impact:
        "猛暑日の熱中症救急搬送リスクに加え、災害時にペット同行避難スペースや給水・冷房シェルター案内が不足していると避難遅れや車中泊事故につながります。",
      suggested_fix:
        "遮熱性舗装・街路樹グリーンインフラおよびミスト付クールシェアベンチの整備、ならびに避難所における「ペット同行避難専用区画・給水スポット」の明示を要望します。",
      recommended_action:
        "猛暑時間帯は直射日光下のアスファルト通行を避けて北側の日陰歩道・公共クールシェア施設（図書館等）を経由し、ペット用飲料水・ケージ・迷子札を常備してください。",
      safe_detour_advice:
        "🌳 バリアフリー迂回・猛暑＆ペット避難アドバイス：直射日光の照り返しが強い南側大通りを避け、並木日陰とミスト給水所がある「ひまわり公園北側遊歩道→市立図書館クールシェアロビー（ペット同行避難受付は東側屋根付きテラス）」へ迂回してください。",
      multilingual_notices: {
        ja: "【熱中症・ペット避難案内】この道は 日かげが 少なく暑くなります。お年寄り・ベビーカー・ペット連れのかたは、木かげのある「ひまわり公園ルート」と「図書館クールスポット」を つかってください。",
        en: "[HEATWAVE & PET SHELTER] High pavement heat ahead. Elderly, stroller users, and pet owners: please take the shaded Himawari Park path. Pet-friendly evacuation area is at the East Covered Terrace.",
        zh: "【防暑及宠物避难指南】前方路段缺乏遮阴且地表高温。老人、婴儿车及携宠居民请走树荫凉爽的向日葵公园步道，宠物同行避难区设在东侧有顶露台。",
        ko: "【폭염·반려동물 대피 안내】이 길은 그늘이 적어 노면 온도가 높습니다. 노약자·유모차·반려동물 동반 시 그늘진 히마와리 공원 산책로와 도서관 쿨링쉼터(동쪽 테라스 반려동물 구역)를 이용해 주세요.",
      },
      report_draft: [
        "【自治体通報・地域インフラ改善要望書】",
        "宛先: 環境部 気候変動対策課 ・ 防災危機管理課 ・ 動物愛護センター 御中",
        "件名: 【注意・防災・冠水】猛暑・災害時の日陰不足ルートおよびペット同行避難・給水クールスポット整備要望",
        "",
        "1. 発生場所・位置情報",
        "・場所・目印: ひまわり公園〜中央図書館 クールシェア＆ペット同行避難導線",
        "・GPS座標: 北緯 35.679510 / 東経 139.765120",
        "・AI ハザードスコア: 86 / 100（緊急度区分: 注意）",
        "",
        "2. 影響を受ける住民・通行者",
        "・対象グループ: 高齢者・乳幼児（ベビーカー）、ペット飼育世帯（同行避難者）、車椅子ユーザー、訪日外国人",
        "",
        "3. 現場の状況・バリアフリー／防災評価",
        "・バリアフリー・通行影響: 日陰不足により路面温度が上昇し、地面に近いベビーカー・車椅子・ペットの通行危険が高まっています。",
        "・防災・環境リスク: 災害時のペット同行避難区画および給水クールスポット案内が必要です。",
        "",
        "4. 要望する改善措置・修繕内容",
        "・並木日陰ルート・ミスト給水ベンチの整備および避難所でのペット同行避難専用区画の明示を要望します。",
      ].join("\n"),
      privacy_check: {
        has_face: false,
        has_license_plate: false,
        has_nameplate: false,
        warning_message:
          "顔・ナンバープレート・表札の映り込みは検出されませんでした。コミュニティ安全マップへそのまま公開可能です。",
      },
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
    },
  },
];

const EXTRA_SEED_PINS: CommunitySafetyPin[] = [
  {
    id: "seed-infra-asphalt",
    createdAt: "2026-11-20 14:20",
    locationText: "さくら通り商店街 東口交差点 アスファルト陥没・ひび割れ",
    latitude: "35.682110",
    longitude: "139.768050",
    mapX: 78,
    mapY: 64,
    sourceText:
      "バス通りと歩道の境目のアスファルトが直径40cm・深さ5cmほど陥没しており、雨水が溜まっています。シルバーカーや自転車のタイヤが取られて転倒しそうです。",
    upvotes: 14,
    workflowStatus: "自治体通報済",
    usedModel: "gemini-2.5-flash",
    analysis: {
      title: "商店街交差点の車道・歩道境界部アスファルト陥没（幅40cm・深さ5cm）",
      category: "インフラ劣化",
      severity: 4,
      severity_level: "注意",
      hazard_score: 83,
      department: "建設部 道路維持課",
      affected_groups: [
        "シルバーカー利用高齢者",
        "自転車利用者",
        "車椅子ユーザー",
        "二輪車運転者",
      ],
      barrier_free_assessment:
        "歩道横断部の着地地点に深さ約5cmのポットホール（陥没穴）が形成されており、車椅子キャスターやシルバーカー前輪が落輪して急停止・転倒する危険があります。",
      eco_disaster_impact:
        "大型バス通行の振動により路盤空洞化が拡大する恐れがあり、降雨時には水たまりとなって深さが視認できなくなります。",
      suggested_fix:
        "常温合材による即時仮復旧（穴埋め）および路盤調査のうえ加熱アスファルト合材による本復旧舗装を要望します。",
      recommended_action:
        "夜間や雨天時は水たまりの下に陥没が隠れているため、端から1m以上離れて横断してください。",
      safe_detour_advice:
        "♿ バリアフリー迂回・安全アドバイス：交差点東口の水たまり・陥没穴を避け、アーケード屋根付きの西口フラット横断歩道から安全に商店街へ入れます。",
      multilingual_notices: {
        ja: "【陥没ちゅうい】歩道の境目に 穴（深さ5cm）があります。車いす・シルバーカーのかたは、アーケード西口のフラットな横断歩道を とおってください。",
        en: "[POTHOLE CAUTION] 5cm deep asphalt pothole at the curb edge. Wheelchair and stroller users: please cross via the covered West Arcade crosswalk.",
        zh: "【路面凹陷注意】人行道交界处有5厘米深坑洞。轮椅及推车使用者请绕行西口有顶拱廊平坦人行横道。",
        ko: "【노면 함몰 주의】보도 경계에 깊이 5cm 포트홀이 있습니다. 휠체어·유모차 이용자는 아케이드 서쪽 평탄한 횡단보도를 이용해 주세요.",
      },
      report_draft: [
        "【自治体通報・地域インフラ改善要望書】",
        "宛先: 建設部 道路維持課 御中",
        "件名: 【注意・インフラ劣化】商店街交差点の車道・歩道境界部アスファルト陥没（幅40cm・深さ5cm）",
        "",
        "1. 発生場所・位置情報",
        "・場所・目印: さくら通り商店街 東口交差点 アスファルト陥没・ひび割れ",
        "・GPS座標: 北緯 35.682110 / 東経 139.768050",
        "・AI ハザードスコア: 83 / 100（緊急度区分: 注意）",
        "",
        "2. 影響を受ける住民・通行者",
        "・対象グループ: シルバーカー利用高齢者、自転車利用者、車椅子ユーザー、二輪車運転者",
        "",
        "3. 現場の状況・バリアフリー／防災評価",
        "・バリアフリー・通行影響: 歩道横断部の着地地点に深さ約5cmのポットホールが形成され、車椅子やシルバーカーの落輪リスクがあります。",
        "・防災・環境リスク: 大型車振動による陥没拡大および雨天時の視認不能リスクがあります。",
        "",
        "4. 要望する改善措置・修繕内容",
        "・常温合材による即時仮復旧および路盤点検のうえ本復旧舗装を要望します。",
      ].join("\n"),
      privacy_check: {
        has_face: false,
        has_license_plate: false,
        has_nameplate: false,
        warning_message:
          "顔・ナンバープレート・表札の映り込みは検出されませんでした。コミュニティ安全マップへそのまま公開可能です。",
      },
      suggested_tasks: [
        {
          title: "陥没箇所の深さ・拡大有無の24時間後再チェック",
          priority: "high",
          memo: "商店街振興組合とも共有し、仮コーンを設置",
        },
      ],
      detected_tags: ["#ポットホール陥没", "#道路維持課連携", "#シルバーカー注意"],
    },
  },
  {
    id: "seed-infra-guardrail",
    createdAt: "2026-11-19 09:45",
    locationText: "ひまわり公園 南側遊歩道 手すり・防護柵の腐食ぐらつき",
    latitude: "35.678920",
    longitude: "139.765910",
    mapX: 54,
    mapY: 52,
    sourceText:
      "公園横のスロープ手すり支柱の根元が錆びてぐらついており、高齢者が体重をかけると傾いて危険です。塗装剥がれによるささくれもあります。",
    upvotes: 9,
    workflowStatus: "改善完了",
    usedModel: "gemini-2.5-flash",
    analysis: {
      title: "公園南側バリアフリースロープ手すり支柱の腐食・ぐらつき修繕要望",
      category: "インフラ劣化",
      severity: 2,
      severity_level: "改善提案",
      hazard_score: 68,
      department: "都市整備部 公園緑地課",
      affected_groups: ["高齢者", "杖・歩行器利用者", "公園利用児童"],
      barrier_free_assessment:
        "スロープ手すり支柱基部に腐食が見られ、横荷重時に約2cmの揺れが発生します。歩行補助として手すりを握る高齢者にとってバランス崩しの原因となります。",
      eco_disaster_impact:
        "強風や地震時の倒壊リスク、および錆びた金属片による手指の負傷リスクがあります。",
      suggested_fix:
        "手すり支柱アンカーの再固定・防錆樹脂被覆タイプの手すりへの更新を要望します。",
      recommended_action:
        "補修完了まで反対側の手すりを使用し、ぐらつく支柱には体重をかけないでください。",
      report_draft: [
        "【自治体通報・地域インフラ改善要望書】",
        "宛先: 都市整備部 公園緑地課 御中",
        "件名: 【改善提案・インフラ劣化】公園南側バリアフリースロープ手すり支柱の腐食・ぐらつき修繕要望",
        "",
        "1. 発生場所・位置情報",
        "・場所・目印: ひまわり公園 南側遊歩道 手すり・防護柵の腐食ぐらつき",
        "・GPS座標: 北緯 35.678920 / 東経 139.765910",
        "・AI ハザードスコア: 68 / 100（緊急度区分: 改善提案）",
        "",
        "2. 影響を受ける住民・通行者",
        "・対象グループ: 高齢者、杖・歩行器利用者、公園利用児童",
        "",
        "3. 現場の状況・バリアフリー／防災評価",
        "・バリアフリー・通行影響: スロープ手すり支柱基部に腐食とぐらつきがあり、歩行補助としての安全性が低下しています。",
        "・防災・環境リスク: 腐食進行による破損・手指負傷の懸念があります。",
        "",
        "4. 要望する改善措置・修繕内容",
        "・手すり支柱アンカーの再固定および防錆被覆手すりへの更新を要望します。",
      ].join("\n"),
      privacy_check: {
        has_face: false,
        has_license_plate: false,
        has_nameplate: false,
        warning_message:
          "顔・ナンバープレート・表札の映り込みは検出されませんでした。コミュニティ安全マップへそのまま公開可能です。",
      },
      suggested_tasks: [
        {
          title: "公園管理事務所への修繕完了確認",
          priority: "low",
          memo: "ボルト増し締め・防錆塗装の完了を地域マップに反映",
        },
      ],
      detected_tags: ["#手すり腐食点検", "#公園バリアフリー", "#高齢者安全"],
    },
  },
];

function createDefaultSeedPins(): CommunitySafetyPin[] {
  const scenarioPins: CommunitySafetyPin[] = BUILTIN_SCENARIOS.map((sc, idx) => ({
    id: `seed-${sc.id}`,
    createdAt: `2026-11-21 0${8 + idx}:15`,
    locationText: sc.locationText,
    latitude: sc.latitude,
    longitude: sc.longitude,
    mapX: sc.mapX,
    mapY: sc.mapY,
    sourceText: sc.sourceText,
    upvotes: 18 - idx * 3,
    workflowStatus: idx === 1 ? "自治体通報済" : "未対応",
    usedModel: "gemini-2.5-flash",
    analysis: sc.initialAnalysis,
  }));
  return [...scenarioPins, ...EXTRA_SEED_PINS];
}

/**
 * Generates a realistic synthetic street inspection canvas image (base64 JPEG)
 * for any of the 4 built-in scenarios so the user sees an immediate visual
 * hazard diagram with AI bounding boxes AND sends real base64 image data to /api/machieye!
 */
function generateScenarioStreetPhoto(scenarioId: string, title: string): {
  base64: string;
  mimeType: string;
  previewUrl: string;
} {
  if (typeof document === "undefined") {
    return { base64: "", mimeType: "image/jpeg", previewUrl: "" };
  }
  const canvas = document.createElement("canvas");
  canvas.width = 720;
  canvas.height = 420;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return { base64: "", mimeType: "image/jpeg", previewUrl: "" };
  }

  // Background sky & street perspective
  const grad = ctx.createLinearGradient(0, 0, 0, 420);
  if (scenarioId === "school-blind-curve") {
    grad.addColorStop(0, "#0f172a");
    grad.addColorStop(0.5, "#1e293b");
    grad.addColorStop(1, "#334155");
  } else if (scenarioId === "flood-gutter") {
    grad.addColorStop(0, "#1e293b");
    grad.addColorStop(0.5, "#334155");
    grad.addColorStop(1, "#475569");
  } else {
    grad.addColorStop(0, "#1e3a5f");
    grad.addColorStop(0.45, "#334155");
    grad.addColorStop(1, "#475569");
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 720, 420);

  // Sidewalk & road surface polygons
  ctx.fillStyle = "#374151";
  ctx.beginPath();
  ctx.moveTo(0, 420);
  ctx.lineTo(230, 170);
  ctx.lineTo(520, 170);
  ctx.lineTo(720, 420);
  ctx.closePath();
  ctx.fill();

  // Curb line
  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(150, 420);
  ctx.lineTo(280, 170);
  ctx.stroke();

  if (scenarioId === "tactile-block") {
    // Draw yellow tactile paving strip with broken section & obstacle
    ctx.fillStyle = "#eab308";
    ctx.fillRect(280, 210, 75, 175);
    // Cracked/peeling hazard zone
    ctx.fillStyle = "#dc2626";
    ctx.fillRect(276, 265, 84, 52);
    ctx.fillStyle = "#1f2937";
    ctx.fillRect(288, 275, 58, 30);
    // Obstacle box
    ctx.fillStyle = "#f97316";
    ctx.fillRect(330, 220, 70, 55);
  } else if (scenarioId === "flood-gutter") {
    // Draw gutter grating clogged with leaves/water puddle
    ctx.fillStyle = "#0284c7";
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.ellipse(350, 310, 160, 65, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = "#78350f";
    ctx.fillRect(260, 275, 150, 55);
  } else if (scenarioId === "stroller-step") {
    // Draw high curb step 4.5cm & steep slope
    ctx.fillStyle = "#cbd5e1";
    ctx.fillRect(220, 270, 280, 36);
    ctx.fillStyle = "#ef4444";
    ctx.fillRect(220, 298, 280, 14);
  } else {
    // School blind curve wall + dim streetlight
    ctx.fillStyle = "#475569";
    ctx.fillRect(70, 110, 230, 210);
    ctx.strokeStyle = "#22c55e";
    ctx.setLineDash([12, 10]);
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(190, 410);
    ctx.lineTo(340, 210);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // AI Vision Bounding Box overlay
  ctx.strokeStyle = "#ef4444";
  ctx.lineWidth = 3;
  ctx.strokeRect(210, 195, 290, 170);

  // Bounding Box Header Tag
  ctx.fillStyle = "rgba(220, 38, 38, 0.92)";
  ctx.fillRect(210, 165, 290, 30);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 14px sans-serif";
  ctx.fillText("AI HAZARD DETECTED · MachiEye Vision", 220, 185);

  // Bottom HUD telemetry bar
  ctx.fillStyle = "rgba(15, 23, 42, 0.86)";
  ctx.fillRect(0, 372, 720, 48);
  ctx.fillStyle = "#38bdf8";
  ctx.font = "bold 13px monospace";
  ctx.fillText(`CAM-CIVIC // ${title.slice(0, 34)}`, 18, 401);

  const previewUrl = canvas.toDataURL("image/jpeg", 0.85);
  const base64 = previewUrl.split(",")[1] || "";
  return { base64, mimeType: "image/jpeg", previewUrl };
}

async function resizeImageToJpegBase64(
  file: File
): Promise<{ base64: string; mimeType: string; previewUrl: string }> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("画像の読み込みに失敗しました。"));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("画像のデコードに失敗しました。"));
    el.src = dataUrl;
  });

  const scale = Math.min(1, MAX_IMAGE_DIM / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("画像の縮小処理に失敗しました。");
  }
  ctx.drawImage(img, 0, 0, width, height);
  const resizedDataUrl = canvas.toDataURL("image/jpeg", 0.85);
  const base64 = resizedDataUrl.split(",")[1] || "";

  return {
    base64,
    mimeType: "image/jpeg",
    previewUrl: resizedDataUrl,
  };
}

function severityColor(level: MachiEyeSeverityLevel): {
  bg: string;
  border: string;
  text: string;
  dot: string;
} {
  if (level === "緊急") {
    return {
      bg: "rgba(239, 68, 68, 0.14)",
      border: "rgba(239, 68, 68, 0.55)",
      text: "#fca5a5",
      dot: "#ef4444",
    };
  }
  if (level === "注意") {
    return {
      bg: "rgba(245, 158, 11, 0.14)",
      border: "rgba(245, 158, 11, 0.55)",
      text: "#fcd34d",
      dot: "#f59e0b",
    };
  }
  return {
    bg: "rgba(56, 189, 248, 0.14)",
    border: "rgba(56, 189, 248, 0.55)",
    text: "#7dd3fc",
    dot: "#38bdf8",
  };
}

function categoryMeta(cat: MachiEyeCategory): { icon: string; color: string } {
  switch (cat) {
    case "バリアフリー":
      return { icon: "♿", color: "#38bdf8" };
    case "防災・冠水":
      return { icon: "🌊", color: "#818cf8" };
    case "通学路安全":
      return { icon: "🚸", color: "#34d399" };
    case "インフラ劣化":
      return { icon: "🚧", color: "#fb923c" };
  }
}

export default function MachiEyeLive() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const inspectionCardRef = useRef<HTMLDivElement | null>(null);
  const gmapCanvasRef = useRef<HTMLDivElement | null>(null);
  const gmapInstanceRef = useRef<GoogleMapInstance | null>(null);
  const gmapMarkersRef = useRef<GoogleMarkerInstance[]>([]);
  const gmapDraftMarkerRef = useRef<GoogleMarkerInstance | null>(null);
  const gmapInfoWindowRef = useRef<GoogleInfoWindowInstance | null>(null);

  // Progressive Disclosure state: Step 1 = null ("まずはやりたいことを選ぶ"), Step 2 = focused tool/map, Step 3 = inspection results
  const [selectedGoal, setSelectedGoal] = useState<
    null | "hazard" | "disaster" | "map"
  >(null);
  const [hasCompletedInspection, setHasCompletedInspection] =
    useState<boolean>(false);

  // Map View Switcher: default to "gmaps" (🗺️ Google マップ)
  const [mapViewMode, setMapViewMode] = useState<"gmaps" | "radar">("gmaps");
  const [gmapsCenterOverride, setGmapsCenterOverride] = useState<{
    lat: string;
    lng: string;
    label: string;
  } | null>(null);
  const [gmapsSdkReady, setGmapsSdkReady] = useState<boolean>(false);
  const [gmapsSdkFailed, setGmapsSdkFailed] = useState<boolean>(false);

  // Community pins state (localStorage persisted)
  const [pins, setPins] = useState<CommunitySafetyPin[]>(() =>
    createDefaultSeedPins()
  );
  const [selectedPinId, setSelectedPinId] = useState<string>(
    "seed-tactile-block"
  );
  const [filterCategory, setFilterCategory] = useState<
    "すべて" | MachiEyeCategory
  >("すべて");
  const [filterSeverity, setFilterSeverity] = useState<
    "すべて" | MachiEyeSeverityLevel
  >("すべて");

  // Inspector form state
  const [activeScenarioId, setActiveScenarioId] = useState<string>("tactile-block");
  const [sourceText, setSourceText] = useState<string>(
    BUILTIN_SCENARIOS[0].sourceText
  );
  const [locationText, setLocationText] = useState<string>(
    BUILTIN_SCENARIOS[0].locationText
  );
  const [latitude, setLatitude] = useState<string>(
    BUILTIN_SCENARIOS[0].latitude
  );
  const [longitude, setLongitude] = useState<string>(
    BUILTIN_SCENARIOS[0].longitude
  );
  const [draftMapX, setDraftMapX] = useState<number>(
    BUILTIN_SCENARIOS[0].mapX
  );
  const [draftMapY, setDraftMapY] = useState<number>(
    BUILTIN_SCENARIOS[0].mapY
  );
  const [geminiModel, setGeminiModel] = useState<
    "gemini-2.5-flash" | "gemini-3.8-flash" | "gemini-4-hydrogen"
  >("gemini-2.5-flash");

  const [imageBase64, setImageBase64] = useState<string>("");
  const [imageMimeType, setImageMimeType] = useState<string>("");
  const [imagePreview, setImagePreview] = useState<string>("");
  const [imageName, setImageName] = useState<string>("");
  const [dragActive, setDragActive] = useState<boolean>(false);

  const [gpsLoading, setGpsLoading] = useState<boolean>(false);
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [statusBanner, setStatusBanner] = useState<string>("");

  // Municipality Report Generator state
  const [reportFormatMode, setReportFormatMode] = useState<
    "standard" | "urgent" | "barrierfree"
  >("standard");
  const [copiedReport, setCopiedReport] = useState<boolean>(false);
  const [scenarioModeFilter, setScenarioModeFilter] = useState<
    "all" | "hazard" | "disaster"
  >("all");
  const [multilingualLang, setMultilingualLang] = useState<
    "all" | "ja" | "en" | "zh" | "ko"
  >("all");
  const [copiedMultilingual, setCopiedMultilingual] = useState<boolean>(false);
  const [gasSyncing, setGasSyncing] = useState<boolean>(false);
  const [gasMessage, setGasMessage] = useState<string>("");
  const [gasError, setGasError] = useState<string>("");
  const [driveArchiving, setDriveArchiving] = useState<boolean>(false);
  const [driveArchiveInfo, setDriveArchiveInfo] = useState<{
    mode: string;
    message: string;
    folder?: string;
    url?: string;
  } | null>(null);
  const [driveError, setDriveError] = useState<string>("");

  // Load pins from localStorage on mount
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as CommunitySafetyPin[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPins(parsed);
          setSelectedPinId(parsed[0].id);
        }
      }
    } catch {
      // ignore storage errors
    }
    // Generate initial scenario street visual preview
    const photo = generateScenarioStreetPhoto(
      BUILTIN_SCENARIOS[0].id,
      BUILTIN_SCENARIOS[0].shortTitle
    );
    if (photo.previewUrl) {
      setImageBase64(photo.base64);
      setImageMimeType(photo.mimeType);
      setImagePreview(photo.previewUrl);
      setImageName("scenario-tactile-block.jpg");
    }
  }, []);

  // Persist pins whenever updated
  const savePins = (nextPins: CommunitySafetyPin[]) => {
    setPins(nextPins);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextPins));
    } catch {
      // ignore quota error
    }
  };

  const selectedPin = useMemo(() => {
    return pins.find((p) => p.id === selectedPinId) ?? pins[0];
  }, [pins, selectedPinId]);

  const filteredPins = useMemo(() => {
    return pins.filter((pin) => {
      if (
        filterCategory !== "すべて" &&
        pin.analysis.category !== filterCategory
      ) {
        return false;
      }
      if (
        filterSeverity !== "すべて" &&
        pin.analysis.severity_level !== filterSeverity
      ) {
        return false;
      }
      return true;
    });
  }, [pins, filterCategory, filterSeverity]);

  const activeGoogleMapCenter = useMemo(() => {
    if (gmapsCenterOverride) {
      return gmapsCenterOverride;
    }
    if (selectedPin) {
      return {
        lat: selectedPin.latitude || "35.681420",
        lng: selectedPin.longitude || "139.766850",
        label: selectedPin.locationText || selectedPin.analysis.title,
      };
    }
    return {
      lat: latitude || "35.681420",
      lng: longitude || "139.766850",
      label: locationText || "中央駅南口周辺",
    };
  }, [gmapsCenterOverride, selectedPin, latitude, longitude, locationText]);

  // Dynamically load Google Maps JS API when NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is configured
  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY || typeof window === "undefined") {
      return;
    }
    const win = window as unknown as WindowWithGoogleMaps;
    if (win.google?.maps) {
      setGmapsSdkReady(true);
      return;
    }

    win.gm_authFailure = () => {
      setGmapsSdkFailed(true);
    };

    const existingScript = document.getElementById(
      "machieye-google-maps-sdk"
    ) as HTMLScriptElement | null;
    if (existingScript) {
      const onExistingLoad = () => setGmapsSdkReady(true);
      const onExistingErr = () => setGmapsSdkFailed(true);
      existingScript.addEventListener("load", onExistingLoad);
      existingScript.addEventListener("error", onExistingErr);
      return () => {
        existingScript.removeEventListener("load", onExistingLoad);
        existingScript.removeEventListener("error", onExistingErr);
      };
    }

    const script = document.createElement("script");
    script.id = "machieye-google-maps-sdk";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      GOOGLE_MAPS_API_KEY
    )}&language=ja`;
    script.async = true;
    script.defer = true;
    script.onload = () => setGmapsSdkReady(true);
    script.onerror = () => setGmapsSdkFailed(true);
    document.head.appendChild(script);
  }, []);

  // Initialize or update interactive Google Map + color-coded markers when JS API is active
  useEffect(() => {
    if (selectedGoal !== "map" || mapViewMode !== "gmaps") {
      gmapInstanceRef.current = null;
      gmapDraftMarkerRef.current = null;
      gmapMarkersRef.current = [];
      return;
    }
    if (
      !GOOGLE_MAPS_API_KEY ||
      !gmapsSdkReady ||
      gmapsSdkFailed ||
      !gmapCanvasRef.current ||
      typeof window === "undefined"
    ) {
      return;
    }

    const gmaps = (window as unknown as WindowWithGoogleMaps).google?.maps;
    if (!gmaps) return;

    const centerLat = parseFloat(activeGoogleMapCenter.lat) || 35.68142;
    const centerLng = parseFloat(activeGoogleMapCenter.lng) || 139.76685;

    if (!gmapInstanceRef.current) {
      gmapInstanceRef.current = new gmaps.Map(gmapCanvasRef.current, {
        center: { lat: centerLat, lng: centerLng },
        zoom: 16,
        mapTypeControl: false,
        streetViewControl: true,
        fullscreenControl: true,
      });

      gmapInfoWindowRef.current = new gmaps.InfoWindow();

      gmapInstanceRef.current.addListener("click", (ev: GoogleMapMouseEvent) => {
        if (!ev.latLng) return;
        const clickedLat = ev.latLng.lat();
        const clickedLng = ev.latLng.lng();
        const latStr = clickedLat.toFixed(6);
        const lngStr = clickedLng.toFixed(6);
        setLatitude(latStr);
        setLongitude(lngStr);

        // Also update radar relative position so both views stay synchronized
        const relY = Math.min(
          92,
          Math.max(8, Math.round(((35.6855 - clickedLat) / 0.008) * 100))
        );
        const relX = Math.min(
          94,
          Math.max(6, Math.round(((clickedLng - 139.762) / 0.009) * 100))
        );
        setDraftMapX(relX);
        setDraftMapY(relY);

        if (gmapDraftMarkerRef.current && gmapInstanceRef.current) {
          gmapDraftMarkerRef.current.setPosition({
            lat: clickedLat,
            lng: clickedLng,
          });
          gmapDraftMarkerRef.current.setMap(gmapInstanceRef.current);
        } else if (gmapInstanceRef.current) {
          gmapDraftMarkerRef.current = new gmaps.Marker({
            position: { lat: clickedLat, lng: clickedLng },
            map: gmapInstanceRef.current,
            title: `新規通報予定地点 (${latStr}, ${lngStr})`,
            icon: {
              path: gmaps.SymbolPath.CIRCLE,
              scale: 9,
              fillColor: "#06b6d4",
              fillOpacity: 0.95,
              strokeColor: "#ffffff",
              strokeWeight: 2.5,
            },
          });
        }

        setStatusBanner(
          `🎯 Google マップ上のクリック地点（北緯 ${latStr}, 東経 ${lngStr}）を新規通報のGPS座標にセットしました。`
        );
      });
    } else {
      gmapInstanceRef.current.panTo({ lat: centerLat, lng: centerLng });
    }

    const map = gmapInstanceRef.current;

    // Clear previous community markers
    gmapMarkersRef.current.forEach((m) => m.setMap(null));
    gmapMarkersRef.current = [];

    filteredPins.forEach((pin) => {
      const pLat = parseFloat(pin.latitude);
      const pLng = parseFloat(pin.longitude);
      if (Number.isNaN(pLat) || Number.isNaN(pLng)) return;

      const sev = severityColor(pin.analysis.severity_level);
      const cat = categoryMeta(pin.analysis.category);
      const isSelected = selectedPin?.id === pin.id;

      const marker = new gmaps.Marker({
        position: { lat: pLat, lng: pLng },
        map,
        title: `[${pin.analysis.severity_level}] ${pin.analysis.title}`,
        label: {
          text: cat.icon,
          fontSize: isSelected ? "13px" : "11px",
        },
        icon: {
          path: gmaps.SymbolPath.CIRCLE,
          scale: isSelected ? 15 : 12,
          fillColor: sev.dot,
          fillOpacity: isSelected ? 0.98 : 0.88,
          strokeColor: isSelected ? "#ffffff" : "#0f172a",
          strokeWeight: isSelected ? 3 : 2,
        },
      });

      marker.addListener("click", () => {
        setGmapsCenterOverride(null);
        setSelectedPinId(pin.id);
        if (gmapInfoWindowRef.current) {
          gmapInfoWindowRef.current.setContent(
            `<div style="color:#0f172a;font-family:sans-serif;padding:4px 6px;max-width:240px;">
              <div style="font-size:11px;font-weight:700;color:${sev.dot};">${pin.analysis.severity_level} · ${cat.icon} ${pin.analysis.category} (Score ${pin.analysis.hazard_score})</div>
              <div style="font-size:13px;font-weight:800;margin-top:2px;">${pin.analysis.title}</div>
              <div style="font-size:11px;color:#475569;margin-top:3px;">📍 ${pin.locationText}</div>
            </div>`
          );
          gmapInfoWindowRef.current.open(map, marker);
        }
        inspectionCardRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      });

      gmapMarkersRef.current.push(marker);
    });
  }, [
    selectedGoal,
    gmapsSdkReady,
    gmapsSdkFailed,
    mapViewMode,
    filteredPins,
    selectedPin,
    activeGoogleMapCenter.lat,
    activeGoogleMapCenter.lng,
  ]);

  const handlePickGoal = (goal: "hazard" | "disaster" | "map") => {
    setSelectedGoal(goal);
    setHasCompletedInspection(false);
    setErrorMsg("");
    setStatusBanner("");
    setGasMessage("");
    setGasError("");
    if (goal === "hazard") {
      setScenarioModeFilter("hazard");
      const firstHazard =
        BUILTIN_SCENARIOS.find((sc) => sc.mode === "hazard") ||
        BUILTIN_SCENARIOS[0];
      void handleSelectScenario(firstHazard, false);
    } else if (goal === "disaster") {
      setScenarioModeFilter("disaster");
      const firstDisaster =
        BUILTIN_SCENARIOS.find((sc) => sc.mode === "disaster") ||
        BUILTIN_SCENARIOS[1];
      void handleSelectScenario(firstDisaster, false);
    } else {
      setMapViewMode("gmaps");
    }
  };

  // Select a built-in scenario and optionally auto-run inspection
  const handleSelectScenario = async (
    scenario: ScenarioPreset,
    autoInspect: boolean
  ) => {
    setActiveScenarioId(scenario.id);
    setLocationText(scenario.locationText);
    setLatitude(scenario.latitude);
    setLongitude(scenario.longitude);
    setDraftMapX(scenario.mapX);
    setDraftMapY(scenario.mapY);
    setSourceText(scenario.sourceText);
    setGmapsCenterOverride(null);
    setErrorMsg("");
    setGasMessage("");
    setGasError("");

    const photo = generateScenarioStreetPhoto(
      scenario.id,
      scenario.shortTitle
    );
    if (photo.previewUrl) {
      setImageBase64(photo.base64);
      setImageMimeType(photo.mimeType);
      setImagePreview(photo.previewUrl);
      setImageName(`scenario-${scenario.id}.jpg`);
    }

    // Also focus existing matching pin immediately so UI feels instant
    const existingSeed = pins.find((p) => p.id === `seed-${scenario.id}`);
    if (existingSeed) {
      setSelectedPinId(existingSeed.id);
    }

    if (autoInspect) {
      await executeInspection({
        scenarioId: scenario.id,
        sourceText: scenario.sourceText,
        locationText: scenario.locationText,
        latitude: scenario.latitude,
        longitude: scenario.longitude,
        mapX: scenario.mapX,
        mapY: scenario.mapY,
        imageBase64: photo.base64,
        imageMimeType: photo.mimeType,
        imagePreview: photo.previewUrl,
      });
    }
  };

  const handleImageFile = async (file: File) => {
    setErrorMsg("");
    if (!ACCEPTED_MIME_TYPES.has(file.type)) {
      setErrorMsg("PNG / JPEG / WebP 形式の街路写真を選択してください。");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setErrorMsg(
        "画像サイズが 10MB を超えています。別の画像を選択してください。"
      );
      return;
    }
    try {
      const resized = await resizeImageToJpegBase64(file);
      setImageBase64(resized.base64);
      setImageMimeType(resized.mimeType);
      setImagePreview(resized.previewUrl);
      setImageName(file.name);
      setActiveScenarioId("");
      setStatusBanner(
        `📸 写真「${file.name}」を読み込みました（1600px JPEG最適化済）。「AI 現場解析＆マップ登録」で診断できます。`
      );
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "画像の処理に失敗しました。"
      );
    }
  };

  const handleGetGps = () => {
    if (!navigator.geolocation) {
      setErrorMsg(
        "このブラウザは位置情報取得（Geolocation）に対応していません。"
      );
      return;
    }
    setGpsLoading(true);
    setErrorMsg("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latStr = pos.coords.latitude.toFixed(6);
        const lngStr = pos.coords.longitude.toFixed(6);
        setLatitude(latStr);
        setLongitude(lngStr);
        if (!locationText.trim()) {
          setLocationText("現在地（GPS自動取得地点）");
        }
        setGmapsCenterOverride({
          lat: latStr,
          lng: lngStr,
          label: "現在地（GPS自動取得地点）",
        });
        setMapViewMode("gmaps");
        setGpsLoading(false);
        setStatusBanner(
          `📍 現在地のGPS座標（北緯 ${latStr}, 東経 ${lngStr}）を取得し、Google マップを現在地へジャンプしました！`
        );
      },
      () => {
        setErrorMsg(
          "位置情報の取得が拒否されたかタイムアウトしました。手動またはシナリオから入力してください。"
        );
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const executeInspection = async (override?: {
    scenarioId?: string;
    sourceText: string;
    locationText: string;
    latitude: string;
    longitude: string;
    mapX: number;
    mapY: number;
    imageBase64: string;
    imageMimeType: string;
    imagePreview: string;
  }) => {
    const reqSourceText = override ? override.sourceText : sourceText;
    const reqLocation = override ? override.locationText : locationText;
    const reqLat = override ? override.latitude : latitude;
    const reqLng = override ? override.longitude : longitude;
    const reqMapX = override ? override.mapX : draftMapX;
    const reqMapY = override ? override.mapY : draftMapY;
    const reqImgBase64 = override ? override.imageBase64 : imageBase64;
    const reqImgMime = override ? override.imageMimeType : imageMimeType;
    const reqImgPreview = override ? override.imagePreview : imagePreview;
    const reqScenarioId = override ? override.scenarioId : activeScenarioId;

    if (!reqSourceText.trim() && !reqImgBase64 && !reqScenarioId) {
      setErrorMsg("街路写真のアップロード、シナリオ選択、または現場メモを入力してください。");
      return;
    }

    setAnalyzing(true);
    setErrorMsg("");
    setStatusBanner("");
    setGasMessage("");
    setGasError("");
    setCopiedReport(false);

    try {
      const res = await fetch("/api/machieye", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceText: reqSourceText,
          locationText: reqLocation,
          latitude: reqLat,
          longitude: reqLng,
          scenarioId: reqScenarioId,
          imageBase64: reqImgBase64,
          imageMimeType: reqImgMime,
          geminiModel,
        }),
      });

      const data = (await res.json()) as {
        result?: MachiEyeAnalysis;
        usedModel?: string;
        error?: string;
        code?: string;
      };

      if (!res.ok || !data.result) {
        const msg =
          typeof data.error === "string"
            ? data.error
            : "AI ハザード＆バリアフリー解析に失敗しました。";
        throw new Error(msg);
      }

      const nowStr = new Date().toLocaleString("ja-JP", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });

      const newPin: CommunitySafetyPin = {
        id: `pin-${Date.now()}`,
        createdAt: `本日 ${nowStr}`,
        locationText: reqLocation || "市内現地（AIカメラ点検地点）",
        latitude: reqLat || "35.681236",
        longitude: reqLng || "139.767125",
        mapX: reqMapX,
        mapY: reqMapY,
        sourceText: reqSourceText,
        imagePreview: reqImgPreview || undefined,
        upvotes: 1,
        workflowStatus: "未対応",
        usedModel: data.usedModel || geminiModel,
        analysis: data.result,
      };

      const nextPins = [newPin, ...pins];
      savePins(nextPins);
      setGmapsCenterOverride(null);
      setSelectedPinId(newPin.id);
      setFilterCategory("すべて");
      setFilterSeverity("すべて");
      setHasCompletedInspection(true);
      setStatusBanner(
        `✅ AI ハザード＆バリアフリー点検が完了し、コミュニティ安全マップに新規ピン「${data.result.title}」をプロットしました！`
      );
      setTimeout(() => {
        inspectionCardRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }, 80);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "解析中にエラーが発生しました。"
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeInspection();
  };

  // Click on Radar SVG to move draft pin coordinate
  const handleRadarSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = Math.min(
      94,
      Math.max(6, Math.round(((e.clientX - rect.left) / rect.width) * 100))
    );
    const relY = Math.min(
      92,
      Math.max(8, Math.round(((e.clientY - rect.top) / rect.height) * 100))
    );
    setDraftMapX(relX);
    setDraftMapY(relY);

    // Derive realistic synthetic Tokyo neighborhood GPS offset
    const latNum = 35.6855 - (relY / 100) * 0.008;
    const lngNum = 139.762 + (relX / 100) * 0.009;
    setLatitude(latNum.toFixed(6));
    setLongitude(lngNum.toFixed(6));
  };

  const handleUpvotePin = (pinId: string) => {
    const next = pins.map((p) =>
      p.id === pinId ? { ...p, upvotes: p.upvotes + 1 } : p
    );
    savePins(next);
  };

  const handleCyclePinStatus = (pinId: string) => {
    const order: PinWorkflowStatus[] = ["未対応", "自治体通報済", "改善完了"];
    const next = pins.map((p) => {
      if (p.id !== pinId) return p;
      const idx = order.indexOf(p.workflowStatus);
      const nextStatus = order[(idx + 1) % order.length];
      return { ...p, workflowStatus: nextStatus };
    });
    savePins(next);
  };

  const handleResetSeedPins = () => {
    const defaults = createDefaultSeedPins();
    savePins(defaults);
    setGmapsCenterOverride(null);
    setSelectedPinId(defaults[0].id);
    setFilterCategory("すべて");
    setFilterSeverity("すべて");
    setStatusBanner("🔄 コミュニティ安全マップを初期シードデータ（6地点）にリセットしました。");
  };

  // Formatted Municipality Report based on selected pin and template mode
  const formattedMunicipalityReport = useMemo(() => {
    if (!selectedPin) return "";
    const a = selectedPin.analysis;
    const mapUrl = `https://www.google.com/maps?q=${encodeURIComponent(
      `${selectedPin.latitude},${selectedPin.longitude}`
    )}`;
    const headerTitle =
      reportFormatMode === "urgent"
        ? "【緊急インフラ安全措置・防災ハザード通報書】"
        : reportFormatMode === "barrierfree"
        ? "【道路・公共空間バリアフリー改善要望書（移動等円滑化基準に基づく）】"
        : "【自治体通報・地域インフラ改善要望レポート】";

    const closingNote =
      reportFormatMode === "urgent"
        ? "※緊急度が高く二次被害（転倒・冠水・接触事故）の恐れがあるため、早期の現地安全措置（カラーコーン設置・緊急清掃等）をお願い申し上げます。"
        : reportFormatMode === "barrierfree"
        ? "※視覚障がい者・車椅子ユーザー・ベビーカー利用者・高齢者が安全に自律移動できるよう、ユニバーサルデザイン観点での改修をご検討ください。"
        : "※本レポートはシビックテックAI「MachiEye Live」により現地写真・GPS位置情報・プライバシー安全監査を経て作成されました。";

    return [
      headerTitle,
      `作成日時: ${selectedPin.createdAt} / 整理ID: ${selectedPin.id.toUpperCase()}`,
      `宛先部署: ${a.department} 御中`,
      `件名: 【${a.severity_level}｜${a.category}】${a.title}`,
      `------------------------------------------------------------`,
      `■ 1. 現場位置・ランドマーク情報`,
      `・場所・目印: ${selectedPin.locationText}`,
      `・GPS座標: 北緯 ${selectedPin.latitude} / 東経 ${selectedPin.longitude}`,
      `・Google マップ: ${mapUrl}`,
      `・地域住民の現地確認・共感数: ${selectedPin.upvotes} 件（現在ステータス: ${selectedPin.workflowStatus}）`,
      ``,
      `■ 2. AI ハザード・緊急度トリアージ評価`,
      `・緊急度区分: ${a.severity_level}（Lv.${a.severity} / 5）`,
      `・総合ハザードスコア: ${a.hazard_score} / 100`,
      `・影響を受ける当事者グループ: ${a.affected_groups.join("、")}`,
      `・検出タグ: ${a.detected_tags.join(" ")}`,
      ``,
      `■ 3. バリアフリー・防災・環境インパクト詳細`,
      `・[バリアフリー・通行影響]`,
      `  ${a.barrier_free_assessment}`,
      `・[防災・環境・事故リスク]`,
      `  ${a.eco_disaster_impact}`,
      ``,
      `■ 4. 要望する具体的な修繕・改善対策`,
      `・${a.suggested_fix}`,
      ``,
      `■ 5. 公開前プライバシーAIチェック結果`,
      `・顔映り込み: ${a.privacy_check.has_face ? "検出（要注意）" : "なし"} / ナンバープレート: ${
        a.privacy_check.has_license_plate ? "検出（要注意）" : "なし"
      } / 表札: ${a.privacy_check.has_nameplate ? "検出（要注意）" : "なし"}`,
      `・監査判定: ${a.privacy_check.warning_message}`,
      `------------------------------------------------------------`,
      closingNote,
    ].join("\n");
  }, [selectedPin, reportFormatMode]);

  const handleCopyReport = async () => {
    if (!formattedMunicipalityReport) return;
    try {
      await navigator.clipboard.writeText(formattedMunicipalityReport);
      setCopiedReport(true);
      setTimeout(() => setCopiedReport(false), 2500);
    } catch {
      setErrorMsg("クリップボードへのコピーに失敗しました。");
    }
  };

  const handleDownloadMarkdown = () => {
    if (!selectedPin) return;
    const blob = new Blob([formattedMunicipalityReport], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `machieye-report-${selectedPin.id}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadJson = () => {
    if (!selectedPin) return;
    const payload = {
      schema: "machieye.municipality_report.v2",
      exportedAt: new Date().toISOString(),
      pin: selectedPin,
      formattedReport: formattedMunicipalityReport,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `machieye-report-${selectedPin.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleGasSync = async () => {
    if (!selectedPin) return;
    setGasSyncing(true);
    setGasMessage("");
    setGasError("");

    try {
      const a = selectedPin.analysis;
      const mapUrl = `https://www.google.com/maps?q=${encodeURIComponent(
        `${selectedPin.latitude},${selectedPin.longitude}`
      )}`;
      const summaryForSheet = [
        `[${a.severity_level} Score:${a.hazard_score}/100] ${a.category} / 担当: ${a.department}`,
        `場所: ${selectedPin.locationText} (${mapUrl})`,
        `対象: ${a.affected_groups.join("・")}`,
        `改善提案: ${a.suggested_fix}`,
      ].join(" | ");

      const res = await fetch("/api/gas-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic_title: `[MachiEye Live] ${a.title}`,
          summary: summaryForSheet,
          tasks: a.suggested_tasks,
        }),
      });

      const data = (await res.json()) as Record<string, unknown>;
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "Google シート / カレンダー連携に失敗しました。"
        );
      }

      setGasMessage(
        `Google Workspace 連携完了！地域安全台帳シートに記録し、パトロール予定を ${String(
          data.addedEvents ?? a.suggested_tasks.length
        )} 件登録しました。`
      );
    } catch (err) {
      setGasError(
        err instanceof Error
          ? err.message
          : "GAS 連携中にエラーが発生しました。"
      );
    } finally {
      setGasSyncing(false);
    }
  };

  const handleSaveToLocalDevice = () => {
    if (!selectedPin) return;
    setDriveArchiving(true);
    setDriveArchiveInfo(null);
    setDriveError("");

    try {
      handleDownloadMarkdown();
      const folder = `Downloads/machieye-report-${selectedPin.id}.md (.json)`;
      const mode = "local-ssd-download";
      const message = `設定不要・完全無料で PC・スマホのローカルストレージに通報レポート（${folder}）を保存しました。`;
      setDriveArchiveInfo({ mode, message, folder });
    } catch (err) {
      setDriveError(
        err instanceof Error
          ? err.message
          : "ローカル保存中にエラーが発生しました。"
      );
    } finally {
      setDriveArchiving(false);
    }
  };

  const summaryStats = useMemo(() => {
    const urgentCount = pins.filter(
      (p) => p.analysis.severity_level === "緊急"
    ).length;
    const resolvedCount = pins.filter(
      (p) => p.workflowStatus !== "未対応"
    ).length;
    const avgHazard =
      pins.length > 0
        ? Math.round(
            pins.reduce((acc, p) => acc + p.analysis.hazard_score, 0) /
              pins.length
          )
        : 0;
    return { total: pins.length, urgentCount, resolvedCount, avgHazard };
  }, [pins]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 15% 10%, rgba(16, 185, 129, 0.14), transparent 36%), radial-gradient(circle at 85% 15%, rgba(14, 165, 233, 0.15), transparent 40%), linear-gradient(180deg, #07111e 0%, #0b1727 50%, #091320 100%)",
        color: "#f1f5f9",
        fontFamily:
          '"Inter", "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif',
        padding: "24px 16px 72px",
      }}
    >
      <div style={{ maxWidth: 1240, margin: "0 auto" }}>
        {/* Top Demo Navigation Bar */}
        <nav
          aria-label="応募デモ切替"
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "10px 16px",
            borderRadius: 14,
            background: "rgba(15, 23, 42, 0.78)",
            border: "1px solid rgba(56, 189, 248, 0.22)",
            backdropFilter: "blur(12px)",
            marginBottom: 20,
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <Link
              href="/"
              style={{
                color: "#cbd5e1",
                textDecoration: "none",
                fontSize: "0.84rem",
                fontWeight: 600,
                padding: "6px 12px",
                borderRadius: 8,
                background: "rgba(30, 41, 59, 0.7)",
              }}
            >
              🏠 ホーム
            </Link>
            <Link
              href="/codemistake"
              style={{
                color: "#cbd5e1",
                textDecoration: "none",
                fontSize: "0.84rem",
                fontWeight: 600,
                padding: "6px 12px",
                borderRadius: 8,
                background: "rgba(30, 41, 59, 0.7)",
              }}
            >
              🪞 CodePitfall（開発・学習）
            </Link>
            <Link
              href="/otayori"
              style={{
                color: "#cbd5e1",
                textDecoration: "none",
                fontSize: "0.84rem",
                fontWeight: 600,
                padding: "6px 12px",
                borderRadius: 8,
                background: "rgba(30, 41, 59, 0.7)",
              }}
            >
              🍊 おたよりバトン（暮らしと家族）
            </Link>
            <Link
              href="/gitbridge"
              style={{
                color: "#cbd5e1",
                textDecoration: "none",
                fontSize: "0.84rem",
                fontWeight: 600,
                padding: "6px 12px",
                borderRadius: 8,
                background: "rgba(30, 41, 59, 0.7)",
              }}
            >
              🌉 GitBridge
            </Link>
          </div>
          <span
            style={{
              fontSize: "0.82rem",
              fontWeight: 700,
              color: "#34d399",
              background: "rgba(16, 185, 129, 0.14)",
              border: "1px solid rgba(16, 185, 129, 0.4)",
              padding: "5px 14px",
              borderRadius: 999,
            }}
          >
            🌏 まちと地球の未来部門 フラッグシップ（日常危険チェック × 防災・災害対策）
          </span>
        </nav>

        {/* Calm, Airy Hero Header */}
        <header
          style={{
            borderRadius: 20,
            padding: "22px 26px",
            background:
              "linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(12, 34, 52, 0.9) 100%)",
            border: "1px solid rgba(56, 189, 248, 0.28)",
            boxShadow: "0 18px 40px -15px rgba(0, 0, 0, 0.55)",
            marginBottom: 22,
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background:
                    "linear-gradient(135deg, #10b981 0%, #0284c7 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.55rem",
                  boxShadow: "0 8px 20px rgba(16, 185, 129, 0.35)",
                }}
              >
                🛰️
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <h1
                    style={{
                      margin: 0,
                      fontSize: "1.6rem",
                      fontWeight: 800,
                      letterSpacing: "-0.02em",
                      color: "#f8fafc",
                    }}
                  >
                    MachiEye Live
                  </h1>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      padding: "3px 10px",
                      borderRadius: 999,
                      background: "rgba(56, 189, 248, 0.16)",
                      color: "#38bdf8",
                      border: "1px solid rgba(56, 189, 248, 0.38)",
                    }}
                  >
                    街のあんしん＆防災AIナビ
                  </span>
                </div>
                <p
                  style={{
                    margin: "4px 0 0",
                    fontSize: "0.9rem",
                    color: "#cbd5e1",
                  }}
                >
                  街の危険チェック・防災診断・Google マップ安全マップから、やりたいことを選んでスタートできます。
                </p>
              </div>
            </div>

            {selectedGoal !== null && (
              <button
                type="button"
                onClick={() => {
                  setSelectedGoal(null);
                  setHasCompletedInspection(false);
                  setStatusBanner("");
                  setErrorMsg("");
                }}
                style={{
                  padding: "8px 16px",
                  borderRadius: 999,
                  border: "1.5px solid rgba(56, 189, 248, 0.55)",
                  background: "rgba(14, 165, 233, 0.18)",
                  color: "#f0f9ff",
                  fontSize: "0.82rem",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                ← やりたいことを選び直す
              </button>
            )}
          </div>
        </header>

        {/* STEP 1 (Progressive Disclosure): Show ONLY 3 big, calm, welcoming "まずはやりたいことを選ぶ" cards */}
        {selectedGoal === null && (
          <section
            aria-label="まずはやりたいことを選ぶ"
            style={{
              maxWidth: 1040,
              margin: "12px auto 32px",
              padding: "28px 24px",
              borderRadius: 22,
              background: "rgba(15, 23, 42, 0.78)",
              border: "1px solid rgba(56, 189, 248, 0.25)",
              boxShadow: "0 20px 45px -18px rgba(0, 0, 0, 0.6)",
            }}
          >
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <span
                style={{
                  display: "inline-block",
                  fontSize: "0.76rem",
                  fontWeight: 800,
                  color: "#34d399",
                  background: "rgba(16, 185, 129, 0.14)",
                  border: "1px solid rgba(16, 185, 129, 0.38)",
                  padding: "4px 14px",
                  borderRadius: 999,
                  marginBottom: 10,
                }}
              >
                STEP 1 // まずはやりたいことを選ぶ
              </span>
              <h2
                style={{
                  margin: 0,
                  fontSize: "1.42rem",
                  fontWeight: 800,
                  color: "#f8fafc",
                }}
              >
                今日はどんな安全チェックをしますか？
              </h2>
              <p
                style={{
                  margin: "6px 0 0",
                  fontSize: "0.88rem",
                  color: "#94a3b8",
                }}
              >
                下の3つのカードから1つ選ぶと、必要な機能だけがすっきり表示されます。
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 18,
              }}
            >
              {/* Card 1: 🚧 街の危険・段差を写真でチェックする */}
              <button
                type="button"
                onClick={() => handlePickGoal("hazard")}
                style={{
                  textAlign: "left",
                  padding: "24px 22px",
                  borderRadius: 18,
                  border: "1.5px solid rgba(56, 189, 248, 0.38)",
                  background:
                    "linear-gradient(160deg, rgba(15, 23, 42, 0.95) 0%, rgba(14, 116, 144, 0.22) 100%)",
                  color: "#f8fafc",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: 16,
                  boxShadow: "0 12px 28px -12px rgba(14, 165, 233, 0.35)",
                }}
              >
                <div>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "4px 11px",
                      borderRadius: 999,
                      background: "rgba(56, 189, 248, 0.18)",
                      color: "#7dd3fc",
                      fontSize: "0.75rem",
                      fontWeight: 800,
                      marginBottom: 12,
                    }}
                  >
                    日常バリアフリー・通学路点検
                  </div>
                  <div
                    style={{
                      fontSize: "1.18rem",
                      fontWeight: 800,
                      lineHeight: 1.4,
                      color: "#f8fafc",
                      marginBottom: 8,
                    }}
                  >
                    🚧 街の危険・段差を写真でチェックする
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.85rem",
                      color: "#cbd5e1",
                      lineHeight: 1.6,
                    }}
                  >
                    点字ブロックの破損・ベビーカーや車椅子の段差・夜道の死角などを写真（またはサンプル）でAI点検し、安全な迂回ルートを提案します。
                  </p>
                </div>
                <div
                  style={{
                    fontSize: "0.84rem",
                    fontWeight: 800,
                    color: "#38bdf8",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span>写真・サンプルでチェックする</span>
                  <span>→</span>
                </div>
              </button>

              {/* Card 2: 🛟 防災・災害対策（豪雨・停電・避難）を診断する */}
              <button
                type="button"
                onClick={() => handlePickGoal("disaster")}
                style={{
                  textAlign: "left",
                  padding: "24px 22px",
                  borderRadius: 18,
                  border: "1.5px solid rgba(52, 211, 153, 0.38)",
                  background:
                    "linear-gradient(160deg, rgba(15, 23, 42, 0.95) 0%, rgba(16, 185, 129, 0.2) 100%)",
                  color: "#f8fafc",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: 16,
                  boxShadow: "0 12px 28px -12px rgba(16, 185, 129, 0.35)",
                }}
              >
                <div>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "4px 11px",
                      borderRadius: 999,
                      background: "rgba(16, 185, 129, 0.18)",
                      color: "#6ee7b7",
                      fontSize: "0.75rem",
                      fontWeight: 800,
                      marginBottom: 12,
                    }}
                  >
                    豪雨冠水・地震台風・ペット同行避難
                  </div>
                  <div
                    style={{
                      fontSize: "1.18rem",
                      fontWeight: 800,
                      lineHeight: 1.4,
                      color: "#f8fafc",
                      marginBottom: 8,
                    }}
                  >
                    🛟 防災・災害対策（豪雨・停電・避難）を診断する
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.85rem",
                      color: "#cbd5e1",
                      lineHeight: 1.6,
                    }}
                  >
                    側溝の詰まりによる冠水リスク・地震や台風時の危険ブロック塀回避・猛暑の日陰やペット同行避難ルートをAI診断します。
                  </p>
                </div>
                <div
                  style={{
                    fontSize: "0.84rem",
                    fontWeight: 800,
                    color: "#34d399",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span>防災・避難ルートを診断する</span>
                  <span>→</span>
                </div>
              </button>

              {/* Card 3: 🗺️ みんなの安全マップ（Google マップ）を見る */}
              <button
                type="button"
                onClick={() => handlePickGoal("map")}
                style={{
                  textAlign: "left",
                  padding: "24px 22px",
                  borderRadius: 18,
                  border: "1.5px solid rgba(192, 132, 252, 0.42)",
                  background:
                    "linear-gradient(160deg, rgba(15, 23, 42, 0.95) 0%, rgba(147, 51, 234, 0.22) 100%)",
                  color: "#f8fafc",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: 16,
                  boxShadow: "0 12px 28px -12px rgba(168, 85, 247, 0.35)",
                }}
              >
                <div>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "4px 11px",
                      borderRadius: 999,
                      background: "rgba(168, 85, 247, 0.2)",
                      color: "#e9d5ff",
                      fontSize: "0.75rem",
                      fontWeight: 800,
                      marginBottom: 12,
                    }}
                  >
                    Google マップ・現在地GPS・ストリートビュー
                  </div>
                  <div
                    style={{
                      fontSize: "1.18rem",
                      fontWeight: 800,
                      lineHeight: 1.4,
                      color: "#f8fafc",
                      marginBottom: 8,
                    }}
                  >
                    🗺️ みんなの安全マップ（Google マップ）を見る
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.85rem",
                      color: "#cbd5e1",
                      lineHeight: 1.6,
                    }}
                  >
                    地域で共有された危険ピン（現在 {summaryStats.total} 地点）を Google マップ上で確認し、現在地GPS移動・歩行者安全ルート・ストリートビューを開けます。
                  </p>
                </div>
                <div
                  style={{
                    fontSize: "0.84rem",
                    fontWeight: 800,
                    color: "#d8b4fe",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span>Google マップを開く（{summaryStats.total}地点）</span>
                  <span>→</span>
                </div>
              </button>
            </div>
          </section>
        )}

        {selectedGoal !== null && statusBanner && (
          <div
            role="status"
            style={{
              marginBottom: 18,
              padding: "12px 16px",
              borderRadius: 12,
              background: "rgba(16, 185, 129, 0.14)",
              border: "1px solid rgba(16, 185, 129, 0.45)",
              color: "#a7f3d0",
              fontSize: "0.88rem",
              fontWeight: 600,
            }}
          >
            {statusBanner}
          </div>
        )}

        {selectedGoal !== null && errorMsg && (
          <div
            role="alert"
            style={{
              marginBottom: 18,
              padding: "12px 16px",
              borderRadius: 12,
              background: "rgba(239, 68, 68, 0.15)",
              border: "1px solid rgba(239, 68, 68, 0.5)",
              color: "#fecaca",
              fontSize: "0.88rem",
              fontWeight: 600,
            }}
          >
            ⚠️ {errorMsg}
          </div>
        )}

        {/* STEP 2: Focused Input Box (for hazard/disaster) OR Focused Google Map (for map) */}
        {selectedGoal !== null && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 20,
              marginBottom: 24,
            }}
          >
            {/* Step 2 Navigation Bar: Back to Goal Picker + Direct Goal Switcher */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                padding: "10px 14px",
                borderRadius: 14,
                background: "rgba(15, 23, 42, 0.85)",
                border: "1px solid rgba(148, 163, 184, 0.22)",
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setSelectedGoal(null);
                  setHasCompletedInspection(false);
                  setStatusBanner("");
                  setErrorMsg("");
                }}
                style={{
                  padding: "6px 13px",
                  borderRadius: 8,
                  border: "1px solid rgba(148, 163, 184, 0.35)",
                  background: "rgba(30, 41, 59, 0.85)",
                  color: "#e2e8f0",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                ← やりたいことを選び直す
              </button>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {(
                  [
                    {
                      id: "hazard",
                      label: "🚧 街の危険・段差をチェック",
                    },
                    {
                      id: "disaster",
                      label: "🛟 防災・災害対策を診断",
                    },
                    {
                      id: "map",
                      label: "🗺️ みんなの安全マップ（Google マップ）",
                    },
                  ] as const
                ).map((g) => {
                  const active = selectedGoal === g.id;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => handlePickGoal(g.id)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 999,
                        border: active
                          ? "1.5px solid #38bdf8"
                          : "1px solid rgba(148, 163, 184, 0.28)",
                        background: active
                          ? "rgba(14, 165, 233, 0.24)"
                          : "rgba(15, 23, 42, 0.7)",
                        color: active ? "#ffffff" : "#94a3b8",
                        fontSize: "0.76rem",
                        fontWeight: 800,
                        cursor: "pointer",
                      }}
                    >
                      {g.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Focused Sample Presets Strip for Hazard / Disaster mode */}
            {(selectedGoal === "hazard" || selectedGoal === "disaster") && (
              <div
                style={{
                  borderRadius: 16,
                  padding: "14px 18px",
                  background: "rgba(15, 23, 42, 0.78)",
                  border: "1px solid rgba(56, 189, 248, 0.24)",
                }}
              >
                <div
                  style={{
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    color: "#cbd5e1",
                    marginBottom: 10,
                  }}
                >
                  💡 手元に写真がない場合も、下のサンプル事例から1クリックでAI診断を試せます：
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                    gap: 10,
                  }}
                >
                  {BUILTIN_SCENARIOS.filter(
                    (sc) => sc.mode === selectedGoal
                  ).map((sc) => {
                    const isSelected = activeScenarioId === sc.id;
                    const sevStyle = severityColor(sc.severityLevel);
                    return (
                      <div
                        key={sc.id}
                        style={{
                          borderRadius: 12,
                          padding: "11px 13px",
                          background: isSelected
                            ? "rgba(14, 165, 233, 0.16)"
                            : "rgba(15, 23, 42, 0.65)",
                          border: isSelected
                            ? "1.5px solid #38bdf8"
                            : "1px solid rgba(148, 163, 184, 0.22)",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                          gap: 8,
                        }}
                      >
                        <div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 6,
                              marginBottom: 4,
                            }}
                          >
                            <span
                              style={{
                                fontSize: "0.74rem",
                                fontWeight: 700,
                                color: "#38bdf8",
                              }}
                            >
                              {sc.badge} · {sc.category}
                            </span>
                            <span
                              style={{
                                fontSize: "0.7rem",
                                fontWeight: 700,
                                padding: "2px 8px",
                                borderRadius: 999,
                                background: sevStyle.bg,
                                border: `1px solid ${sevStyle.border}`,
                                color: sevStyle.text,
                              }}
                            >
                              {sc.severityLevel}
                            </span>
                          </div>
                          <div
                            style={{
                              fontSize: "0.9rem",
                              fontWeight: 700,
                              color: "#f8fafc",
                            }}
                          >
                            {sc.shortTitle}
                          </div>
                          <div
                            style={{
                              fontSize: "0.76rem",
                              color: "#94a3b8",
                              marginTop: 2,
                            }}
                          >
                            {sc.subtitle}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            type="button"
                            onClick={() => void handleSelectScenario(sc, false)}
                            style={{
                              flex: 1,
                              padding: "6px 8px",
                              borderRadius: 8,
                              border: "1px solid rgba(148, 163, 184, 0.3)",
                              background: "rgba(30, 41, 59, 0.85)",
                              color: "#e2e8f0",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            📥 フォーム読込
                          </button>
                          <button
                            type="button"
                            disabled={analyzing}
                            onClick={() => void handleSelectScenario(sc, true)}
                            style={{
                              flex: 1.2,
                              padding: "6px 8px",
                              borderRadius: 8,
                              border: "1px solid rgba(56, 189, 248, 0.45)",
                              background:
                                "linear-gradient(135deg, #0284c7 0%, #0d9488 100%)",
                              color: "#ffffff",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              cursor: analyzing ? "wait" : "pointer",
                            }}
                          >
                            🔍 1クリックAI診断
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* PANEL 1: Multimodal Photo/Camera Hazard & Barrier-Free Inspector (Only shown for hazard/disaster goals) */}
            {(selectedGoal === "hazard" || selectedGoal === "disaster") && (
              <section
                style={{
                  borderRadius: 18,
                  padding: "20px 22px",
                  background: "rgba(15, 23, 42, 0.82)",
                  border: "1px solid rgba(148, 163, 184, 0.22)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                }}
              >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 800,
                    color: "#38bdf8",
                    letterSpacing: "0.06em",
                  }}
                >
                  MODULE 01 // MULTIMODAL INSPECTOR
                </span>
                <h2
                  style={{
                    margin: "2px 0 0",
                    fontSize: "1.15rem",
                    fontWeight: 800,
                    color: "#f8fafc",
                  }}
                >
                  📷 街路ハザード＆バリアフリーAIインスペクター
                </h2>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  style={{
                    padding: "7px 12px",
                    borderRadius: 9,
                    border: "1px solid rgba(56, 189, 248, 0.4)",
                    background: "rgba(14, 165, 233, 0.16)",
                    color: "#7dd3fc",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  📱 カメラ起動
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    padding: "7px 12px",
                    borderRadius: 9,
                    border: "1px solid rgba(148, 163, 184, 0.3)",
                    background: "rgba(30, 41, 59, 0.8)",
                    color: "#e2e8f0",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  📁 写真選択
                </button>
              </div>
            </div>

            <form
              onSubmit={handleFormSubmit}
              style={{ display: "flex", flexDirection: "column", gap: 14 }}
            >
              {/* Hidden file and camera inputs */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleImageFile(file);
                }}
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                capture="environment"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleImageFile(file);
                }}
              />

              {/* Dropzone & Live Street Preview */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragActive(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) void handleImageFile(file);
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                style={{
                  borderRadius: 14,
                  padding: imagePreview ? "12px" : "22px 16px",
                  border: dragActive
                    ? "2px dashed #38bdf8"
                    : "1.5px dashed rgba(56, 189, 248, 0.38)",
                  background: dragActive
                    ? "rgba(14, 165, 233, 0.12)"
                    : "rgba(2, 6, 23, 0.55)",
                  cursor: "pointer",
                  textAlign: "center",
                }}
              >
                {imagePreview ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div
                      style={{
                        position: "relative",
                        borderRadius: 10,
                        overflow: "hidden",
                        maxHeight: 210,
                        border: "1px solid rgba(56, 189, 248, 0.3)",
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imagePreview}
                        alt="街路点検プレビュー"
                        style={{
                          width: "100%",
                          height: 200,
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        fontSize: "0.78rem",
                        color: "#94a3b8",
                      }}
                    >
                      <span>
                        📎 <strong style={{ color: "#e2e8f0" }}>{imageName}</strong>{" "}
                        （Gemini Vision マルチモーダル解析＆プライバシー監査対象）
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setImageBase64("");
                          setImageMimeType("");
                          setImagePreview("");
                          setImageName("");
                        }}
                        style={{
                          padding: "3px 10px",
                          borderRadius: 6,
                          border: "1px solid rgba(239, 68, 68, 0.4)",
                          background: "rgba(239, 68, 68, 0.15)",
                          color: "#fca5a5",
                          fontSize: "0.74rem",
                          cursor: "pointer",
                        }}
                      >
                        画像をクリア
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div
                      style={{
                        fontSize: "0.94rem",
                        fontWeight: 700,
                        color: "#e2e8f0",
                        marginBottom: 4,
                      }}
                    >
                      📷 街路・段差・側溝・通学路の写真をドロップ、またはタップして撮影
                    </div>
                    <div style={{ fontSize: "0.77rem", color: "#94a3b8" }}>
                      PNG / JPEG / WebP（最大10MB・ブラウザ内で1600px JPEGに自動圧縮してGemini Visionへ送信）
                    </div>
                  </div>
                )}
              </div>

              {/* Location & GPS Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.6fr 0.9fr 0.9fr auto",
                  gap: 8,
                  alignItems: "end",
                }}
              >
                <div>
                  <label
                    htmlFor="machieye-loc"
                    style={{
                      display: "block",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      color: "#94a3b8",
                      marginBottom: 4,
                    }}
                  >
                    場所・ランドマーク
                  </label>
                  <input
                    id="machieye-loc"
                    type="text"
                    value={locationText}
                    onChange={(e) => setLocationText(e.target.value)}
                    placeholder="例：中央駅南口 横断歩道前"
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: "1px solid rgba(148, 163, 184, 0.3)",
                      background: "rgba(15, 23, 42, 0.9)",
                      color: "#f8fafc",
                      fontSize: "0.83rem",
                    }}
                  />
                </div>
                <div>
                  <label
                    htmlFor="machieye-lat"
                    style={{
                      display: "block",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      color: "#94a3b8",
                      marginBottom: 4,
                    }}
                  >
                    緯度 (Lat)
                  </label>
                  <input
                    id="machieye-lat"
                    type="text"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    placeholder="35.681420"
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: "1px solid rgba(148, 163, 184, 0.3)",
                      background: "rgba(15, 23, 42, 0.9)",
                      color: "#f8fafc",
                      fontSize: "0.83rem",
                    }}
                  />
                </div>
                <div>
                  <label
                    htmlFor="machieye-lng"
                    style={{
                      display: "block",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      color: "#94a3b8",
                      marginBottom: 4,
                    }}
                  >
                    経度 (Lng)
                  </label>
                  <input
                    id="machieye-lng"
                    type="text"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    placeholder="139.766850"
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: "1px solid rgba(148, 163, 184, 0.3)",
                      background: "rgba(15, 23, 42, 0.9)",
                      color: "#f8fafc",
                      fontSize: "0.83rem",
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleGetGps}
                  disabled={gpsLoading}
                  style={{
                    padding: "8px 11px",
                    borderRadius: 8,
                    border: "1px solid rgba(52, 211, 153, 0.4)",
                    background: "rgba(16, 185, 129, 0.15)",
                    color: "#6ee7b7",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {gpsLoading ? "取得中..." : "📍 現在地を取得 (GPS)"}
                </button>
              </div>

              {/* Field Notes */}
              <div>
                <label
                  htmlFor="machieye-memo"
                  style={{
                    display: "block",
                    fontSize: "0.76rem",
                    fontWeight: 600,
                    color: "#94a3b8",
                    marginBottom: 4,
                  }}
                >
                  現場の状況メモ（車椅子・ベビーカー・視覚障がい・冠水・死角などの気付き）
                </label>
                <textarea
                  id="machieye-memo"
                  rows={3}
                  value={sourceText}
                  onChange={(e) => setSourceText(e.target.value)}
                  placeholder="写真のみでも解析可能です。気づいた危険や段差・詰まり状況があれば記入してください..."
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid rgba(148, 163, 184, 0.3)",
                    background: "rgba(15, 23, 42, 0.9)",
                    color: "#f8fafc",
                    fontSize: "0.84rem",
                    lineHeight: 1.5,
                    resize: "vertical",
                  }}
                />
              </div>

              {/* Model selection & Execute button */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <label
                    htmlFor="machieye-model-select"
                    style={{
                      fontSize: "0.76rem",
                      color: "#94a3b8",
                      fontWeight: 600,
                    }}
                  >
                    AIエンジン:
                  </label>
                  <select
                    id="machieye-model-select"
                    value={geminiModel}
                    onChange={(e) =>
                      setGeminiModel(
                        e.target.value as
                          | "gemini-2.5-flash"
                          | "gemini-3.8-flash"
                          | "gemini-4-hydrogen"
                      )
                    }
                    style={{
                      padding: "6px 10px",
                      borderRadius: 8,
                      border: "1px solid rgba(148, 163, 184, 0.3)",
                      background: "rgba(15, 23, 42, 0.95)",
                      color: "#e2e8f0",
                      fontSize: "0.78rem",
                    }}
                  >
                    <option value="gemini-2.5-flash">
                      gemini-2.5-flash（推奨・マルチモーダル高速）
                    </option>
                    <option value="gemini-3.8-flash">
                      gemini-3.8-flash（Civic Schema互換）
                    </option>
                    <option value="gemini-4-hydrogen">
                      gemini-4-hydrogen
                    </option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={analyzing}
                  style={{
                    padding: "10px 20px",
                    borderRadius: 10,
                    border: "1px solid rgba(56, 189, 248, 0.5)",
                    background:
                      "linear-gradient(135deg, #10b981 0%, #0284c7 100%)",
                    color: "#ffffff",
                    fontSize: "0.88rem",
                    fontWeight: 800,
                    cursor: analyzing ? "wait" : "pointer",
                    boxShadow: "0 8px 20px -6px rgba(14, 165, 233, 0.55)",
                  }}
                >
                  {analyzing
                    ? "⏳ Gemini Vision が現場トリアージ中..."
                    : "🔍 AI 現場解析 ＆ 安全マップにピン登録"}
                </button>
              </div>
            </form>
              </section>
            )}

            {/* PANEL 2: Interactive Community Safety Pin Map (Google Maps + Neighborhood Radar Map) — Only shown when selectedGoal === "map" */}
            {selectedGoal === "map" && (
              <section
                style={{
                  borderRadius: 18,
                  padding: "20px 22px",
                  background: "rgba(15, 23, 42, 0.82)",
                  border: "1px solid rgba(56, 189, 248, 0.28)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                }}
              >
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 800,
                    color: "#34d399",
                    letterSpacing: "0.06em",
                  }}
                >
                  MODULE 02 // GOOGLE MAPS & NEIGHBORHOOD SAFETY RADAR
                </span>
                <h2
                  style={{
                    margin: "2px 0 0",
                    fontSize: "1.15rem",
                    fontWeight: 800,
                    color: "#f8fafc",
                  }}
                >
                  🗺️ 地域コミュニティ安全ピンマップ（{filteredPins.length}件表示）
                </h2>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                {/* Map View Switcher: 🗺️ Google マップ / 📡 レーダーマップ */}
                <div
                  role="group"
                  aria-label="マップ表示モード切替"
                  style={{
                    display: "inline-flex",
                    borderRadius: 9,
                    padding: 2,
                    background: "rgba(2, 6, 23, 0.78)",
                    border: "1px solid rgba(56, 189, 248, 0.35)",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setMapViewMode("gmaps")}
                    style={{
                      padding: "5px 11px",
                      borderRadius: 7,
                      border: "none",
                      background:
                        mapViewMode === "gmaps"
                          ? "linear-gradient(135deg, #0284c7 0%, #10b981 100%)"
                          : "transparent",
                      color: mapViewMode === "gmaps" ? "#ffffff" : "#94a3b8",
                      fontSize: "0.75rem",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    🗺️ Google マップ
                  </button>
                  <button
                    type="button"
                    onClick={() => setMapViewMode("radar")}
                    style={{
                      padding: "5px 11px",
                      borderRadius: 7,
                      border: "none",
                      background:
                        mapViewMode === "radar"
                          ? "linear-gradient(135deg, #0284c7 0%, #10b981 100%)"
                          : "transparent",
                      color: mapViewMode === "radar" ? "#ffffff" : "#94a3b8",
                      fontSize: "0.75rem",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    📡 レーダーマップ
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleGetGps}
                  disabled={gpsLoading}
                  style={{
                    padding: "5px 10px",
                    borderRadius: 8,
                    border: "1px solid rgba(52, 211, 153, 0.45)",
                    background: "rgba(16, 185, 129, 0.16)",
                    color: "#6ee7b7",
                    fontSize: "0.73rem",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {gpsLoading ? "取得中..." : "📍 現在地を取得 (GPS)"}
                </button>

                <button
                  type="button"
                  onClick={handleResetSeedPins}
                  style={{
                    padding: "5px 10px",
                    borderRadius: 8,
                    border: "1px solid rgba(148, 163, 184, 0.28)",
                    background: "rgba(30, 41, 59, 0.7)",
                    color: "#cbd5e1",
                    fontSize: "0.73rem",
                    cursor: "pointer",
                  }}
                >
                  🔄 初期ピン復元
                </button>
              </div>
            </div>

            {/* Category & Severity Filters */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                padding: "10px 12px",
                borderRadius: 12,
                background: "rgba(2, 6, 23, 0.55)",
                border: "1px solid rgba(148, 163, 184, 0.16)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span
                  style={{
                    fontSize: "0.74rem",
                    fontWeight: 700,
                    color: "#94a3b8",
                    marginRight: 4,
                  }}
                >
                  カテゴリ:
                </span>
                {(["すべて", ...CATEGORY_LIST] as const).map((cat) => {
                  const active = filterCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setFilterCategory(cat)}
                      style={{
                        padding: "4px 10px",
                        borderRadius: 999,
                        border: active
                          ? "1px solid #38bdf8"
                          : "1px solid rgba(148, 163, 184, 0.25)",
                        background: active
                          ? "rgba(14, 165, 233, 0.22)"
                          : "rgba(15, 23, 42, 0.7)",
                        color: active ? "#7dd3fc" : "#cbd5e1",
                        fontSize: "0.74rem",
                        fontWeight: active ? 700 : 500,
                        cursor: "pointer",
                      }}
                    >
                      {cat !== "すべて" ? `${categoryMeta(cat).icon} ` : ""}
                      {cat}
                    </button>
                  );
                })}
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span
                  style={{
                    fontSize: "0.74rem",
                    fontWeight: 700,
                    color: "#94a3b8",
                    marginRight: 4,
                  }}
                >
                  緊急度:
                </span>
                {(["すべて", ...SEVERITY_LIST] as const).map((sev) => {
                  const active = filterSeverity === sev;
                  const st =
                    sev !== "すべて"
                      ? severityColor(sev)
                      : {
                          bg: "rgba(56, 189, 248, 0.2)",
                          border: "#38bdf8",
                          text: "#7dd3fc",
                          dot: "#38bdf8",
                        };
                  return (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => setFilterSeverity(sev)}
                      style={{
                        padding: "4px 10px",
                        borderRadius: 999,
                        border: active
                          ? `1px solid ${st.border}`
                          : "1px solid rgba(148, 163, 184, 0.25)",
                        background: active ? st.bg : "rgba(15, 23, 42, 0.7)",
                        color: active ? st.text : "#cbd5e1",
                        fontSize: "0.74rem",
                        fontWeight: active ? 700 : 500,
                        cursor: "pointer",
                      }}
                    >
                      {sev}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Map Viewport: 🗺️ Google マップ (Default) or 📡 レーダーマップ */}
            {mapViewMode === "gmaps" ? (
              <div
                style={{
                  position: "relative",
                  borderRadius: 14,
                  overflow: "hidden",
                  border: "1px solid rgba(56, 189, 248, 0.35)",
                  background: "#06101e",
                }}
              >
                {/* Live Google Map Header Status Bar */}
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    padding: "7px 12px",
                    background: "rgba(15, 23, 42, 0.94)",
                    borderBottom: "1px solid rgba(56, 189, 248, 0.22)",
                    fontSize: "0.74rem",
                    color: "#cbd5e1",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      minWidth: 0,
                    }}
                  >
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: 999,
                        background:
                          GOOGLE_MAPS_API_KEY && gmapsSdkReady && !gmapsSdkFailed
                            ? "rgba(16, 185, 129, 0.2)"
                            : "rgba(14, 165, 233, 0.2)",
                        border:
                          GOOGLE_MAPS_API_KEY && gmapsSdkReady && !gmapsSdkFailed
                            ? "1px solid rgba(16, 185, 129, 0.45)"
                            : "1px solid rgba(56, 189, 248, 0.45)",
                        color:
                          GOOGLE_MAPS_API_KEY && gmapsSdkReady && !gmapsSdkFailed
                            ? "#6ee7b7"
                            : "#7dd3fc",
                        fontWeight: 800,
                        fontSize: "0.7rem",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {GOOGLE_MAPS_API_KEY && gmapsSdkReady && !gmapsSdkFailed
                        ? "🗺️ Google Maps JS API (全ピン連動)"
                        : "🗺️ Google Maps Live Embed (設定不要・即時連動)"}
                    </span>
                    <span
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        color: "#e2e8f0",
                        fontWeight: 600,
                      }}
                    >
                      📍 {activeGoogleMapCenter.label}（{activeGoogleMapCenter.lat},{" "}
                      {activeGoogleMapCenter.lng}）
                    </span>
                  </div>
                  {gmapsCenterOverride && (
                    <button
                      type="button"
                      onClick={() => setGmapsCenterOverride(null)}
                      style={{
                        padding: "2px 8px",
                        borderRadius: 6,
                        border: "1px solid rgba(56, 189, 248, 0.4)",
                        background: "rgba(14, 165, 233, 0.18)",
                        color: "#7dd3fc",
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      選択中のピンに戻る
                    </button>
                  )}
                </div>

                {/* Google Maps JS API Container OR Zero-Config Google Maps Embed Fallback */}
                {GOOGLE_MAPS_API_KEY && gmapsSdkReady && !gmapsSdkFailed ? (
                  <div
                    ref={gmapCanvasRef}
                    style={{
                      width: "100%",
                      height: 295,
                      background: "#071222",
                    }}
                    aria-label="Google マップ（地域コミュニティ安全ピン）"
                  />
                ) : (
                  <iframe
                    key={`gmap-embed-${activeGoogleMapCenter.lat}-${activeGoogleMapCenter.lng}`}
                    title={`Google マップ - ${activeGoogleMapCenter.label}`}
                    src={`https://maps.google.com/maps?q=${encodeURIComponent(
                      `${activeGoogleMapCenter.lat},${activeGoogleMapCenter.lng}`
                    )}&z=16&hl=ja&output=embed`}
                    style={{
                      width: "100%",
                      height: 295,
                      border: 0,
                      display: "block",
                      background: "#071222",
                    }}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                )}

                {/* Pin Selector Strip directly beneath Google Map (1-click fly-to coordinate) */}
                <div
                  style={{
                    padding: "9px 12px",
                    background: "rgba(15, 23, 42, 0.95)",
                    borderTop: "1px solid rgba(56, 189, 248, 0.22)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 6,
                      fontSize: "0.72rem",
                      color: "#94a3b8",
                    }}
                  >
                    <span style={{ fontWeight: 700, color: "#cbd5e1" }}>
                      🎯 ピン選択ストリップ（クリックでGoogleマップがその座標へ即座に移動）:
                    </span>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <span>
                        <span style={{ color: "#ef4444" }}>●</span> 緊急
                      </span>
                      <span>
                        <span style={{ color: "#f59e0b" }}>●</span> 注意
                      </span>
                      <span>
                        <span style={{ color: "#38bdf8" }}>●</span> 改善提案
                      </span>
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 6,
                      overflowX: "auto",
                      paddingBottom: 3,
                    }}
                  >
                    {filteredPins.map((pin) => {
                      const isSelected =
                        !gmapsCenterOverride && selectedPin?.id === pin.id;
                      const sev = severityColor(pin.analysis.severity_level);
                      const cat = categoryMeta(pin.analysis.category);
                      return (
                        <button
                          key={`strip-${pin.id}`}
                          type="button"
                          onClick={() => {
                            setGmapsCenterOverride(null);
                            setSelectedPinId(pin.id);
                          }}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "5px 10px",
                            borderRadius: 999,
                            border: isSelected
                              ? `1.5px solid ${sev.dot}`
                              : "1px solid rgba(148, 163, 184, 0.28)",
                            background: isSelected
                              ? sev.bg
                              : "rgba(2, 6, 23, 0.72)",
                            color: isSelected ? "#ffffff" : "#cbd5e1",
                            fontSize: "0.73rem",
                            fontWeight: isSelected ? 800 : 600,
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                            flexShrink: 0,
                          }}
                        >
                          <span style={{ color: sev.dot, fontSize: "0.8rem" }}>
                            ●
                          </span>
                          <span>{cat.icon}</span>
                          <span>
                            {pin.analysis.title.length > 14
                              ? `${pin.analysis.title.slice(0, 14)}…`
                              : pin.analysis.title}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              /* Interactive SVG Neighborhood Radar Map */
              <div
                style={{
                  position: "relative",
                  borderRadius: 14,
                  overflow: "hidden",
                  border: "1px solid rgba(56, 189, 248, 0.35)",
                  background: "#06101e",
                }}
              >
                <svg
                  viewBox="0 0 600 340"
                  onClick={handleRadarSvgClick}
                  style={{
                    width: "100%",
                    height: 295,
                    display: "block",
                    cursor: "crosshair",
                  }}
                  aria-label="地域安全レーダーマップ（ピンをクリックして詳細を表示）"
                >
                  <defs>
                    <radialGradient id="radarGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="rgba(16, 185, 129, 0.16)" />
                      <stop offset="65%" stopColor="rgba(14, 165, 233, 0.06)" />
                      <stop offset="100%" stopColor="rgba(6, 16, 30, 0)" />
                    </radialGradient>
                  </defs>

                  {/* Radar Background & Grid */}
                  <rect width="600" height="340" fill="#071222" />
                  <circle cx="300" cy="170" r="160" fill="url(#radarGlow)" />
                  {[60, 120, 180, 240].map((r) => (
                    <circle
                      key={r}
                      cx="300"
                      cy="170"
                      r={r}
                      fill="none"
                      stroke="rgba(56, 189, 248, 0.12)"
                      strokeDasharray="4 4"
                    />
                  ))}
                  {[100, 200, 300, 400, 500].map((x) => (
                    <line
                      key={`gx-${x}`}
                      x1={x}
                      y1={0}
                      x2={x}
                      y2={340}
                      stroke="rgba(56, 189, 248, 0.08)"
                    />
                  ))}
                  {[68, 136, 204, 272].map((y) => (
                    <line
                      key={`gy-${y}`}
                      x1={0}
                      y1={y}
                      x2={600}
                      y2={y}
                      stroke="rgba(56, 189, 248, 0.08)"
                    />
                  ))}

                  {/* Neighborhood River & Main Roads */}
                  <path
                    d="M 0 45 Q 240 65, 420 25 T 600 40"
                    fill="none"
                    stroke="rgba(14, 165, 233, 0.28)"
                    strokeWidth="14"
                  />
                  <path
                    d="M 40 340 L 210 155 L 570 155"
                    fill="none"
                    stroke="rgba(148, 163, 184, 0.25)"
                    strokeWidth="10"
                  />
                  <path
                    d="M 165 0 L 165 340"
                    fill="none"
                    stroke="rgba(148, 163, 184, 0.22)"
                    strokeWidth="8"
                  />
                  <path
                    d="M 410 0 L 380 340"
                    fill="none"
                    stroke="rgba(148, 163, 184, 0.18)"
                    strokeWidth="6"
                  />

                  {/* School Zone & Civic Landmarks */}
                  <rect
                    x="355"
                    y="58"
                    width="95"
                    height="42"
                    rx="6"
                    fill="rgba(16, 185, 129, 0.12)"
                    stroke="rgba(16, 185, 129, 0.35)"
                  />
                  <text
                    x="402"
                    y="83"
                    textAnchor="middle"
                    fill="#6ee7b7"
                    fontSize="11"
                    fontWeight="700"
                  >
                    🏫 第一小学校
                  </text>

                  <rect
                    x="118"
                    y="128"
                    width="92"
                    height="40"
                    rx="6"
                    fill="rgba(56, 189, 248, 0.14)"
                    stroke="rgba(56, 189, 248, 0.4)"
                  />
                  <text
                    x="164"
                    y="152"
                    textAnchor="middle"
                    fill="#7dd3fc"
                    fontSize="11"
                    fontWeight="700"
                  >
                    🚉 中央駅南口
                  </text>

                  <rect
                    x="208"
                    y="235"
                    width="116"
                    height="40"
                    rx="6"
                    fill="rgba(168, 85, 247, 0.13)"
                    stroke="rgba(168, 85, 247, 0.38)"
                  />
                  <text
                    x="266"
                    y="259"
                    textAnchor="middle"
                    fill="#d8b4fe"
                    fontSize="10.5"
                    fontWeight="700"
                  >
                    🏛️ 図書館・子育て支援
                  </text>

                  <text
                    x="88"
                    y="56"
                    fill="#94a3b8"
                    fontSize="10"
                    fontWeight="600"
                  >
                    🌲 緑が丘通学路ゾーン
                  </text>
                  <text
                    x="485"
                    y="245"
                    fill="#94a3b8"
                    fontSize="10"
                    fontWeight="600"
                  >
                    🛍️ さくら通り商店街
                  </text>

                  {/* Draft Target Crosshair (where a new report will be plotted) */}
                  <g
                    transform={`translate(${(draftMapX / 100) * 600}, ${
                      (draftMapY / 100) * 340
                    })`}
                  >
                    <circle
                      r="14"
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="1.5"
                      strokeDasharray="3 3"
                    />
                    <line
                      x1="-18"
                      y1="0"
                      x2="18"
                      y2="0"
                      stroke="#38bdf8"
                      strokeWidth="1"
                    />
                    <line
                      x1="0"
                      y1="-18"
                      x2="0"
                      y2="18"
                      stroke="#38bdf8"
                      strokeWidth="1"
                    />
                  </g>

                  {/* Plotted Community Safety Pins */}
                  {filteredPins.map((pin) => {
                    const cx = (pin.mapX / 100) * 600;
                    const cy = (pin.mapY / 100) * 340;
                    const isActive = selectedPin?.id === pin.id;
                    const sev = severityColor(pin.analysis.severity_level);
                    const cat = categoryMeta(pin.analysis.category);

                    return (
                      <g
                        key={pin.id}
                        transform={`translate(${cx}, ${cy})`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setGmapsCenterOverride(null);
                          setSelectedPinId(pin.id);
                          inspectionCardRef.current?.scrollIntoView({
                            behavior: "smooth",
                            block: "nearest",
                          });
                        }}
                        style={{ cursor: "pointer" }}
                      >
                        {isActive && (
                          <circle
                            r="24"
                            fill="none"
                            stroke={sev.dot}
                            strokeWidth="2.5"
                            opacity="0.85"
                          />
                        )}
                        <circle
                          r={isActive ? "16" : "13"}
                          fill={sev.dot}
                          fillOpacity={isActive ? "0.95" : "0.82"}
                          stroke="#0f172a"
                          strokeWidth="2.5"
                        />
                        <text
                          x="0"
                          y="4"
                          textAnchor="middle"
                          fontSize={isActive ? "12" : "10.5"}
                        >
                          {cat.icon}
                        </text>
                        <rect
                          x="-58"
                          y={isActive ? "-36" : "-32"}
                          width="116"
                          height="17"
                          rx="4"
                          fill={
                            isActive
                              ? "rgba(15, 23, 42, 0.96)"
                              : "rgba(15, 23, 42, 0.82)"
                          }
                          stroke={sev.dot}
                          strokeWidth={isActive ? "1.4" : "0.8"}
                        />
                        <text
                          x="0"
                          y={isActive ? "-24" : "-20"}
                          textAnchor="middle"
                          fill="#f8fafc"
                          fontSize="9.2"
                          fontWeight="700"
                        >
                          {pin.analysis.severity_level} ·{" "}
                          {pin.analysis.title.slice(0, 8)}…
                        </text>
                      </g>
                    );
                  })}
                </svg>

                {/* Radar Legend Footer */}
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    padding: "8px 12px",
                    background: "rgba(15, 23, 42, 0.92)",
                    borderTop: "1px solid rgba(56, 189, 248, 0.2)",
                    fontSize: "0.74rem",
                    color: "#94a3b8",
                  }}
                >
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <span>
                      <span style={{ color: "#ef4444" }}>●</span> 緊急
                    </span>
                    <span>
                      <span style={{ color: "#f59e0b" }}>●</span> 注意
                    </span>
                    <span>
                      <span style={{ color: "#38bdf8" }}>●</span> 改善提案
                    </span>
                    <span>🎯 青十字: 新規ピン予定位置（マップクリックで移動）</span>
                  </div>
                  <span>ピンをクリックすると検査カード＆通報レポートを展開</span>
                </div>
              </div>
            )}

            {/* 1-Click Google Maps Action Bar (Open in Google Maps, Safe Walking Route, Street View) */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                alignItems: "center",
              }}
            >
              <a
                href={`https://www.google.com/maps?q=${encodeURIComponent(
                  `${activeGoogleMapCenter.lat},${activeGoogleMapCenter.lng}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  flex: 1,
                  minWidth: 145,
                  textAlign: "center",
                  padding: "7px 10px",
                  borderRadius: 9,
                  border: "1px solid rgba(56, 189, 248, 0.45)",
                  background: "rgba(14, 165, 233, 0.16)",
                  color: "#7dd3fc",
                  fontSize: "0.76rem",
                  fontWeight: 800,
                  textDecoration: "none",
                }}
              >
                🗺️ Google マップで開く ↗
              </a>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                  `${activeGoogleMapCenter.lat},${activeGoogleMapCenter.lng}`
                )}&travelmode=walking`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  flex: 1,
                  minWidth: 145,
                  textAlign: "center",
                  padding: "7px 10px",
                  borderRadius: 9,
                  border: "1px solid rgba(52, 211, 153, 0.45)",
                  background: "rgba(16, 185, 129, 0.16)",
                  color: "#6ee7b7",
                  fontSize: "0.76rem",
                  fontWeight: 800,
                  textDecoration: "none",
                }}
              >
                🚶 安全ルートを検索 ↗
              </a>
              <a
                href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${encodeURIComponent(
                  `${activeGoogleMapCenter.lat},${activeGoogleMapCenter.lng}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  flex: 1,
                  minWidth: 155,
                  textAlign: "center",
                  padding: "7px 10px",
                  borderRadius: 9,
                  border: "1px solid rgba(192, 132, 252, 0.45)",
                  background: "rgba(168, 85, 247, 0.16)",
                  color: "#e9d5ff",
                  fontSize: "0.76rem",
                  fontWeight: 800,
                  textDecoration: "none",
                }}
              >
                👁️ ストリートビューで確認 ↗
              </a>
            </div>

            {/* Compact Scrollable Pin List under the Map */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                maxHeight: 155,
                overflowY: "auto",
                paddingRight: 4,
              }}
            >
              {filteredPins.map((pin) => {
                const active = selectedPin?.id === pin.id;
                const sev = severityColor(pin.analysis.severity_level);
                const cat = categoryMeta(pin.analysis.category);
                return (
                  <div
                    key={pin.id}
                    onClick={() => {
                      setGmapsCenterOverride(null);
                      setSelectedPinId(pin.id);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                      padding: "8px 11px",
                      borderRadius: 10,
                      background: active
                        ? "rgba(14, 165, 233, 0.18)"
                        : "rgba(2, 6, 23, 0.55)",
                      border: active
                        ? "1px solid #38bdf8"
                        : "1px solid rgba(148, 163, 184, 0.16)",
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        minWidth: 0,
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          padding: "2px 7px",
                          borderRadius: 999,
                          background: sev.bg,
                          border: `1px solid ${sev.border}`,
                          color: sev.text,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {pin.analysis.severity_level}
                      </span>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          color: cat.color,
                          fontWeight: 700,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {cat.icon} {pin.analysis.category}
                      </span>
                      <span
                        style={{
                          fontSize: "0.81rem",
                          fontWeight: 600,
                          color: "#f1f5f9",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {pin.analysis.title}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        whiteSpace: "nowrap",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.72rem",
                          color: "#94a3b8",
                        }}
                      >
                        Score {pin.analysis.hazard_score}
                      </span>
                      <span
                        style={{
                          fontSize: "0.7rem",
                          padding: "2px 7px",
                          borderRadius: 6,
                          background:
                            pin.workflowStatus === "改善完了"
                              ? "rgba(16, 185, 129, 0.2)"
                              : pin.workflowStatus === "自治体通報済"
                              ? "rgba(56, 189, 248, 0.2)"
                              : "rgba(148, 163, 184, 0.18)",
                          color:
                            pin.workflowStatus === "改善完了"
                              ? "#6ee7b7"
                              : pin.workflowStatus === "自治体通報済"
                              ? "#7dd3fc"
                              : "#cbd5e1",
                        }}
                      >
                        {pin.workflowStatus}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
              </section>
            )}
          </div>
        )}

        {/* STEP 3 (Progressive Disclosure): Inspection Result + Collapsible <details> for Multilingual Notice & Municipality Report / Save */}
        {(selectedGoal === "map" ||
          (selectedGoal !== null && hasCompletedInspection)) &&
          selectedPin && (
            <div
              ref={inspectionCardRef}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              {/* FULL INSPECTION SUMMARY CARD */}
              <section
                aria-live="polite"
                style={{
                  borderRadius: 18,
                  padding: "22px 24px",
                  background: "rgba(15, 23, 42, 0.86)",
                  border: "1px solid rgba(56, 189, 248, 0.3)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        fontSize: "0.76rem",
                        fontWeight: 800,
                        padding: "4px 10px",
                        borderRadius: 999,
                        background: severityColor(
                          selectedPin.analysis.severity_level
                        ).bg,
                        border: `1px solid ${
                          severityColor(selectedPin.analysis.severity_level)
                            .border
                        }`,
                        color: severityColor(selectedPin.analysis.severity_level)
                          .text,
                      }}
                    >
                      {selectedPin.analysis.severity_level}（Lv.
                      {selectedPin.analysis.severity}/5）
                    </span>
                    <span
                      style={{
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        padding: "4px 10px",
                        borderRadius: 999,
                        background: "rgba(30, 41, 59, 0.9)",
                        color: categoryMeta(selectedPin.analysis.category).color,
                      }}
                    >
                      {categoryMeta(selectedPin.analysis.category).icon}{" "}
                      {selectedPin.analysis.category}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    {selectedGoal !== "map" && (
                      <button
                        type="button"
                        onClick={() => {
                          setGmapsCenterOverride(null);
                          setSelectedGoal("map");
                          setMapViewMode("gmaps");
                        }}
                        style={{
                          padding: "5px 11px",
                          borderRadius: 8,
                          border: "1px solid rgba(192, 132, 252, 0.45)",
                          background: "rgba(168, 85, 247, 0.18)",
                          color: "#e9d5ff",
                          fontSize: "0.76rem",
                          fontWeight: 800,
                          cursor: "pointer",
                        }}
                      >
                        🗺️ 安全マップ（Google マップ）でこのピンを見る
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleUpvotePin(selectedPin.id)}
                      style={{
                        padding: "5px 11px",
                        borderRadius: 8,
                        border: "1px solid rgba(56, 189, 248, 0.4)",
                        background: "rgba(14, 165, 233, 0.15)",
                        color: "#7dd3fc",
                        fontSize: "0.76rem",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      👍 私も確認した ({selectedPin.upvotes})
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCyclePinStatus(selectedPin.id)}
                      style={{
                        padding: "5px 11px",
                        borderRadius: 8,
                        border: "1px solid rgba(16, 185, 129, 0.4)",
                        background: "rgba(16, 185, 129, 0.14)",
                        color: "#6ee7b7",
                        fontSize: "0.76rem",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      状態: {selectedPin.workflowStatus} ↻
                    </button>
                  </div>
                </div>

                <div>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: "1.22rem",
                      fontWeight: 800,
                      color: "#f8fafc",
                      lineHeight: 1.4,
                    }}
                  >
                    {selectedPin.analysis.title}
                  </h3>
                  <div
                    style={{
                      marginTop: 6,
                      fontSize: "0.82rem",
                      color: "#94a3b8",
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <span>📍 {selectedPin.locationText}</span>
                    <span>
                      🌐 ({selectedPin.latitude}, {selectedPin.longitude})
                    </span>
                  </div>
                  <div
                    style={{
                      marginTop: 8,
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 8,
                    }}
                  >
                    <a
                      href={`https://www.google.com/maps?q=${encodeURIComponent(
                        `${selectedPin.latitude},${selectedPin.longitude}`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: "5px 11px",
                        borderRadius: 8,
                        border: "1px solid rgba(56, 189, 248, 0.45)",
                        background: "rgba(14, 165, 233, 0.16)",
                        color: "#7dd3fc",
                        textDecoration: "none",
                        fontSize: "0.76rem",
                        fontWeight: 800,
                      }}
                    >
                      🗺️ Google マップで開く ↗
                    </a>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                        `${selectedPin.latitude},${selectedPin.longitude}`
                      )}&travelmode=walking`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: "5px 11px",
                        borderRadius: 8,
                        border: "1px solid rgba(52, 211, 153, 0.45)",
                        background: "rgba(16, 185, 129, 0.16)",
                        color: "#6ee7b7",
                        textDecoration: "none",
                        fontSize: "0.76rem",
                        fontWeight: 800,
                      }}
                    >
                      🚶 安全ルートを検索 ↗
                    </a>
                    <a
                      href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${encodeURIComponent(
                        `${selectedPin.latitude},${selectedPin.longitude}`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: "5px 11px",
                        borderRadius: 8,
                        border: "1px solid rgba(192, 132, 252, 0.45)",
                        background: "rgba(168, 85, 247, 0.16)",
                        color: "#e9d5ff",
                        textDecoration: "none",
                        fontSize: "0.76rem",
                        fontWeight: 800,
                      }}
                    >
                      👁️ ストリートビューで確認 ↗
                    </a>
                  </div>
                </div>

                {/* Safe Detour & Evacuation Advice (Highlighted first for immediate user utility) */}
                <div
                  style={{
                    padding: "13px 15px",
                    borderRadius: 12,
                    background: "rgba(14, 165, 233, 0.14)",
                    border: "1.5px solid rgba(56, 189, 248, 0.45)",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.78rem",
                      fontWeight: 800,
                      color: "#38bdf8",
                      marginBottom: 4,
                    }}
                  >
                    ♿ バリアフリー迂回・日陰・防災安全アドバイス（車椅子・ベビーカー・高齢者向け）
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.86rem",
                      fontWeight: 700,
                      color: "#f0f9ff",
                      lineHeight: 1.6,
                    }}
                  >
                    {selectedPin.analysis.safe_detour_advice ||
                      selectedPin.analysis.recommended_action}
                  </p>
                </div>

                {/* Hazard Score Meter & Responsible Department */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      padding: "12px 14px",
                      borderRadius: 12,
                      background: "rgba(2, 6, 23, 0.55)",
                      border: "1px solid rgba(148, 163, 184, 0.2)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "0.74rem",
                        color: "#94a3b8",
                        fontWeight: 600,
                      }}
                    >
                      AI 総合ハザードスコア
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        gap: 6,
                        marginTop: 4,
                      }}
                    >
                      <span
                        style={{
                          fontSize: "1.65rem",
                          fontWeight: 900,
                          color: severityColor(
                            selectedPin.analysis.severity_level
                          ).dot,
                        }}
                      >
                        {selectedPin.analysis.hazard_score}
                      </span>
                      <span style={{ fontSize: "0.82rem", color: "#94a3b8" }}>
                        / 100
                      </span>
                    </div>
                    <div
                      style={{
                        marginTop: 6,
                        height: 7,
                        borderRadius: 999,
                        background: "rgba(30, 41, 59, 0.9)",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${selectedPin.analysis.hazard_score}%`,
                          height: "100%",
                          background: severityColor(
                            selectedPin.analysis.severity_level
                          ).dot,
                        }}
                      />
                    </div>
                  </div>

                  <div
                    style={{
                      padding: "12px 14px",
                      borderRadius: 12,
                      background: "rgba(2, 6, 23, 0.55)",
                      border: "1px solid rgba(148, 163, 184, 0.2)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "0.74rem",
                        color: "#94a3b8",
                        fontWeight: 600,
                      }}
                    >
                      自治体 推定所管部署
                    </div>
                    <div
                      style={{
                        fontSize: "0.92rem",
                        fontWeight: 800,
                        color: "#e2e8f0",
                        marginTop: 6,
                      }}
                    >
                      🏛️ {selectedPin.analysis.department}
                    </div>
                    <div
                      style={{
                        fontSize: "0.73rem",
                        color: "#38bdf8",
                        marginTop: 4,
                      }}
                    >
                      ⚡ 解析モデル: {selectedPin.usedModel}
                    </div>
                  </div>
                </div>

                {/* Affected Groups & Detailed Assessments inside a clean collapsible <details> */}
                <details
                  style={{
                    borderRadius: 12,
                    background: "rgba(2, 6, 23, 0.5)",
                    border: "1px solid rgba(148, 163, 184, 0.22)",
                    padding: "12px 14px",
                  }}
                >
                  <summary
                    style={{
                      cursor: "pointer",
                      fontSize: "0.84rem",
                      fontWeight: 800,
                      color: "#7dd3fc",
                    }}
                  >
                    🔍 詳細なバリアフリー評価・防災インパクト・推奨修繕案を表示する
                  </summary>
                  <div
                    style={{
                      marginTop: 12,
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    <div
                      style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        background: "rgba(14, 165, 233, 0.08)",
                        border: "1px solid rgba(56, 189, 248, 0.22)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          color: "#7dd3fc",
                          marginBottom: 6,
                        }}
                      >
                        ♿ 影響を受ける当事者・通行者グループ
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {selectedPin.analysis.affected_groups.map((grp) => (
                          <span
                            key={grp}
                            style={{
                              fontSize: "0.76rem",
                              fontWeight: 700,
                              padding: "3px 9px",
                              borderRadius: 999,
                              background: "rgba(15, 23, 42, 0.85)",
                              border: "1px solid rgba(56, 189, 248, 0.35)",
                              color: "#e2e8f0",
                            }}
                          >
                            👥 {grp}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div
                      style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        background: "rgba(15, 23, 42, 0.7)",
                        border: "1px solid rgba(148, 163, 184, 0.16)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          color: "#38bdf8",
                          marginBottom: 4,
                        }}
                      >
                        🦯 バリアフリー・通行アクセシビリティ評価
                      </div>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "0.83rem",
                          color: "#e2e8f0",
                          lineHeight: 1.6,
                        }}
                      >
                        {selectedPin.analysis.barrier_free_assessment}
                      </p>
                    </div>

                    <div
                      style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        background: "rgba(15, 23, 42, 0.7)",
                        border: "1px solid rgba(148, 163, 184, 0.16)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          color: "#fb923c",
                          marginBottom: 4,
                        }}
                      >
                        🌍 防災・環境・地域安全インパクト
                      </div>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "0.83rem",
                          color: "#e2e8f0",
                          lineHeight: 1.6,
                        }}
                      >
                        {selectedPin.analysis.eco_disaster_impact}
                      </p>
                    </div>

                    <div
                      style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        background: "rgba(16, 185, 129, 0.1)",
                        border: "1px solid rgba(16, 185, 129, 0.3)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          color: "#6ee7b7",
                          marginBottom: 4,
                        }}
                      >
                        🛠️ AI 推奨インフラ修繕・改善提案
                      </div>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "0.83rem",
                          color: "#ecfdf5",
                          lineHeight: 1.6,
                        }}
                      >
                        {selectedPin.analysis.suggested_fix}
                      </p>
                    </div>
                  </div>
                </details>

                {/* Privacy Guard Check */}
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: 10,
                    background:
                      selectedPin.analysis.privacy_check.has_face ||
                      selectedPin.analysis.privacy_check.has_license_plate ||
                      selectedPin.analysis.privacy_check.has_nameplate
                        ? "rgba(245, 158, 11, 0.14)"
                        : "rgba(16, 185, 129, 0.1)",
                    border:
                      selectedPin.analysis.privacy_check.has_face ||
                      selectedPin.analysis.privacy_check.has_license_plate ||
                      selectedPin.analysis.privacy_check.has_nameplate
                        ? "1px solid rgba(245, 158, 11, 0.45)"
                        : "1px solid rgba(16, 185, 129, 0.35)",
                    fontSize: "0.78rem",
                    color: "#cbd5e1",
                  }}
                >
                  <strong>🔒 プライバシーAI監査:</strong>{" "}
                  {selectedPin.analysis.privacy_check.warning_message}
                </div>
              </section>

              {/* COLLAPSIBLE <details> 1: Multilingual Safety & Detour Notice Card (JA / EN / ZH / KO) */}
              {(() => {
                const notices = selectedPin.analysis.multilingual_notices ?? {
                  ja: `【やさしい日本語】「${selectedPin.analysis.title}」に注意してください。車いす・ベビーカーのかたは安全なルートへ迂回してください。`,
                  en: `[SAFETY NOTICE] Caution: ${selectedPin.analysis.title}. Wheelchair and stroller users: please take a step-free safe detour.`,
                  zh: `【安全提示】注意：${selectedPin.analysis.title}。轮椅及婴儿车使用者请绕行平坦安全的无障碍通道。`,
                  ko: `【안전 안내】주의: ${selectedPin.analysis.title}. 휠체어·유모차 이용자는 안전한 우회로를 이용해 주세요.`,
                };
                const cardText =
                  multilingualLang === "all"
                    ? [
                        `🇯🇵 [やさしい日本語] ${notices.ja}`,
                        `🇺🇸 [English] ${notices.en}`,
                        `🇨🇳 [中文] ${notices.zh}`,
                        `🇰🇷 [한국어] ${notices.ko}`,
                      ].join("\n")
                    : notices[multilingualLang];

                return (
                  <details
                    style={{
                      borderRadius: 16,
                      padding: "16px 20px",
                      background: "rgba(15, 23, 42, 0.86)",
                      border: "1px solid rgba(168, 85, 247, 0.4)",
                    }}
                  >
                    <summary
                      style={{
                        cursor: "pointer",
                        fontSize: "0.92rem",
                        fontWeight: 800,
                        color: "#e9d5ff",
                      }}
                    >
                      🌐 多言語あんしん注意カードを開く（やさしい日本語 / 英語 / 中国語 / 韓国語 1クリックコピー）
                    </summary>
                    <div style={{ marginTop: 12 }}>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 8,
                          marginBottom: 8,
                        }}
                      >
                        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                          {(
                            [
                              { id: "all", label: "4言語すべて" },
                              { id: "ja", label: "🇯🇵 やさしい日本語" },
                              { id: "en", label: "🇺🇸 EN" },
                              { id: "zh", label: "🇨🇳 中文" },
                              { id: "ko", label: "🇰🇷 한국어" },
                            ] as const
                          ).map((lang) => (
                            <button
                              key={lang.id}
                              type="button"
                              onClick={() => setMultilingualLang(lang.id)}
                              style={{
                                padding: "4px 10px",
                                borderRadius: 999,
                                border:
                                  multilingualLang === lang.id
                                    ? "1px solid #c084fc"
                                    : "1px solid rgba(148, 163, 184, 0.3)",
                                background:
                                  multilingualLang === lang.id
                                    ? "rgba(168, 85, 247, 0.28)"
                                    : "rgba(15, 23, 42, 0.75)",
                                color:
                                  multilingualLang === lang.id
                                    ? "#f3e8ff"
                                    : "#cbd5e1",
                                fontSize: "0.74rem",
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                            >
                              {lang.label}
                            </button>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(cardText);
                              setCopiedMultilingual(true);
                              setTimeout(
                                () => setCopiedMultilingual(false),
                                2500
                              );
                            } catch {
                              // ignore
                            }
                          }}
                          style={{
                            padding: "5px 12px",
                            borderRadius: 7,
                            border: "1px solid rgba(52, 211, 153, 0.45)",
                            background: copiedMultilingual
                              ? "rgba(16, 185, 129, 0.3)"
                              : "rgba(16, 185, 129, 0.16)",
                            color: "#6ee7b7",
                            fontSize: "0.75rem",
                            fontWeight: 800,
                            cursor: "pointer",
                          }}
                        >
                          {copiedMultilingual ? "✓ コピー済" : "📋 注意文をコピー"}
                        </button>
                      </div>
                      <pre
                        style={{
                          margin: 0,
                          whiteSpace: "pre-wrap",
                          fontFamily: "inherit",
                          fontSize: "0.82rem",
                          lineHeight: 1.55,
                          color: "#f8fafc",
                          background: "rgba(2, 6, 23, 0.65)",
                          padding: "10px 12px",
                          borderRadius: 8,
                          border: "1px solid rgba(148, 163, 184, 0.2)",
                        }}
                      >
                        {cardText}
                      </pre>
                    </div>
                  </details>
                );
              })()}

              {/* COLLAPSIBLE <details> 2: 1-CLICK MUNICIPALITY REPORT GENERATOR & LOCAL/GAS SAVE */}
              <details
                style={{
                  borderRadius: 16,
                  padding: "16px 20px",
                  background: "rgba(15, 23, 42, 0.86)",
                  border: "1px solid rgba(16, 185, 129, 0.38)",
                }}
              >
                <summary
                  style={{
                    cursor: "pointer",
                    fontSize: "0.92rem",
                    fontWeight: 800,
                    color: "#6ee7b7",
                  }}
                >
                  📨 自治体通報・改善要望レポート作成 ＆ PC・スマホ保存・Googleシート連携を開く
                </summary>

                <div
                  style={{
                    marginTop: 14,
                    display: "flex",
                    flexDirection: "column",
                    gap: 14,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.8rem",
                        fontWeight: 700,
                        color: "#cbd5e1",
                      }}
                    >
                      通報書フォーマット切替:
                    </span>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {(
                        [
                          { id: "standard", label: "標準通報文" },
                          { id: "urgent", label: "緊急安全措置" },
                          { id: "barrierfree", label: "バリアフリー要望書" },
                        ] as const
                      ).map((mode) => (
                        <button
                          key={mode.id}
                          type="button"
                          onClick={() => setReportFormatMode(mode.id)}
                          style={{
                            padding: "5px 10px",
                            borderRadius: 8,
                            border:
                              reportFormatMode === mode.id
                                ? "1px solid #34d399"
                                : "1px solid rgba(148, 163, 184, 0.25)",
                            background:
                              reportFormatMode === mode.id
                                ? "rgba(16, 185, 129, 0.2)"
                                : "rgba(30, 41, 59, 0.7)",
                            color:
                              reportFormatMode === mode.id
                                ? "#6ee7b7"
                                : "#cbd5e1",
                            fontSize: "0.74rem",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          {mode.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Action Toolbar: Copy, Markdown Download, JSON Download */}
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 8,
                    }}
                  >
                    <button
                      type="button"
                      onClick={handleCopyReport}
                      style={{
                        flex: 1.3,
                        padding: "10px 14px",
                        borderRadius: 10,
                        border: "1px solid rgba(16, 185, 129, 0.5)",
                        background:
                          "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                        color: "#ffffff",
                        fontSize: "0.84rem",
                        fontWeight: 800,
                        cursor: "pointer",
                      }}
                    >
                      {copiedReport
                        ? "✅ クリップボードにコピー完了！"
                        : "📋 1クリックで通報レポートをコピー"}
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadMarkdown}
                      style={{
                        flex: 1,
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: "1px solid rgba(56, 189, 248, 0.4)",
                        background: "rgba(14, 165, 233, 0.16)",
                        color: "#7dd3fc",
                        fontSize: "0.8rem",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      📝 Markdown (.md) 保存
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadJson}
                      style={{
                        flex: 1,
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: "1px solid rgba(148, 163, 184, 0.35)",
                        background: "rgba(30, 41, 59, 0.85)",
                        color: "#e2e8f0",
                        fontSize: "0.8rem",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      📦 構造化 JSON (.json) 保存
                    </button>
                  </div>

                  {/* Generated Formal Report Preview */}
                  <pre
                    style={{
                      margin: 0,
                      padding: "14px 16px",
                      borderRadius: 12,
                      background: "rgba(2, 6, 23, 0.78)",
                      border: "1px solid rgba(148, 163, 184, 0.24)",
                      color: "#e2e8f0",
                      fontSize: "0.8rem",
                      lineHeight: 1.65,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      maxHeight: 280,
                      overflowY: "auto",
                      fontFamily:
                        '"JetBrains Mono", "BIZ UDGothic", "Hiragino Kaku Gothic ProN", monospace',
                    }}
                  >
                    {formattedMunicipalityReport}
                  </pre>

                  {/* Suggested Community Patrol Tasks */}
                  {selectedPin.analysis.suggested_tasks.length > 0 && (
                    <div
                      style={{
                        padding: "12px 14px",
                        borderRadius: 12,
                        background: "rgba(2, 6, 23, 0.5)",
                        border: "1px solid rgba(148, 163, 184, 0.18)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "0.76rem",
                          fontWeight: 700,
                          color: "#cbd5e1",
                          marginBottom: 8,
                        }}
                      >
                        📋 地域見守り・フォローアップ推奨タスク
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 6,
                        }}
                      >
                        {selectedPin.analysis.suggested_tasks.map((t, idx) => (
                          <div
                            key={`${t.title}-${idx}`}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 8,
                              fontSize: "0.79rem",
                              padding: "6px 10px",
                              borderRadius: 8,
                              background: "rgba(15, 23, 42, 0.8)",
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 700, color: "#f1f5f9" }}>
                                ・{t.title}
                              </div>
                              <div
                                style={{ fontSize: "0.73rem", color: "#94a3b8" }}
                              >
                                {t.memo}
                              </div>
                            </div>
                            <span
                              style={{
                                fontSize: "0.7rem",
                                fontWeight: 700,
                                padding: "2px 8px",
                                borderRadius: 999,
                                background:
                                  t.priority === "high"
                                    ? "rgba(239, 68, 68, 0.2)"
                                    : "rgba(56, 189, 248, 0.18)",
                                color:
                                  t.priority === "high" ? "#fca5a5" : "#7dd3fc",
                              }}
                            >
                              {t.priority}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Local PC/Smartphone Save (.json / .md) & Google Workspace GAS Dock */}
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                      padding: "12px 14px",
                      borderRadius: 12,
                      background: "rgba(14, 165, 233, 0.1)",
                      border: "1px solid rgba(56, 189, 248, 0.28)",
                    }}
                  >
                    <span style={{ fontSize: "0.78rem", color: "#cbd5e1" }}>
                      PC・スマホへの通報書ファイル保存（.json / .md）、および地域安全台帳シート・カレンダー連携
                    </span>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      <button
                        type="button"
                        onClick={handleSaveToLocalDevice}
                        disabled={driveArchiving}
                        style={{
                          padding: "8px 14px",
                          borderRadius: 9,
                          border: "1px solid rgba(52, 211, 153, 0.55)",
                          background:
                            "linear-gradient(135deg, #059669 0%, #0284c7 100%)",
                          color: "#ffffff",
                          fontSize: "0.78rem",
                          fontWeight: 800,
                          cursor: driveArchiving ? "wait" : "pointer",
                        }}
                      >
                        {driveArchiving
                          ? "⏳ 保存中..."
                          : "💾 PC・スマホに保存 (.json / .md)"}
                      </button>
                      <button
                        type="button"
                        onClick={handleGasSync}
                        disabled={gasSyncing}
                        style={{
                          padding: "8px 14px",
                          borderRadius: 9,
                          border: "1px solid rgba(56, 189, 248, 0.45)",
                          background: "rgba(2, 132, 199, 0.85)",
                          color: "#ffffff",
                          fontSize: "0.78rem",
                          fontWeight: 700,
                          cursor: gasSyncing ? "wait" : "pointer",
                        }}
                      >
                        {gasSyncing
                          ? "⏳ Google Workspace 連携中..."
                          : "🗺️ Google シート / カレンダーへ連携 (GAS)"}
                      </button>
                    </div>
                  </div>

                  {driveArchiveInfo && (
                    <div
                      style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        background: "rgba(16, 185, 129, 0.16)",
                        border: "1px solid rgba(16, 185, 129, 0.45)",
                        color: "#a7f3d0",
                        fontSize: "0.8rem",
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      <div>
                        💾 <strong>PC・スマホへのローカル保存完了</strong>{" "}
                        <span
                          style={{
                            fontSize: "0.72rem",
                            padding: "2px 7px",
                            borderRadius: 999,
                            background: "rgba(15, 23, 42, 0.65)",
                            color: "#6ee7b7",
                          }}
                        >
                          {driveArchiveInfo.mode}
                        </span>
                      </div>
                      <div>{driveArchiveInfo.message}</div>
                      {driveArchiveInfo.folder && (
                        <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                          📁 保存ファイル: <code>{driveArchiveInfo.folder}</code>
                        </div>
                      )}
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                          type="button"
                          onClick={handleDownloadMarkdown}
                          style={{
                            padding: "5px 10px",
                            borderRadius: 7,
                            border: "1px solid rgba(56, 189, 248, 0.45)",
                            background: "rgba(14, 165, 233, 0.2)",
                            color: "#7dd3fc",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          📝 Markdown (.md) を再ダウンロード
                        </button>
                        <button
                          type="button"
                          onClick={handleDownloadJson}
                          style={{
                            padding: "5px 10px",
                            borderRadius: 7,
                            border: "1px solid rgba(148, 163, 184, 0.35)",
                            background: "rgba(30, 41, 59, 0.85)",
                            color: "#e2e8f0",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          📦 JSON (.json) をダウンロード
                        </button>
                      </div>
                    </div>
                  )}
                  {driveError && (
                    <div
                      style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        background: "rgba(239, 68, 68, 0.16)",
                        border: "1px solid rgba(239, 68, 68, 0.4)",
                        color: "#fecaca",
                        fontSize: "0.8rem",
                      }}
                    >
                      ⚠️ {driveError}
                    </div>
                  )}

                  {gasMessage && (
                    <div
                      style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        background: "rgba(16, 185, 129, 0.16)",
                        border: "1px solid rgba(16, 185, 129, 0.4)",
                        color: "#a7f3d0",
                        fontSize: "0.8rem",
                      }}
                    >
                      ✅ {gasMessage}
                    </div>
                  )}
                  {gasError && (
                    <div
                      style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        background: "rgba(239, 68, 68, 0.16)",
                        border: "1px solid rgba(239, 68, 68, 0.4)",
                        color: "#fecaca",
                        fontSize: "0.8rem",
                      }}
                    >
                      ⚠️ {gasError}
                    </div>
                  )}
                </div>
              </details>
            </div>
          )}
      </div>
    </div>
  );
}
