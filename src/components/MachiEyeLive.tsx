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

const STORAGE_KEY = "machieye_live_community_pins_v2";
const ACCEPTED_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_IMAGE_DIM = 1600;

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
    badge: "🦯 シナリオ1",
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
    badge: "🌧️ シナリオ2",
    shortTitle: "冠水・側溝詰まりリスク",
    subtitle: "雨水桝85%閉塞による内水氾濫とプラ流出",
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
    badge: "👶 シナリオ3",
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
    badge: "🚸 シナリオ4",
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
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        if (!locationText.trim()) {
          setLocationText("現在地（GPS自動取得地点）");
        }
        setGpsLoading(false);
        setStatusBanner("📍 現在地のGPS座標を取得しました。");
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
      setSelectedPinId(newPin.id);
      setFilterCategory("すべて");
      setFilterSeverity("すべて");
      setStatusBanner(
        `✅ AI ハザード＆バリアフリー点検が完了し、コミュニティ安全マップに新規ピン「${data.result.title}」をプロットしました！`
      );
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

  const handleDriveArchive = async () => {
    if (!selectedPin) return;
    setDriveArchiving(true);
    setDriveArchiveInfo(null);
    setDriveError("");

    try {
      const res = await fetch("/api/drive-archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          app: "MachiEye",
          title: selectedPin.analysis.title,
          jsonData: selectedPin,
          markdown: formattedMunicipalityReport,
          imageBase64: imageBase64 || undefined,
        }),
      });
      const data = (await res.json()) as Record<string, unknown>;
      if (!res.ok || data.ok === false) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "Google Drive アーカイブ保存に失敗しました。"
        );
      }

      const folder =
        typeof data.previewFolder === "string"
          ? data.previewFolder
          : "GoogleAIChallenge_5TB/MachiEye";
      const url =
        typeof data.driveUrl === "string"
          ? data.driveUrl
          : typeof data.fileUrl === "string"
          ? data.fileUrl
          : typeof data.folderUrl === "string"
          ? data.folderUrl
          : typeof data.url === "string"
          ? data.url
          : undefined;
      const mode =
        typeof data.mode === "string" ? data.mode : "google-drive-5tb";
      const message =
        typeof data.message === "string"
          ? data.message
          : `Google Drive (5TB)「${folder}」に現場検査データ・Markdown通報書・写真をアーカイブ保存しました。`;

      setDriveArchiveInfo({ mode, message, folder, url });
    } catch (err) {
      setDriveError(
        err instanceof Error
          ? err.message
          : "Google Drive アーカイブ保存中にエラーが発生しました。"
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
              📘 GapTutor（はたらく・まなぶ）
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
              📮 おたよりバトン（暮らしと家族）
            </Link>
            <Link
              href="/guardian"
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
              🛡️ CodeGuardian（開発支援）
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
            🌏 まちと地球の未来部門 フラッグシップ
          </span>
        </nav>

        {/* Hero Banner */}
        <header
          style={{
            borderRadius: 20,
            padding: "24px 26px",
            background:
              "linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(12, 34, 52, 0.9) 100%)",
            border: "1px solid rgba(56, 189, 248, 0.3)",
            boxShadow: "0 18px 40px -15px rgba(0, 0, 0, 0.6)",
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
              marginBottom: 12,
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
                      fontSize: "1.65rem",
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
                    CIVIC RADAR & BARRIER-FREE AI
                  </span>
                </div>
                <p
                  style={{
                    margin: "4px 0 0",
                    fontSize: "0.92rem",
                    color: "#94a3b8",
                  }}
                >
                  街の危険箇所・バリアフリー課題を写真1枚でAI検診。地域安全レーダーマップと自治体提出レポートを1クリック生成
                </p>
              </div>
            </div>

            {/* Live KPI Metrics */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              <div
                style={{
                  padding: "8px 14px",
                  borderRadius: 12,
                  background: "rgba(15, 23, 42, 0.75)",
                  border: "1px solid rgba(148, 163, 184, 0.2)",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>
                  地域マップ登録ピン
                </div>
                <div
                  style={{
                    fontSize: "1.15rem",
                    fontWeight: 800,
                    color: "#38bdf8",
                  }}
                >
                  {summaryStats.total} 地点
                </div>
              </div>
              <div
                style={{
                  padding: "8px 14px",
                  borderRadius: 12,
                  background: "rgba(15, 23, 42, 0.75)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "0.72rem", color: "#fca5a5" }}>
                  緊急トリアージ
                </div>
                <div
                  style={{
                    fontSize: "1.15rem",
                    fontWeight: 800,
                    color: "#ef4444",
                  }}
                >
                  {summaryStats.urgentCount} 件
                </div>
              </div>
              <div
                style={{
                  padding: "8px 14px",
                  borderRadius: 12,
                  background: "rgba(15, 23, 42, 0.75)",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "0.72rem", color: "#6ee7b7" }}>
                  自治体連携・対応済
                </div>
                <div
                  style={{
                    fontSize: "1.15rem",
                    fontWeight: 800,
                    color: "#10b981",
                  }}
                >
                  {summaryStats.resolvedCount} 件
                </div>
              </div>
            </div>
          </div>

          {/* 4 Realistic Built-in Scenarios Quick Bar */}
          <div
            style={{
              marginTop: 14,
              paddingTop: 14,
              borderTop: "1px solid rgba(148, 163, 184, 0.16)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 8,
                marginBottom: 10,
              }}
            >
              <span
                style={{
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  color: "#cbd5e1",
                }}
              >
                ⚡ 審査員向け1クリック実証シナリオ（クリックで模擬カメラ画像＋現場データを即時解析＆マップ選択）:
              </span>
              <span style={{ fontSize: "0.76rem", color: "#94a3b8" }}>
                Gemini Vision API + Deterministic Civic Engine デュアル対応
              </span>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(245px, 1fr))",
                gap: 10,
              }}
            >
              {BUILTIN_SCENARIOS.map((sc) => {
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
                        🔍 1クリックAI検診
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </header>

        {statusBanner && (
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

        {errorMsg && (
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

        {/* Top Main 2-Column Layout: Left = Multimodal Inspector, Right = Interactive Neighborhood Radar Map */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(480px, 1fr))",
            gap: 22,
            marginBottom: 24,
          }}
        >
          {/* PANEL 1: Multimodal Photo/Camera Hazard & Barrier-Free Inspector */}
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
                  {gpsLoading ? "取得中..." : "📍 GPS取得"}
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

          {/* PANEL 2: Interactive Community Safety Pin Map (SVG Neighborhood Radar Map) */}
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
                  MODULE 02 // NEIGHBORHOOD SAFETY RADAR MAP
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

            {/* Interactive SVG Neighborhood Radar Map */}
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
                    onClick={() => setSelectedPinId(pin.id)}
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
        </div>

        {/* BOTTOM SECTION: Full Inspection Card + 1-Click Municipality Report Generator */}
        {selectedPin && (
          <div
            ref={inspectionCardRef}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(480px, 1fr))",
              gap: 22,
            }}
          >
            {/* FULL INSPECTION CARD */}
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

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
                    gap: 12,
                  }}
                >
                  <span>📍 {selectedPin.locationText}</span>
                  <span>
                    🌐 ({selectedPin.latitude}, {selectedPin.longitude})
                  </span>
                  <a
                    href={`https://www.google.com/maps?q=${encodeURIComponent(
                      `${selectedPin.latitude},${selectedPin.longitude}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: "#38bdf8",
                      textDecoration: "none",
                      fontWeight: 700,
                    }}
                  >
                    Google マップで開く ↗
                  </a>
                </div>
              </div>

              {/* Hazard Score Meter & Responsible Department */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1.2fr",
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

              {/* Affected Groups Chips */}
              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: 12,
                  background: "rgba(14, 165, 233, 0.08)",
                  border: "1px solid rgba(56, 189, 248, 0.24)",
                }}
              >
                <div
                  style={{
                    fontSize: "0.76rem",
                    fontWeight: 700,
                    color: "#7dd3fc",
                    marginBottom: 8,
                  }}
                >
                  ♿ 影響を受ける当事者・通行者グループ
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {selectedPin.analysis.affected_groups.map((grp) => (
                    <span
                      key={grp}
                      style={{
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        padding: "4px 10px",
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

              {/* Barrier-free Assessment & Disaster Impact */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
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
                      color: "#38bdf8",
                      marginBottom: 4,
                    }}
                  >
                    🦯 バリアフリー・通行アクセシビリティ評価
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.84rem",
                      color: "#e2e8f0",
                      lineHeight: 1.6,
                    }}
                  >
                    {selectedPin.analysis.barrier_free_assessment}
                  </p>
                </div>

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
                      color: "#fb923c",
                      marginBottom: 4,
                    }}
                  >
                    🌍 防災・環境・地域安全インパクト
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.84rem",
                      color: "#e2e8f0",
                      lineHeight: 1.6,
                    }}
                  >
                    {selectedPin.analysis.eco_disaster_impact}
                  </p>
                </div>

                <div
                  style={{
                    padding: "12px 14px",
                    borderRadius: 12,
                    background: "rgba(16, 185, 129, 0.1)",
                    border: "1px solid rgba(16, 185, 129, 0.32)",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.76rem",
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
                      fontSize: "0.84rem",
                      color: "#ecfdf5",
                      lineHeight: 1.6,
                    }}
                  >
                    {selectedPin.analysis.suggested_fix}
                  </p>
                </div>
              </div>

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

            {/* 1-CLICK MUNICIPALITY REPORT GENERATOR */}
            <section
              style={{
                borderRadius: 18,
                padding: "22px 24px",
                background: "rgba(15, 23, 42, 0.86)",
                border: "1px solid rgba(16, 185, 129, 0.35)",
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
                <div>
                  <span
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 800,
                      color: "#34d399",
                      letterSpacing: "0.06em",
                    }}
                  >
                    MODULE 03 // 1-CLICK MUNICIPALITY REPORT GENERATOR
                  </span>
                  <h3
                    style={{
                      margin: "2px 0 0",
                      fontSize: "1.15rem",
                      fontWeight: 800,
                      color: "#f8fafc",
                    }}
                  >
                    📨 自治体通報・改善要望レポート自動生成
                  </h3>
                </div>

                {/* Format Mode Switcher */}
                <div style={{ display: "flex", gap: 6 }}>
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
                          reportFormatMode === mode.id ? "#6ee7b7" : "#cbd5e1",
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
                  maxHeight: 340,
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
                          <div style={{ fontSize: "0.73rem", color: "#94a3b8" }}>
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

              {/* Google Workspace GAS & Google Drive (5TB) Archive Dock */}
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
                  Google Drive (5TB) への現場写真・通報書アーカイブ保存、および地域安全台帳シート・カレンダー連携
                </span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <button
                    type="button"
                    onClick={handleDriveArchive}
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
                      ? "⏳ Google Drive (5TB) 保存中..."
                      : "☁️ Google Drive (5TB) にアーカイブ保存"}
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
                    gap: 4,
                  }}
                >
                  <div>
                    ☁️ <strong>Google Drive (5TB) アーカイブ完了</strong>{" "}
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
                      📁 保存先フォルダ: <code>{driveArchiveInfo.folder}</code>
                    </div>
                  )}
                  {driveArchiveInfo.url && (
                    <a
                      href={driveArchiveInfo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: "#38bdf8",
                        fontWeight: 700,
                        textDecoration: "none",
                      }}
                    >
                      🔗 Google Drive でアーカイブファイルを開く ↗
                    </a>
                  )}
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
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
