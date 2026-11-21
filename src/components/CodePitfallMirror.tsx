"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type {
  AuditResponse,
  ChecklistItem,
  DiagnosticIssue,
  PersonalMistake,
} from "@/app/api/codemistake/route";

const STORAGE_KEY = "codepitfall_personal_dna_v1";

const CATEGORY_META: Record<
  string,
  { label: string; color: string; bg: string; border: string }
> = {
  Async: {
    label: "Async (非同期)",
    color: "#38bdf8",
    bg: "rgba(56,189,248,0.16)",
    border: "rgba(56,189,248,0.45)",
  },
  API: {
    label: "API / 通信",
    color: "#818cf8",
    bg: "rgba(129,140,248,0.16)",
    border: "rgba(129,140,248,0.45)",
  },
  Logic: {
    label: "Logic (境界値・計算)",
    color: "#fb7185",
    bg: "rgba(251,113,133,0.16)",
    border: "rgba(251,113,133,0.45)",
  },
  Config: {
    label: "Config (環境変数)",
    color: "#fbbf24",
    bg: "rgba(251,191,36,0.16)",
    border: "rgba(251,191,36,0.45)",
  },
  Security: {
    label: "Security (認証・機密)",
    color: "#f43f5e",
    bg: "rgba(244,63,94,0.18)",
    border: "rgba(244,63,94,0.5)",
  },
  DB: {
    label: "DB / SQL",
    color: "#34d399",
    bg: "rgba(52,211,153,0.16)",
    border: "rgba(52,211,153,0.45)",
  },
  Env: {
    label: "Env (OS・文字コード)",
    color: "#c084fc",
    bg: "rgba(192,132,252,0.16)",
    border: "rgba(192,132,252,0.45)",
  },
};

const DEFAULT_HABITS: PersonalMistake[] = [
  {
    id: "h1",
    pattern: "fetch / 非同期処理の await 忘れ",
    category: "Async",
    severity: "high",
    hits: 7,
  },
  {
    id: "h2",
    pattern: "response.ok を確認せずに .json() してしまう",
    category: "API",
    severity: "high",
    hits: 5,
  },
  {
    id: "h3",
    pattern: "配列境界の <= .length（off-by-one）ミス",
    category: "Logic",
    severity: "high",
    hits: 4,
  },
  {
    id: "h4",
    pattern: "環境変数 (process.env) の未設定チェック漏れ",
    category: "Config",
    severity: "medium",
    hits: 3,
  },
  {
    id: "h5",
    pattern: "Windows / Linux パス区切り・UTF-8 エンコード漏れ",
    category: "Env",
    severity: "medium",
    hits: 2,
  },
  {
    id: "h6",
    pattern: "本番ログへの token / secret 出力＆署名未検証",
    category: "Security",
    severity: "high",
    hits: 3,
  },
];

export interface PresetConfig {
  id: string;
  badge: string;
  title: string;
  taskType: string;
  declaration: string;
  code: string;
}

// 4 Realistic Built-in Presets prominently selectable in 1 click
const FEATURED_PRESETS: PresetConfig[] = [
  {
    id: "preset-nextjs",
    badge: "プリセット1 • Next.js API",
    title: "注文送信 API（await 抜け＆境界値バグ）",
    taskType: "Next.js API / フォーム送信",
    declaration: "Next.js の注文フォーム送信 API とレスポンス集計処理を実装する",
    code: `async function submitOrder(payload: Record<string, unknown>) {
  const endpoint = process.env.NEXT_PUBLIC_ORDER_API;
  const res = fetch(endpoint + "/orders", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const data = res.json();
  for (let i = 0; i <= data.items.length; i++) {
    console.log(data.items[i].price);
  }
  return data;
}`,
  },
  {
    id: "preset-python",
    badge: "プリセット2 • Python ML",
    title: "推論スコア集計（JS構文混同＆ゼロ除算＆UTF-8漏れ）",
    taskType: "Python ML / データ処理",
    declaration: "Python で JSON ログを読み込み重み付き平均スコアを算出する",
    code: `import json

def load_scores(file_path: str, weights: list[float]):
    f = open(file_path)
    raw_text = f.read()
    parsed = JSON.parse(raw_text)
    total = 0.0
    for i in range(len(weights)):
        total += weights[i] * parsed["score"]
    return total / len(weights)`,
  },
  {
    id: "preset-db-sec",
    badge: "プリセット3 • DB & 認証",
    title: "ユーザー検索＆マイグレーション（SQLi＆NOT NULL事故）",
    taskType: "DB マイグレーション",
    declaration: "ユーザーテーブルに電話番号カラムを追加しID検索クエリを実装する",
    code: `async function migrateAndFindUser(db: any, userId: string) {
  const dbUrl = process.env.DATABASE_URL;
  await db.execute("ALTER TABLE users ADD COLUMN phone VARCHAR(20) NOT NULL");
  const query = \`SELECT * FROM users WHERE id = '\${userId}'\`;
  const res = fetch(dbUrl + "/audit", { method: "POST", body: query });
  return res.json();
}`,
  },
  {
    id: "preset-webhook",
    badge: "プリセット4 • 決済 Webhook",
    title: "Stripe 決済 Webhook（秘密鍵ハードコード＆消費税端数バグ）",
    taskType: "決済・外部Webhook",
    declaration: "Stripe Webhook を受け取り税込金額を計算して注文完了にする",
    code: `async function handlePaymentWebhook(rawBody: string, amount: number) {
  const stripeSecret = "example_hardcoded_payment_secret_0000";
  const payload = JSON.parse(rawBody);
  console.log("Webhook secret & token:", stripeSecret, payload.token);
  const taxIncluded = amount * 1.1;
  const res = fetch("https://api.example.com/charge", {
    method: "POST",
    body: JSON.stringify({ total: taxIncluded }),
  });
  return res.json();
}`,
  },
];

// Code templates for all 6 Task Types
const TASK_TEMPLATES_DATA: Record<
  string,
  { declaration: string; sampleCode: string; checklist: ChecklistItem[] }
> = {
  "Next.js API / フォーム送信": {
    declaration: "Next.js の注文フォーム送信 API とエラーハンドリングを実装する",
    sampleCode: FEATURED_PRESETS[0].code,
    checklist: [
      {
        id: "next-1",
        title: "fetch() と res.json() の両方に await を付けたか",
        why: "Promise のまま参照して TypeError になる非同期実装で最多の事故を防ぎます。",
        personalMatch: true,
      },
      {
        id: "next-2",
        title: "res.ok (HTTP 200-299) を確認してから .json() をパースしているか",
        why: "4xx/5xx エラー時に HTML エラーページを JSON パースしてクラッシュする事故を防ぎます。",
        personalMatch: true,
      },
      {
        id: "next-3",
        title: "送信ボタンの二重クリック防止（disabled={loading}）を入れたか",
        why: "通信遅延時の連打による二重注文・DB重複レコード登録を防ぎます。",
        personalMatch: false,
      },
      {
        id: "next-4",
        title: "NEXT_PUBLIC_ とサーバー専用環境変数を取り違えていないか",
        why: "クライアントバンドルへの API シークレット漏洩と undefined 参照を防ぎます。",
        personalMatch: true,
      },
      {
        id: "next-5",
        title: "リクエスト Body のスキーマ検証（空文字・境界値ガード）を行ったか",
        why: "不正ペイロードによる API Route の 500 クラッシュを防ぎます。",
        personalMatch: true,
      },
    ],
  },
  "Python ML / データ処理": {
    declaration: "Python で学習データの前処理と推論スコア集計バッチを実装する",
    sampleCode: FEATURED_PRESETS[1].code,
    checklist: [
      {
        id: "py-1",
        title: "train / test 分割前に全体へ fit_transform（データリーク）していないか",
        why: "検証スコアだけ異常に高く、本番推論で精度が崩壊する典型ミスを防ぎます。",
        personalMatch: false,
      },
      {
        id: "py-2",
        title: "Windows / Linux パス区切り（pathlib.Path）と encoding='utf-8' を明示したか",
        why: "OS移行時の FileNotFoundError や cp932 UnicodeDecodeError を防ぎます。",
        personalMatch: true,
      },
      {
        id: "py-3",
        title: "空リスト・欠損値（NaN/None）混入時のゼロ除算ガードを入れたか",
        why: "バッチ推論や集計パイプラインの途中停止（ZeroDivisionError）を防ぎます。",
        personalMatch: true,
      },
      {
        id: "py-4",
        title: "JavaScript の構文（JSON.parse / .length）と Python（json.loads / len()）を混同していないか",
        why: "フルスタック開発者が言語切り替え直後に起こす NameError を防ぎます。",
        personalMatch: false,
      },
      {
        id: "py-5",
        title: "乱数シード（random_state / seed）と推論時の eval() モード固定を確認したか",
        why: "実験の再現性欠如や Dropout 有効のまま本番推論する事故を防ぎます。",
        personalMatch: false,
      },
    ],
  },
  "DB マイグレーション": {
    declaration: "本番 DB のテーブルへ新規カラム追加マイグレーションと検索クエリを実装する",
    sampleCode: FEATURED_PRESETS[2].code,
    checklist: [
      {
        id: "db-1",
        title: "既存データがあるテーブルに DEFAULT なしの NOT NULL カラムを追加していないか",
        why: "本番デプロイ時のマイグレーション即死・テーブルロック事故を防ぎます。",
        personalMatch: false,
      },
      {
        id: "db-2",
        title: "SQL 文字列結合ではなくプレースホルダ（パラメータバインド）を使っているか",
        why: "SQL インジェクション脆弱性と特殊文字による構文エラーを根絶します。",
        personalMatch: false,
      },
      {
        id: "db-3",
        title: "複数テーブル更新をトランザクション（BEGIN / COMMIT / ROLLBACK）で囲んだか",
        why: "途中失敗時のデータ不整合（片方だけ更新される事故）を防ぎます。",
        personalMatch: false,
      },
      {
        id: "db-4",
        title: "WHERE 句や JOIN で頻繁に使う外部キー・日時カラムに INDEX を貼ったか",
        why: "レコード増加後のフルテーブルスキャンと DB CPU 100% 張り付きを防ぎます。",
        personalMatch: false,
      },
      {
        id: "db-5",
        title: "ロールバック用 Down スクリプトと事前スナップショット取得を確認したか",
        why: "万一のスキーマ障害時に数分以内で安全に切り戻せます。",
        personalMatch: false,
      },
    ],
  },
  "認証・セキュリティ実装": {
    declaration: "JWT セッション認証ミドルウェアと権限チェック処理を実装する",
    sampleCode: `async function verifyUserSession(req: Request) {
  const jwtSecret = "super_secret_jwt_signing_key_2026";
  const authHeader = req.headers.get("authorization");
  console.log("Incoming auth token & secret:", authHeader, jwtSecret);
  const profileRes = fetch(process.env.AUTH_SERVICE_URL + "/verify", {
    method: "POST",
    body: JSON.stringify({ token: authHeader }),
  });
  return profileRes.json();
}`,
    checklist: [
      {
        id: "sec-1",
        title: "API キー・JWT シークレットをハードコードせず環境変数から読み込んでいるか",
        why: "GitHub 公開リポジトリへのクレデンシャル漏洩事故を防ぎます。",
        personalMatch: true,
      },
      {
        id: "sec-2",
        title: "認証トークンやパスワード平文を console.log に出力していないか",
        why: "サーバーログ監視ツールからの個人情報・セッションハイジャック漏洩を防ぎます。",
        personalMatch: true,
      },
      {
        id: "sec-3",
        title: "セッション Cookie に HttpOnly / Secure / SameSite 属性を設定したか",
        why: "XSS によるトークン窃取や CSRF 攻撃を防ぎます。",
        personalMatch: false,
      },
      {
        id: "sec-4",
        title: "認可チェック（ログインユーザー自身のデータか）を API 側で検証しているか",
        why: "ID を書き換えるだけで他人のデータを閲覧・更新できる IDOR 脆弱性を防ぎます。",
        personalMatch: false,
      },
      {
        id: "sec-5",
        title: "タイミング攻撃を防ぐ定数時間比較（crypto.timingSafeEqual）やレート制限を入れたか",
        why: "ブルートフォース攻撃や署名検証の推測攻撃を防ぎます。",
        personalMatch: false,
      },
    ],
  },
  "決済・外部Webhook": {
    declaration: "Stripe 決済完了 Webhook の署名検証と税込金額の決済記録を実装する",
    sampleCode: FEATURED_PRESETS[3].code,
    checklist: [
      {
        id: "pay-1",
        title: "Webhook 受信時に署名ヘッダー（stripe-signature 等）を生ボディで検証しているか",
        why: "第三者からの偽装決済完了リクエストによるタダ乗り被害を防ぎます。",
        personalMatch: true,
      },
      {
        id: "pay-2",
        title: "べき等キー（Idempotency Key / イベントID重複チェック）を実装したか",
        why: "Webhook の再送（リトライ）による二重課金・二重ポイント付与を防ぎます。",
        personalMatch: false,
      },
      {
        id: "pay-3",
        title: "金額計算で浮動小数点誤差（amount * 1.1）を放置せず整数（Math.round）で扱っているか",
        why: "1円単位の端数ズレや決済 API の整数バリデーションエラーを防ぎます。",
        personalMatch: true,
      },
      {
        id: "pay-4",
        title: "外部決済 API 呼び出しに await とエラー時のステータス記録を入れたか",
        why: "通信切断時に決済成功・DB未反映となる宙吊り状態を防ぎます。",
        personalMatch: true,
      },
      {
        id: "pay-5",
        title: "テスト用キー（sk_test_）と本番キー（sk_live_）の環境分離を確認したか",
        why: "ステージング環境で実カード決済が走る重大インシデントを防ぎます。",
        personalMatch: true,
      },
    ],
  },
  "本番リリース前チェック": {
    declaration: "本番デプロイ直前の環境変数・デバッグログ残存・例外処理の最終監査を行う",
    sampleCode: `async function releaseHealthCheck(items: Array<{ id: string; price: number }>) {
  const apiUrl = process.env.PROD_API_ENDPOINT;
  const apiKey = "prod_live_secret_token_99999";
  console.log("Production API key debug:", apiKey);
  const res = fetch(apiUrl + "/health");
  const status = res.json();
  for (let i = 0; i <= items.length; i++) {
    console.log("Checking item:", items[i].id, items[i].price * 1.1);
  }
  return status;
}`,
    checklist: [
      {
        id: "rel-1",
        title: "デバッグ用の console.log（特に secret/token）や debugger が残っていないか",
        why: "本番コンソールへの機密情報露出やブレークポイント停止を防ぎます。",
        personalMatch: true,
      },
      {
        id: "rel-2",
        title: "本番環境の必須環境変数（process.env）がすべてデプロイ先に登録済みか",
        why: "リリース直後の画面真っ白・500 Internal Server Error を防ぎます。",
        personalMatch: true,
      },
      {
        id: "rel-3",
        title: "非同期エラー（await 漏れ・res.ok 未確認）で画面全体が落ちないか",
        why: "一部の API 失敗でアプリ全体が操作不能になるのを防ぎます。",
        personalMatch: true,
      },
      {
        id: "rel-4",
        title: "配列境界（<= .length）や金額端数計算（* 1.1）のバグがないか",
        why: "本番データ量でのみ顕在化するランタイム例外を防ぎます。",
        personalMatch: true,
      },
      {
        id: "rel-5",
        title: "型チェック（npx tsc --noEmit）と本番ビルド検証をクリアしたか",
        why: "型不整合や未定義参照によるランタイム障害をゼロにします。",
        personalMatch: false,
      },
    ],
  },
};

const SAMPLE_GITHUB_URLS = [
  {
    label: "Next.js Example (users.ts)",
    url: "https://github.com/vercel/next.js/blob/canary/examples/api-routes-rest/pages/api/users.ts",
  },
  {
    label: "TypeScript Utility Sample",
    url: "https://raw.githubusercontent.com/microsoft/TypeScript-Node-Starter/master/src/util/secrets.ts",
  },
];

interface DiffRow {
  beforeLineNum: number | null;
  afterLineNum: number | null;
  beforeText: string;
  afterText: string;
  status: "unchanged" | "modified" | "added" | "removed";
}

function buildSideBySideDiff(beforeCode: string, afterCode: string): DiffRow[] {
  const beforeLines = beforeCode.split("\n");
  const afterLines = afterCode.split("\n");
  const rows: DiffRow[] = [];

  let bIdx = 0;
  let aIdx = 0;

  while (bIdx < beforeLines.length || aIdx < afterLines.length) {
    const bLine = bIdx < beforeLines.length ? beforeLines[bIdx] : null;
    const aLine = aIdx < afterLines.length ? afterLines[aIdx] : null;

    if (bLine !== null && aLine !== null && bLine === aLine) {
      rows.push({
        beforeLineNum: bIdx + 1,
        afterLineNum: aIdx + 1,
        beforeText: bLine,
        afterText: aLine,
        status: "unchanged",
      });
      bIdx++;
      aIdx++;
    } else if (
      bLine !== null &&
      aIdx + 1 < afterLines.length &&
      afterLines[aIdx + 1] === bLine
    ) {
      rows.push({
        beforeLineNum: null,
        afterLineNum: aIdx + 1,
        beforeText: "",
        afterText: afterLines[aIdx],
        status: "added",
      });
      aIdx++;
    } else if (
      bLine !== null &&
      bIdx + 1 < beforeLines.length &&
      aIdx + 1 < afterLines.length &&
      beforeLines[bIdx + 1] === afterLines[aIdx + 1]
    ) {
      rows.push({
        beforeLineNum: bIdx + 1,
        afterLineNum: aIdx + 1,
        beforeText: bLine,
        afterText: aLine ?? "",
        status: "modified",
      });
      bIdx++;
      aIdx++;
    } else if (
      bLine !== null &&
      bIdx + 1 < beforeLines.length &&
      aIdx + 2 < afterLines.length &&
      beforeLines[bIdx + 1] === afterLines[aIdx + 2]
    ) {
      rows.push({
        beforeLineNum: bIdx + 1,
        afterLineNum: aIdx + 1,
        beforeText: bLine,
        afterText: afterLines[aIdx],
        status: "modified",
      });
      rows.push({
        beforeLineNum: null,
        afterLineNum: aIdx + 2,
        beforeText: "",
        afterText: afterLines[aIdx + 1],
        status: "added",
      });
      bIdx++;
      aIdx += 2;
    } else if (bLine !== null && aLine !== null) {
      rows.push({
        beforeLineNum: bIdx + 1,
        afterLineNum: aIdx + 1,
        beforeText: bLine,
        afterText: aLine,
        status: "modified",
      });
      bIdx++;
      aIdx++;
    } else if (bLine !== null) {
      rows.push({
        beforeLineNum: bIdx + 1,
        afterLineNum: null,
        beforeText: bLine,
        afterText: "",
        status: "removed",
      });
      bIdx++;
    } else if (aLine !== null) {
      rows.push({
        beforeLineNum: null,
        afterLineNum: aIdx + 1,
        beforeText: "",
        afterText: aLine,
        status: "added",
      });
      aIdx++;
    }
  }

  return rows;
}

function previewRawGitHubUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed);
    if (u.hostname === "raw.githubusercontent.com") return trimmed;
    if (u.hostname === "github.com" || u.hostname === "www.github.com") {
      const parts = u.pathname.split("/").filter(Boolean);
      if (parts.length >= 5 && (parts[2] === "blob" || parts[2] === "raw")) {
        return `https://raw.githubusercontent.com/${parts[0]}/${parts[1]}/${parts[3]}/${parts.slice(4).join("/")}`;
      }
    }
  } catch {
    return null;
  }
  return null;
}

function detectTaskFromVoiceText(text: string): string | null {
  if (/Python|ML|機械学習|データ|学習|pandas|推論/i.test(text)) {
    return "Python ML / データ処理";
  }
  if (/DB|データベース|SQL|マイグレーション|テーブル|カラム/i.test(text)) {
    return "DB マイグレーション";
  }
  if (/認証|セキュリティ|ログイン|JWT|パスワード|権限|セッション/i.test(text)) {
    return "認証・セキュリティ実装";
  }
  if (/決済|Stripe|Webhook|課金|支払い|注文完了/i.test(text)) {
    return "決済・外部Webhook";
  }
  if (/リリース|本番|デプロイ|最終確認|出荷/i.test(text)) {
    return "本番リリース前チェック";
  }
  if (/Next|API|フォーム|送信|fetch|フロント/i.test(text)) {
    return "Next.js API / フォーム送信";
  }
  return null;
}

export default function CodePitfallMirror() {
  const [activeTab, setActiveTab] = useState<"basic" | "dna" | "github_voice">(
    "basic"
  );

  const [habits, setHabits] = useState<PersonalMistake[]>(DEFAULT_HABITS);
  const [newHabitText, setNewHabitText] = useState("");
  const [newHabitCategory, setNewHabitCategory] = useState("Async");

  const [taskType, setTaskType] = useState<string>("Next.js API / フォーム送信");
  const [taskDeclaration, setTaskDeclaration] = useState<string>(
    TASK_TEMPLATES_DATA["Next.js API / フォーム送信"].declaration
  );
  const [isListening, setIsListening] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<string>("");

  const [githubUrl, setGithubUrl] = useState("");
  const [githubLoading, setGithubLoading] = useState(false);
  const [githubStatus, setGithubStatus] = useState<{
    type: "info" | "error" | "success";
    message: string;
    rawUrl?: string;
  } | null>(null);

  const [code, setCode] = useState<string>(FEATURED_PRESETS[0].code);
  const [activePresetId, setActivePresetId] = useState<string>(
    FEATURED_PRESETS[0].id
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AuditResponse | null>(null);
  const [checkedIds, setCheckedIds] = useState<Record<string, boolean>>({});

  const [diffMode, setDiffMode] = useState<"split" | "unified">("split");
  const [copiedPatch, setCopiedPatch] = useState(false);
  const [copiedPrMd, setCopiedPrMd] = useState(false);
  const [learnedTitles, setLearnedTitles] = useState<Record<string, boolean>>(
    {}
  );
  const [dnaStatusMsg, setDnaStatusMsg] = useState<string>("");
  const [localSaveBanner, setLocalSaveBanner] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load Personal Mistake DNA from localStorage on mount & run initial audit
  useEffect(() => {
    let initialHabits = DEFAULT_HABITS;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          initialHabits = parsed;
          setHabits(parsed);
        }
      }
    } catch {
      // Ignore storage errors
    }
    void runAuditWithParams(
      FEATURED_PRESETS[0].code,
      "Next.js API / フォーム送信",
      initialHabits,
      TASK_TEMPLATES_DATA["Next.js API / フォーム送信"].declaration,
      false
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persistHabits = (next: PersonalMistake[]) => {
    setHabits(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage errors
    }
  };

  // DNA Category Analytics calculation
  const dnaAnalytics = useMemo(() => {
    const totalsByCat: Record<string, { count: number; hits: number }> = {};
    let totalHits = 0;
    habits.forEach((h) => {
      const cat = CATEGORY_META[h.category] ? h.category : "Logic";
      if (!totalsByCat[cat]) {
        totalsByCat[cat] = { count: 0, hits: 0 };
      }
      totalsByCat[cat].count += 1;
      totalsByCat[cat].hits += Math.max(1, h.hits);
      totalHits += Math.max(1, h.hits);
    });

    const breakdown = Object.entries(totalsByCat)
      .map(([cat, stats]) => ({
        category: cat,
        meta: CATEGORY_META[cat] ?? CATEGORY_META.Logic,
        count: stats.count,
        hits: stats.hits,
        percent: totalHits > 0 ? Math.round((stats.hits / totalHits) * 100) : 0,
      }))
      .sort((a, b) => b.hits - a.hits);

    const topHabit = [...habits].sort((a, b) => b.hits - a.hits)[0] ?? null;

    return { totalHits, breakdown, topHabit };
  }, [habits]);

  const handleAddHabit = () => {
    const trimmed = newHabitText.trim();
    if (!trimmed) return;
    const next: PersonalMistake[] = [
      {
        id: `h-${Date.now()}`,
        pattern: trimmed,
        category: newHabitCategory,
        severity: "high",
        hits: 1,
      },
      ...habits,
    ];
    persistHabits(next);
    setNewHabitText("");
    setDnaStatusMsg(`✓「${trimmed}」をあなたのミスDNAに記憶しました`);
    setTimeout(() => setDnaStatusMsg(""), 2500);
  };

  const handleDeleteHabit = (id: string) => {
    persistHabits(habits.filter((h) => h.id !== id));
  };

  // 1-Click Learn on any AI Diagnostic card
  const handleLearnDiagnostic = (diag: DiagnosticIssue) => {
    const patternKey = diag.title;
    const category =
      diag.category && CATEGORY_META[diag.category] ? diag.category : "Logic";

    const existingIdx = habits.findIndex(
      (h) =>
        h.pattern.toLowerCase() === patternKey.toLowerCase() ||
        (diag.matchedPersonalHabit &&
          h.pattern === diag.matchedPersonalHabit)
    );

    let next: PersonalMistake[];
    if (existingIdx >= 0) {
      next = habits.map((h, i) =>
        i === existingIdx ? { ...h, hits: h.hits + 1 } : h
      );
    } else {
      next = [
        {
          id: `dna-${Date.now()}`,
          pattern: patternKey,
          category,
          severity: diag.severity,
          hits: 1,
        },
        ...habits,
      ];
    }

    persistHabits(next);
    setLearnedTitles((prev) => ({
      ...prev,
      [`${diag.line}-${diag.title}`]: true,
    }));
    setDnaStatusMsg(`🧬「${patternKey}」を自分のDNAに記憶しました！`);
    setTimeout(() => setDnaStatusMsg(""), 3000);
  };

  // Save Git-friendly DNA file (.codepitfall.json) directly to PC / SSD
  const handleSaveGitDnaFile = () => {
    const payload = {
      $schema: "https://codepitfall.local/schema/v1.json",
      app: "CodePitfall Mirror",
      exportedAt: new Date().toISOString(),
      totalPatterns: habits.length,
      totalHits: dnaAnalytics.totalHits,
      habits,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = ".codepitfall.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setDnaStatusMsg("📂 Git 用 DNA ファイル (.codepitfall.json) を PC に保存しました");
    setLocalSaveBanner(
      "📂 Git リポジトリにコミット可能な「.codepitfall.json」を PC（ローカル SSD）に保存しました！"
    );
    setTimeout(() => setDnaStatusMsg(""), 3000);
  };

  // Import Personal DNA from JSON file
  const handleImportDnaJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const raw = String(reader.result ?? "");
        const parsed = JSON.parse(raw);
        const list: PersonalMistake[] = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed?.habits)
            ? parsed.habits
            : [];
        const valid = list
          .filter(
            (item) =>
              item &&
              typeof item.pattern === "string" &&
              item.pattern.trim().length > 0
          )
          .map((item, idx) => ({
            id: item.id || `imp-${Date.now()}-${idx}`,
            pattern: item.pattern.trim(),
            category:
              item.category && CATEGORY_META[item.category]
                ? item.category
                : "Logic",
            severity:
              item.severity === "high" ||
              item.severity === "medium" ||
              item.severity === "low"
                ? item.severity
                : ("high" as const),
            hits:
              typeof item.hits === "number" && item.hits > 0 ? item.hits : 1,
          }));

        if (valid.length === 0) {
          setDnaStatusMsg("⚠️ 有効なミスDNAデータが見つかりませんでした");
          return;
        }
        persistHabits(valid);
        setDnaStatusMsg(`📤 ${valid.length}件のミスDNAをインポートしました`);
        setTimeout(() => setDnaStatusMsg(""), 3000);
      } catch {
        setDnaStatusMsg("⚠️ JSON ファイルの解析に失敗しました");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleResetDna = () => {
    persistHabits(DEFAULT_HABITS);
    setLearnedTitles({});
    setDnaStatusMsg("↺ デフォルトのミスDNAにリセットしました");
    setTimeout(() => setDnaStatusMsg(""), 2200);
  };

  // Voice Task Declaration via Web Speech API (ja-JP)
  const handleVoiceDeclaration = () => {
    if (typeof window === "undefined") return;
    const SpeechRec =
      (window as unknown as { SpeechRecognition?: new () => unknown })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => unknown })
        .webkitSpeechRecognition;

    if (!SpeechRec) {
      const demoSamples = [
        "Stripe決済Webhookの署名検証と税込金額の計算処理を実装する",
        "Pythonで学習データのJSONログを読み込み平均スコアを計算する",
        "本番リリース前に環境変数とデバッグログの残存をチェックする",
      ];
      const chosen =
        demoSamples[Math.floor(Math.random() * demoSamples.length)];
      setTaskDeclaration(chosen);
      const matchedTask = detectTaskFromVoiceText(chosen);
      if (matchedTask) {
        setTaskType(matchedTask);
      }
      setVoiceStatus(
        `🎤 音声シミュレーション入力完了:「${chosen}」${matchedTask ? ` → テンプレート「${matchedTask}」を自動選択` : ""}`
      );
      return;
    }

    try {
      const recognition = new SpeechRec() as {
        lang: string;
        interimResults: boolean;
        maxAlternatives: number;
        onstart: (() => void) | null;
        onresult:
          | ((event: {
              results: ArrayLike<ArrayLike<{ transcript: string }>>;
            }) => void)
          | null;
        onerror: (() => void) | null;
        onend: (() => void) | null;
        start: () => void;
      };
      recognition.lang = "ja-JP";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setVoiceStatus(
          "🎙️ 聞き取り中...「今からやる作業」を話してください（日本語）"
        );
      };

      recognition.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript ?? "";
        if (transcript) {
          setTaskDeclaration(transcript);
          const matched = detectTaskFromVoiceText(transcript);
          if (matched) {
            setTaskType(matched);
            setVoiceStatus(
              `✓ 音声認識完了:「${transcript}」→「${matched}」テンプレートに自動切替しました`
            );
          } else {
            setVoiceStatus(`✓ 音声認識完了:「${transcript}」`);
          }
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
        const fallback =
          "Stripe Webhookの署名検証と注文データベース更新を実装する";
        setTaskDeclaration(fallback);
        setTaskType("決済・外部Webhook");
        setVoiceStatus(
          `🎤 マイク未接続のためサンプル音声宣言を適用:「${fallback}」`
        );
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  // GitHub Raw / File URL Fetcher
  const handleFetchGitHub = async (overrideUrl?: string) => {
    const targetUrl = (overrideUrl ?? githubUrl).trim();
    if (!targetUrl) return;
    if (overrideUrl) setGithubUrl(overrideUrl);

    setGithubLoading(true);
    setGithubStatus({
      type: "info",
      message: "GitHub Raw URL に変換してコードを取得しています...",
    });

    try {
      const res = await fetch("/api/codemistake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "fetch-github", githubUrl: targetUrl }),
      });
      const data = await res.json();
      if (!res.ok || !data.code) {
        setGithubStatus({
          type: "error",
          message:
            data.error ||
            "GitHub ファイルの取得に失敗しました。公開リポジトリの blob/raw URL を確認してください。",
          rawUrl: data.rawUrl,
        });
        return;
      }

      setCode(data.code);
      setActivePresetId("");
      setGithubStatus({
        type: "success",
        message: `✓ ${data.fileName} (${data.lineCount}行) を取得し、下のワークスペースでチェックを実行しました！`,
        rawUrl: data.rawUrl,
      });

      await runAuditWithParams(
        data.code,
        taskType,
        habits,
        taskDeclaration,
        true
      );
    } catch {
      setGithubStatus({
        type: "error",
        message: "GitHub URL 取得中に通信エラーが発生しました。",
      });
    } finally {
      setGithubLoading(false);
    }
  };

  const handleSelectPreset = (preset: PresetConfig) => {
    setActivePresetId(preset.id);
    setTaskType(preset.taskType);
    setTaskDeclaration(preset.declaration);
    setCode(preset.code);
    setCheckedIds({});
    void runAuditWithParams(
      preset.code,
      preset.taskType,
      habits,
      preset.declaration,
      false
    );
  };

  const handleSelectTaskTemplate = (nextTask: string) => {
    setTaskType(nextTask);
    const tpl = TASK_TEMPLATES_DATA[nextTask];
    if (tpl) {
      setTaskDeclaration(tpl.declaration);
      setCode(tpl.sampleCode);
      setCheckedIds({});
      const matchingPreset = FEATURED_PRESETS.find(
        (p) => p.taskType === nextTask
      );
      setActivePresetId(matchingPreset?.id ?? "");
      void runAuditWithParams(
        tpl.sampleCode,
        nextTask,
        habits,
        tpl.declaration,
        false
      );
    }
  };

  const runAuditWithParams = async (
    targetCode: string,
    targetTask: string,
    currentHabits: PersonalMistake[],
    currentDeclaration: string,
    incrementHits = true
  ) => {
    setLoading(true);
    setCopiedPatch(false);
    setCopiedPrMd(false);
    try {
      const res = await fetch("/api/codemistake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: targetCode,
          taskType: targetTask,
          taskDeclaration: currentDeclaration,
          habits: currentHabits,
        }),
      });
      if (!res.ok) throw new Error("Audit failed");
      const data: AuditResponse = await res.json();
      setResult(data);

      if (incrementHits) {
        const matchedTexts = new Set(
          data.diagnostics
            .map((d) => d.matchedPersonalHabit)
            .filter((x): x is string => Boolean(x))
        );
        if (matchedTexts.size > 0) {
          persistHabits(
            currentHabits.map((h) =>
              matchedTexts.has(h.pattern) ? { ...h, hits: h.hits + 1 } : h
            )
          );
        }
      }
    } catch {
      // Fallback handled on server
    } finally {
      setLoading(false);
    }
  };

  const handleAudit = () => {
    void runAuditWithParams(code, taskType, habits, taskDeclaration, true);
  };

  const handleCopyFixedPatch = async () => {
    if (!result?.fixedCode) return;
    await navigator.clipboard.writeText(result.fixedCode);
    setCopiedPatch(true);
    setTimeout(() => setCopiedPatch(false), 2000);
  };

  const handleApplyFixToEditor = () => {
    if (!result?.fixedCode) return;
    setCode(result.fixedCode);
    void runAuditWithParams(
      result.fixedCode,
      taskType,
      habits,
      taskDeclaration,
      false
    );
  };

  // Active checklist (from audit result or current task template)
  const activeChecklist: ChecklistItem[] = useMemo(() => {
    if (result?.preflightChecklist && result.preflightChecklist.length > 0) {
      return result.preflightChecklist;
    }
    return (
      TASK_TEMPLATES_DATA[taskType]?.checklist ??
      TASK_TEMPLATES_DATA["Next.js API / フォーム送信"].checklist
    );
  }, [result, taskType]);

  const completedCount = useMemo(
    () => activeChecklist.filter((item) => Boolean(checkedIds[item.id])).length,
    [activeChecklist, checkedIds]
  );
  const progressPercent =
    activeChecklist.length > 0
      ? Math.round((completedCount / activeChecklist.length) * 100)
      : 0;

  // Generate PR Review Markdown string
  const buildPrMarkdownString = () => {
    if (!result) return "";
    const diagLines = result.diagnostics
      .map(
        (d) =>
          `- **Line ${d.line} [${d.severity.toUpperCase()} / ${d.category || "Logic"}] ${d.title}**${
            d.matchedPersonalHabit
              ? ` *(🧬 過去ミスDNA一致: \`${d.matchedPersonalHabit}\`)*`
              : ""
          }\n  - 理由: ${d.reason}\n  - 修正案: \`${d.fixSuggestion.replace(/\n/g, " ")}\``
      )
      .join("\n");

    const checkLines = activeChecklist
      .map(
        (c) =>
          `- [${checkedIds[c.id] ? "x" : " "}] **${c.title}**${
            c.personalMatch ? " *(⚠️ あなたの要注意クセ)*" : ""
          } — ${c.why}`
      )
      .join("\n");

    return [
      `## 🛡️ CodePitfall Mirror — コードチェック＆修正レポート`,
      `- **対象作業**: ${taskType}`,
      `- **作業メモ**: ${taskDeclaration}`,
      `- **危険度スコア**: **${result.riskScore} / 100** (Engine: \`${result.source}\`)`,
      `- **サマリー**: ${result.summary}`,
      ``,
      `### 🔍 見つかった赤い行・注意点 (${result.diagnostics.length}件)`,
      diagLines || "- 指摘事項はありません（安全です）",
      ``,
      `### 🔧 修正後コードパッチ (After)`,
      "```ts",
      result.fixedCode,
      "```",
      ``,
      `### ✅ 作業別「よくある間違い」チェックリスト (${completedCount}/${activeChecklist.length} 完了 - ${progressPercent}%)`,
      checkLines,
    ].join("\n");
  };

  const handleCopyPrMarkdown = async () => {
    const md = buildPrMarkdownString();
    if (!md) return;
    await navigator.clipboard.writeText(md);
    setCopiedPrMd(true);
    setTimeout(() => setCopiedPrMd(false), 2200);
  };

  // Save Markdown report directly to user's PC / SSD (.md)
  const handleSaveReportMarkdown = () => {
    const md = buildPrMarkdownString();
    if (!md) return;
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `codepitfall-report-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setLocalSaveBanner(
      "💾 チェック結果レポート (.md) を PC（ローカル SSD）に保存しました！Git の PR コメントやドキュメントにそのまま使えます。"
    );
  };

  // Side-by-Side Diff computation
  const diffRows = useMemo(() => {
    if (!result?.fixedCode) return [];
    return buildSideBySideDiff(code, result.fixedCode);
  }, [code, result?.fixedCode]);

  const diffStats = useMemo(() => {
    let modified = 0;
    let added = 0;
    let removed = 0;
    diffRows.forEach((r) => {
      if (r.status === "modified") modified++;
      if (r.status === "added") added++;
      if (r.status === "removed") removed++;
    });
    return { modified, added, removed };
  }, [diffRows]);

  const convertedRawPreview = useMemo(
    () => previewRawGitHubUrl(githubUrl),
    [githubUrl]
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 12% 10%, #1e1b4b 0%, #090d16 45%, #020617 100%)",
        color: "#f8fafc",
        padding: "20px 16px 56px",
        fontFamily:
          'Inter, "Noto Sans JP", ui-sans-serif, system-ui, -apple-system, sans-serif',
      }}
    >
      <div style={{ maxWidth: 1320, margin: "0 auto" }}>
        {/* Top Hero Header */}
        <header
          style={{
            background: "rgba(15, 23, 42, 0.88)",
            border: "1px solid rgba(99, 102, 241, 0.35)",
            borderRadius: 16,
            padding: "18px 22px",
            marginBottom: 16,
            boxShadow: "0 12px 32px -8px rgba(0, 0, 0, 0.6)",
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 14,
            }}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#a5b4fc",
                    background: "rgba(99, 102, 241, 0.16)",
                    border: "1px solid rgba(99, 102, 241, 0.45)",
                    padding: "4px 12px",
                    borderRadius: 999,
                  }}
                >
                  ✦ はたらく・まなぶ部門 Flagship
                </span>
                <Link
                  href="/gitbridge"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#6ee7b7",
                    background: "rgba(16, 185, 129, 0.15)",
                    border: "1px solid rgba(52, 211, 153, 0.45)",
                    padding: "4px 12px",
                    borderRadius: 999,
                    textDecoration: "none",
                  }}
                >
                  🌱 GitHub が初めての方へ：リポジトリ作成〜PR手順（GitBridge を開く）
                </Link>
              </div>

              <h1
                style={{
                  margin: 0,
                  fontSize: 26,
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                  background:
                    "linear-gradient(90deg, #ffffff 0%, #a5b4fc 55%, #38bdf8 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                CodePitfall Mirror — 自分のクセで学ぶコード事前チェッカー
              </h1>
              <p
                style={{
                  margin: "6px 0 0",
                  color: "#cbd5e1",
                  fontSize: 13.5,
                  lineHeight: 1.5,
                }}
              >
                コードを貼ってボタンを押すだけ！あなたがつまずきやすい箇所（赤い行）と安全な修正コード（緑の行）をひと目で比較できます。
              </p>
            </div>

            {/* Universal Free Local SSD & Git Download Buttons */}
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <button
                type="button"
                onClick={handleSaveReportMarkdown}
                style={{
                  background:
                    "linear-gradient(135deg, rgba(16, 185, 129, 0.24), rgba(14, 165, 233, 0.24))",
                  color: "#6ee7b7",
                  border: "1px solid rgba(52, 211, 153, 0.5)",
                  borderRadius: 10,
                  padding: "9px 14px",
                  fontSize: 12.5,
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                💾 PC にレポート保存 (.md)
              </button>
              <button
                type="button"
                onClick={handleSaveGitDnaFile}
                style={{
                  background: "rgba(99, 102, 241, 0.2)",
                  color: "#c7d2fe",
                  border: "1px solid rgba(129, 140, 248, 0.5)",
                  borderRadius: 10,
                  padding: "9px 14px",
                  fontSize: 12.5,
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                📂 Git 用 DNA ファイル保存 (.codepitfall.json)
              </button>
            </div>
          </div>

          {localSaveBanner && (
            <div
              style={{
                marginTop: 12,
                padding: "9px 14px",
                borderRadius: 10,
                background: "rgba(16, 185, 129, 0.14)",
                border: "1px solid rgba(52, 211, 153, 0.45)",
                color: "#6ee7b7",
                fontSize: 12.5,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span>{localSaveBanner}</span>
              <button
                type="button"
                onClick={() => setLocalSaveBanner("")}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#6ee7b7",
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                ✕
              </button>
            </div>
          )}

          {/* Clean 3-Step Quick Guide */}
          <div
            style={{
              marginTop: 14,
              padding: "12px 16px",
              borderRadius: 12,
              background: "rgba(2, 6, 23, 0.75)",
              border: "1px solid rgba(56, 189, 248, 0.3)",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 10,
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{
                  background: "#4f46e5",
                  color: "#fff",
                  fontWeight: 800,
                  fontSize: 12,
                  padding: "3px 9px",
                  borderRadius: 999,
                  flexShrink: 0,
                }}
              >
                STEP 1
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#f8fafc" }}>
                ① プリセットを選ぶかコードを貼る
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{
                  background: "#0284c7",
                  color: "#fff",
                  fontWeight: 800,
                  fontSize: 12,
                  padding: "3px 9px",
                  borderRadius: 999,
                  flexShrink: 0,
                }}
              >
                STEP 2
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#f8fafc" }}>
                ② 「コードをチェック」を押す
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{
                  background: "#059669",
                  color: "#fff",
                  fontWeight: 800,
                  fontSize: 12,
                  padding: "3px 9px",
                  borderRadius: 999,
                  flexShrink: 0,
                }}
              >
                STEP 3
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#f8fafc" }}>
                ③ 赤い行と修正案・作業テンプレを確認
              </span>
            </div>
          </div>

          {/* Clean Mode / Power-User Tabs Bar */}
          <div
            style={{
              marginTop: 14,
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <button
                type="button"
                onClick={() => setActiveTab("basic")}
                style={{
                  padding: "8px 16px",
                  borderRadius: 10,
                  border:
                    activeTab === "basic"
                      ? "1px solid #38bdf8"
                      : "1px solid #334155",
                  background:
                    activeTab === "basic"
                      ? "linear-gradient(135deg, rgba(14,165,233,0.28), rgba(79,70,229,0.28))"
                      : "#0f172a",
                  color: activeTab === "basic" ? "#fff" : "#cbd5e1",
                  fontSize: 12.5,
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                ⚡ 基本チェック（シンプル画面）
              </button>
              <button
                type="button"
                onClick={() =>
                  setActiveTab((prev) => (prev === "dna" ? "basic" : "dna"))
                }
                style={{
                  padding: "8px 16px",
                  borderRadius: 10,
                  border:
                    activeTab === "dna"
                      ? "1px solid #a5b4fc"
                      : "1px solid #334155",
                  background:
                    activeTab === "dna"
                      ? "rgba(99, 102, 241, 0.25)"
                      : "#0f172a",
                  color: activeTab === "dna" ? "#fff" : "#cbd5e1",
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                🧬 やりがちミスDNA管理 ({habits.length}件)
              </button>
              <button
                type="button"
                onClick={() =>
                  setActiveTab((prev) =>
                    prev === "github_voice" ? "basic" : "github_voice"
                  )
                }
                style={{
                  padding: "8px 16px",
                  borderRadius: 10,
                  border:
                    activeTab === "github_voice"
                      ? "1px solid #38bdf8"
                      : "1px solid #334155",
                  background:
                    activeTab === "github_voice"
                      ? "rgba(56, 189, 248, 0.22)"
                      : "#0f172a",
                  color: activeTab === "github_voice" ? "#fff" : "#cbd5e1",
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                🔗 GitHub・音声入力（便利ツール）
              </button>
            </div>

            <div
              style={{
                display: "flex",
                gap: 12,
                fontSize: 12,
                color: "#94a3b8",
                alignItems: "center",
              }}
            >
              <span>
                記憶済みクセ:{" "}
                <strong style={{ color: "#a5b4fc" }}>{habits.length}件</strong>
              </span>
              <span>•</span>
              <span>
                累積防止ヒット:{" "}
                <strong style={{ color: "#38bdf8" }}>
                  {dnaAnalytics.totalHits}回
                </strong>
              </span>
            </div>
          </div>
        </header>

        {/* Collapsible Tab 2: Personal Mistake DNA Editor & Analytics */}
        {activeTab === "dna" && (
          <section
            style={{
              background: "rgba(15, 23, 42, 0.94)",
              border: "1px solid rgba(165, 180, 252, 0.4)",
              borderRadius: 16,
              padding: 18,
              marginBottom: 18,
            }}
          >
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 10,
                marginBottom: 12,
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: 15,
                    fontWeight: 800,
                    color: "#a5b4fc",
                  }}
                >
                  🧬 あなたの「やりがちミスDNA」管理・傾向分析 ({habits.length}件)
                </h2>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "#94a3b8" }}>
                  登録したミス傾向はブラウザに自動保存されるほか、`.codepitfall.json` として Git リポジトリに保存・共有できます。
                </p>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={handleSaveGitDnaFile}
                  style={{
                    background: "#020617",
                    color: "#38bdf8",
                    border: "1px solid rgba(56,189,248,0.45)",
                    borderRadius: 8,
                    padding: "6px 10px",
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  📂 Git 用 DNA 保存 (.codepitfall.json)
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    background: "#020617",
                    color: "#a5b4fc",
                    border: "1px solid rgba(165,180,252,0.4)",
                    borderRadius: 8,
                    padding: "6px 10px",
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  📤 DNAファイル読込 (.json)
                </button>
                <button
                  type="button"
                  onClick={handleResetDna}
                  style={{
                    background: "#020617",
                    color: "#94a3b8",
                    border: "1px solid #334155",
                    borderRadius: 8,
                    padding: "6px 10px",
                    fontSize: 11.5,
                    cursor: "pointer",
                  }}
                >
                  ↺ 初期状態に戻す
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("basic")}
                  style={{
                    background: "rgba(51, 65, 85, 0.5)",
                    color: "#f8fafc",
                    border: "1px solid #475569",
                    borderRadius: 8,
                    padding: "6px 10px",
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  ✕ 閉じる
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleImportDnaJson}
                  style={{ display: "none" }}
                />
              </div>
            </div>

            {dnaStatusMsg && (
              <div
                style={{
                  marginBottom: 12,
                  padding: "8px 12px",
                  borderRadius: 8,
                  background: "rgba(52, 211, 153, 0.14)",
                  border: "1px solid rgba(52, 211, 153, 0.4)",
                  color: "#6ee7b7",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {dnaStatusMsg}
              </div>
            )}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                gap: 14,
              }}
            >
              {/* Left: Category Breakdown + Add Habit */}
              <div
                style={{
                  background: "#020617",
                  border: "1px solid #1e293b",
                  borderRadius: 12,
                  padding: 14,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <span
                    style={{ fontSize: 12, fontWeight: 700, color: "#cbd5e1" }}
                  >
                    カテゴリ別ミス傾向
                  </span>
                  <span style={{ fontSize: 11.5, color: "#94a3b8" }}>
                    総ヒット数: {dnaAnalytics.totalHits}回
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    height: 12,
                    width: "100%",
                    borderRadius: 999,
                    overflow: "hidden",
                    background: "#0f172a",
                    marginBottom: 10,
                  }}
                >
                  {dnaAnalytics.breakdown.map((item) => (
                    <div
                      key={item.category}
                      style={{
                        width: `${Math.max(6, item.percent)}%`,
                        background: item.meta.color,
                      }}
                      title={`${item.meta.label}: ${item.hits}回 (${item.percent}%)`}
                    />
                  ))}
                </div>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 6,
                    marginBottom: 12,
                  }}
                >
                  {dnaAnalytics.breakdown.map((item) => (
                    <span
                      key={item.category}
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: item.meta.color,
                        background: item.meta.bg,
                        border: `1px solid ${item.meta.border}`,
                        padding: "2px 8px",
                        borderRadius: 999,
                      }}
                    >
                      {item.category}: {item.hits}回 ({item.percent}%)
                    </span>
                  ))}
                </div>

                {/* Add new habit form */}
                <div style={{ display: "flex", gap: 6 }}>
                  <select
                    value={newHabitCategory}
                    onChange={(e) => setNewHabitCategory(e.target.value)}
                    style={{
                      background: "#0f172a",
                      color: "#e2e8f0",
                      border: "1px solid #334155",
                      borderRadius: 8,
                      padding: "7px 8px",
                      fontSize: 12,
                    }}
                  >
                    {Object.keys(CATEGORY_META).map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={newHabitText}
                    onChange={(e) => setNewHabitText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddHabit();
                    }}
                    placeholder="自分のクセを追加（例: nullチェック忘れ）"
                    style={{
                      flex: 1,
                      background: "#0f172a",
                      color: "#f8fafc",
                      border: "1px solid #334155",
                      borderRadius: 8,
                      padding: "7px 10px",
                      fontSize: 12,
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddHabit}
                    style={{
                      background: "#4f46e5",
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      padding: "7px 12px",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    ＋追加
                  </button>
                </div>
              </div>

              {/* Right: Habit list */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
                  gap: 8,
                  maxHeight: 220,
                  overflowY: "auto",
                }}
              >
                {habits.map((h) => {
                  const meta = CATEGORY_META[h.category] ?? CATEGORY_META.Logic;
                  return (
                    <div
                      key={h.id}
                      style={{
                        background: "#020617",
                        border: "1px solid #1e293b",
                        borderLeft: `3px solid ${meta.color}`,
                        borderRadius: 10,
                        padding: "8px 10px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: "#f1f5f9",
                          }}
                        >
                          {h.pattern}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            marginTop: 3,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: meta.color,
                              background: meta.bg,
                              padding: "1px 6px",
                              borderRadius: 999,
                            }}
                          >
                            {h.category}
                          </span>
                          <span style={{ fontSize: 10.5, color: "#94a3b8" }}>
                            {h.hits}回ヒット
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteHabit(h.id)}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#64748b",
                          cursor: "pointer",
                          fontSize: 12,
                        }}
                        title="削除"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Collapsible Tab 3: GitHub URL Fetch & Voice Declaration */}
        {activeTab === "github_voice" && (
          <section
            style={{
              background: "rgba(15, 23, 42, 0.94)",
              border: "1px solid rgba(56, 189, 248, 0.4)",
              borderRadius: 16,
              padding: 18,
              marginBottom: 18,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 10,
                marginBottom: 12,
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: 15,
                  fontWeight: 800,
                  color: "#38bdf8",
                }}
              >
                🔗 GitHub ファイル直接読込 ＆ 🎤 音声で作業宣言
              </h2>
              <button
                type="button"
                onClick={() => setActiveTab("basic")}
                style={{
                  background: "rgba(51, 65, 85, 0.5)",
                  color: "#f8fafc",
                  border: "1px solid #475569",
                  borderRadius: 8,
                  padding: "5px 10px",
                  fontSize: 11.5,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                ✕ 閉じる
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                gap: 14,
              }}
            >
              {/* GitHub URL Fetcher */}
              <div
                style={{
                  background: "#020617",
                  border: "1px solid #1e293b",
                  borderRadius: 12,
                  padding: 14,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: 8,
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#38bdf8",
                    }}
                  >
                    🐙 GitHub のファイル URL から読み込む
                  </span>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {SAMPLE_GITHUB_URLS.map((sample) => (
                      <button
                        key={sample.url}
                        type="button"
                        onClick={() => handleFetchGitHub(sample.url)}
                        style={{
                          background: "rgba(56, 189, 248, 0.12)",
                          color: "#7dd3fc",
                          border: "1px solid rgba(56, 189, 248, 0.3)",
                          borderRadius: 6,
                          padding: "3px 8px",
                          fontSize: 11,
                          cursor: "pointer",
                        }}
                      >
                        サンプル: {sample.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <input
                    type="url"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/owner/repo/blob/main/src/api.ts"
                    style={{
                      flex: 1,
                      minWidth: 200,
                      background: "#0f172a",
                      color: "#f8fafc",
                      border: "1px solid #334155",
                      borderRadius: 8,
                      padding: "8px 10px",
                      fontSize: 12,
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleFetchGitHub()}
                    disabled={githubLoading || !githubUrl.trim()}
                    style={{
                      background: "#0284c7",
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      padding: "8px 12px",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor:
                        githubLoading || !githubUrl.trim()
                          ? "not-allowed"
                          : "pointer",
                      opacity: githubLoading || !githubUrl.trim() ? 0.6 : 1,
                    }}
                  >
                    {githubLoading ? "取得中..." : "読み込んでチェック"}
                  </button>
                </div>

                {convertedRawPreview && (
                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 11,
                      color: "#94a3b8",
                      wordBreak: "break-all",
                    }}
                  >
                    Raw URL: <code style={{ color: "#7dd3fc" }}>{convertedRawPreview}</code>
                  </div>
                )}

                {githubStatus && (
                  <div
                    style={{
                      marginTop: 8,
                      padding: "6px 10px",
                      borderRadius: 8,
                      fontSize: 12,
                      background:
                        githubStatus.type === "error"
                          ? "rgba(244,63,94,0.14)"
                          : "rgba(52,211,153,0.14)",
                      color:
                        githubStatus.type === "error" ? "#fda4af" : "#6ee7b7",
                    }}
                  >
                    {githubStatus.message}
                  </div>
                )}
              </div>

              {/* Voice Declaration */}
              <div
                style={{
                  background: "#020617",
                  border: "1px solid #1e293b",
                  borderRadius: 12,
                  padding: 14,
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#a5b4fc",
                    marginBottom: 8,
                  }}
                >
                  🎙️ 今からやる作業を声やテキストで宣言（チェックリストを自動切替）
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <input
                    type="text"
                    value={taskDeclaration}
                    onChange={(e) => setTaskDeclaration(e.target.value)}
                    placeholder="例: Stripe Webhookの署名検証を実装する..."
                    style={{
                      flex: 1,
                      minWidth: 200,
                      background: "#0f172a",
                      color: "#f8fafc",
                      border: "1px solid #334155",
                      borderRadius: 8,
                      padding: "8px 10px",
                      fontSize: 12,
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleVoiceDeclaration}
                    style={{
                      background: isListening
                        ? "linear-gradient(135deg, #e11d48, #f43f5e)"
                        : "rgba(56, 189, 248, 0.16)",
                      color: isListening ? "#fff" : "#38bdf8",
                      border: "1px solid rgba(56, 189, 248, 0.45)",
                      borderRadius: 8,
                      padding: "8px 12px",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {isListening ? "🔴 認識中..." : "🎤 音声入力"}
                  </button>
                </div>
                {voiceStatus && (
                  <div
                    style={{
                      marginTop: 8,
                      fontSize: 11.5,
                      color: "#38bdf8",
                    }}
                  >
                    {voiceStatus}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* MAIN SUPER-CLEAN 2-COLUMN WORKSPACE */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
            gap: 18,
            alignItems: "start",
          }}
        >
          {/* LEFT COLUMN: ① Preset Pills + Code Textarea + ② ONE Prominent Check Button */}
          <section
            style={{
              background: "rgba(15, 23, 42, 0.92)",
              border: "1px solid rgba(99, 102, 241, 0.35)",
              borderRadius: 16,
              padding: 20,
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    color: "#a5b4fc",
                  }}
                >
                  ① サンプルを選ぶ（1クリックで試せます）
                </span>
                <span style={{ fontSize: 11.5, color: "#94a3b8" }}>
                  または下の欄に自分のコードを貼り付け
                </span>
              </div>

              {/* 4 Preset Pills */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(195px, 1fr))",
                  gap: 8,
                }}
              >
                {FEATURED_PRESETS.map((preset) => {
                  const isSelected = activePresetId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      style={{
                        textAlign: "left",
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: isSelected
                          ? "1.5px solid #6366f1"
                          : "1px solid #1e293b",
                        background: isSelected
                          ? "rgba(99, 102, 241, 0.22)"
                          : "#020617",
                        color: "#f8fafc",
                        cursor: "pointer",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 10.5,
                          fontWeight: 700,
                          color: isSelected ? "#a5b4fc" : "#38bdf8",
                          marginBottom: 2,
                        }}
                      >
                        {preset.badge}
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 700 }}>
                        {preset.title}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Compact Task Type Selector Pills */}
              <div
                style={{
                  marginTop: 10,
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 6,
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    fontSize: 11.5,
                    fontWeight: 700,
                    color: "#94a3b8",
                  }}
                >
                  作業ジャンル:
                </span>
                {Object.keys(TASK_TEMPLATES_DATA).map((name) => {
                  const active = taskType === name;
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => handleSelectTaskTemplate(name)}
                      style={{
                        padding: "4px 10px",
                        borderRadius: 999,
                        border: active
                          ? "1px solid #38bdf8"
                          : "1px solid #334155",
                        background: active
                          ? "rgba(56, 189, 248, 0.2)"
                          : "#0f172a",
                        color: active ? "#fff" : "#cbd5e1",
                        fontSize: 11.5,
                        fontWeight: active ? 700 : 500,
                        cursor: "pointer",
                      }}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Code Editor Textarea */}
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 6,
                }}
              >
                <label
                  htmlFor="codepitfall-editor"
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    color: "#38bdf8",
                  }}
                >
                  💻 チェックしたいコード（{taskType}）
                </label>
                <span style={{ fontSize: 11.5, color: "#94a3b8" }}>
                  {code.split("\n").length} 行
                </span>
              </div>
              <textarea
                id="codepitfall-editor"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                rows={13}
                placeholder="ここに TypeScript / JavaScript / Python / SQL などのコードを貼り付けてください..."
                style={{
                  width: "100%",
                  background: "#020617",
                  color: "#e2e8f0",
                  border: "1px solid #334155",
                  borderRadius: 12,
                  padding: 14,
                  fontFamily:
                    "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
                  fontSize: 13,
                  lineHeight: 1.6,
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* ONE Prominent Primary Action Button */}
            <button
              type="button"
              onClick={handleAudit}
              disabled={loading}
              style={{
                width: "100%",
                background:
                  "linear-gradient(135deg, #4f46e5 0%, #0284c7 50%, #059669 100%)",
                color: "#fff",
                border: "1px solid rgba(165, 180, 252, 0.45)",
                borderRadius: 12,
                padding: "14px 20px",
                fontSize: 15,
                fontWeight: 800,
                cursor: loading ? "not-allowed" : "pointer",
                boxShadow: "0 8px 24px rgba(79, 70, 229, 0.45)",
                letterSpacing: "0.01em",
              }}
            >
              {loading
                ? "🔍 あなたのクセと照合してチェック中..."
                : "🔍 自分のクセでチェックする"}
            </button>
          </section>

          {/* RIGHT COLUMN: ③ Risk Summary + Highlighted Code & Fixed Patch + Checkable Task Pitfalls Template */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 16,
              minWidth: 0,
            }}
          >
            {result && (
              <>
                {/* 1. Risk Summary & Red Lines Diagnostics */}
                <section
                  style={{
                    background: "rgba(15, 23, 42, 0.92)",
                    border: "1px solid #1e293b",
                    borderRadius: 16,
                    padding: 18,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 10,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        flexWrap: "wrap",
                      }}
                    >
                      <h2
                        style={{
                          margin: 0,
                          fontSize: 15,
                          fontWeight: 800,
                          color: "#fb7185",
                        }}
                      >
                        🚨 見つかった注意点・赤い行（{result.diagnostics.length}件）
                      </h2>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 800,
                          color:
                            result.riskScore >= 60
                              ? "#fda4af"
                              : result.riskScore >= 30
                                ? "#fde68a"
                                : "#6ee7b7",
                          background:
                            result.riskScore >= 60
                              ? "rgba(244,63,94,0.2)"
                              : result.riskScore >= 30
                                ? "rgba(245,158,11,0.2)"
                                : "rgba(16,185,129,0.2)",
                          padding: "3px 10px",
                          borderRadius: 999,
                        }}
                      >
                        危険度スコア: {result.riskScore} / 100
                      </span>
                    </div>

                    <span
                      style={{
                        fontSize: 11,
                        color: "#94a3b8",
                        background: "#020617",
                        padding: "3px 8px",
                        borderRadius: 999,
                        border: "1px solid #1e293b",
                      }}
                    >
                      Engine: {result.source}
                    </span>
                  </div>

                  <p
                    style={{
                      margin: "0 0 12px",
                      fontSize: 13,
                      color: "#e2e8f0",
                      lineHeight: 1.55,
                    }}
                  >
                    {result.summary}
                  </p>

                  {dnaStatusMsg && (
                    <div
                      style={{
                        marginBottom: 10,
                        padding: "7px 10px",
                        borderRadius: 8,
                        background: "rgba(52, 211, 153, 0.14)",
                        border: "1px solid rgba(52, 211, 153, 0.4)",
                        color: "#6ee7b7",
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      {dnaStatusMsg}
                    </div>
                  )}

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    {result.diagnostics.map((d, i) => {
                      const learnKey = `${d.line}-${d.title}`;
                      const isLearned = Boolean(learnedTitles[learnKey]);
                      const catMeta =
                        CATEGORY_META[d.category] ?? CATEGORY_META.Logic;
                      return (
                        <div
                          key={i}
                          style={{
                            background: "#020617",
                            border:
                              d.severity === "high"
                                ? "1px solid rgba(244, 63, 94, 0.45)"
                                : "1px solid #334155",
                            borderRadius: 12,
                            padding: 12,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "flex-start",
                              gap: 8,
                            }}
                          >
                            <div>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 6,
                                  flexWrap: "wrap",
                                  marginBottom: 4,
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 800,
                                    color:
                                      d.severity === "high"
                                        ? "#fda4af"
                                        : "#fde68a",
                                    background:
                                      d.severity === "high"
                                        ? "rgba(244,63,94,0.2)"
                                        : "rgba(245,158,11,0.18)",
                                    padding: "2px 7px",
                                    borderRadius: 6,
                                  }}
                                >
                                  {d.line}行目 •{" "}
                                  {d.severity === "high" ? "要注意" : "確認"}
                                </span>
                                <span
                                  style={{
                                    fontSize: 10.5,
                                    fontWeight: 700,
                                    color: catMeta.color,
                                    background: catMeta.bg,
                                    padding: "2px 7px",
                                    borderRadius: 6,
                                  }}
                                >
                                  {d.category || "Logic"}
                                </span>
                                {d.matchedPersonalHabit && (
                                  <span
                                    style={{
                                      fontSize: 10.5,
                                      fontWeight: 700,
                                      color: "#c4b5fd",
                                      background: "rgba(139, 92, 246, 0.18)",
                                      border:
                                        "1px solid rgba(139, 92, 246, 0.35)",
                                      padding: "2px 8px",
                                      borderRadius: 999,
                                    }}
                                  >
                                    ★ あなたのクセ一致: {d.matchedPersonalHabit}
                                  </span>
                                )}
                              </div>
                              <div
                                style={{
                                  fontSize: 13,
                                  fontWeight: 700,
                                  color: "#f8fafc",
                                }}
                              >
                                {d.title}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleLearnDiagnostic(d)}
                              style={{
                                background: isLearned
                                  ? "rgba(52, 211, 153, 0.2)"
                                  : "rgba(139, 92, 246, 0.2)",
                                color: isLearned ? "#6ee7b7" : "#c4b5fd",
                                border: isLearned
                                  ? "1px solid rgba(52, 211, 153, 0.45)"
                                  : "1px solid rgba(139, 92, 246, 0.45)",
                                borderRadius: 8,
                                padding: "5px 10px",
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: "pointer",
                                whiteSpace: "nowrap",
                                flexShrink: 0,
                              }}
                            >
                              {isLearned
                                ? "✓ クセに記憶済み"
                                : "＋ 自分のDNAに記憶"}
                            </button>
                          </div>

                          <p
                            style={{
                              margin: "6px 0",
                              fontSize: 12,
                              color: "#cbd5e1",
                              lineHeight: 1.5,
                            }}
                          >
                            {d.reason}
                          </p>

                          <div
                            style={{
                              background: "#090d16",
                              border: "1px solid #1e293b",
                              borderRadius: 8,
                              padding: "6px 8px",
                              fontFamily:
                                "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
                              fontSize: 11.5,
                              color: "#6ee7b7",
                              overflowX: "auto",
                            }}
                          >
                            直し方: {d.fixSuggestion}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* 2. Highlighted Code & Fixed Patch (Before / After Diff) */}
                <section
                  style={{
                    background: "rgba(15, 23, 42, 0.92)",
                    border: "1px solid #1e293b",
                    borderRadius: 16,
                    padding: 18,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 12,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <h3
                        style={{
                          margin: 0,
                          fontSize: 14.5,
                          fontWeight: 800,
                          color: "#34d399",
                        }}
                      >
                        🔧 赤い行（修正前）と安全な修正コード（修正後）
                      </h3>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: "#fda4af",
                          background: "rgba(244,63,94,0.15)",
                          padding: "2px 8px",
                          borderRadius: 999,
                        }}
                      >
                        -{diffStats.modified + diffStats.removed} 危険行
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: "#6ee7b7",
                          background: "rgba(52,211,153,0.15)",
                          padding: "2px 8px",
                          borderRadius: 999,
                        }}
                      >
                        +{diffStats.modified + diffStats.added} 修正行
                      </span>
                    </div>

                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <div
                        style={{
                          display: "inline-flex",
                          background: "#020617",
                          border: "1px solid #334155",
                          borderRadius: 8,
                          overflow: "hidden",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => setDiffMode("split")}
                          style={{
                            background:
                              diffMode === "split" ? "#4f46e5" : "transparent",
                            color: "#fff",
                            border: "none",
                            padding: "5px 10px",
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          左右で比較
                        </button>
                        <button
                          type="button"
                          onClick={() => setDiffMode("unified")}
                          style={{
                            background:
                              diffMode === "unified"
                                ? "#4f46e5"
                                : "transparent",
                            color: "#fff",
                            border: "none",
                            padding: "5px 10px",
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          上下で比較
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={handleApplyFixToEditor}
                        style={{
                          background: "rgba(52, 211, 153, 0.18)",
                          color: "#34d399",
                          border: "1px solid rgba(52, 211, 153, 0.45)",
                          borderRadius: 8,
                          padding: "5px 11px",
                          fontSize: 11.5,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        ✨ 修正案をエディタに反映
                      </button>

                      <button
                        type="button"
                        onClick={handleCopyFixedPatch}
                        style={{
                          background: copiedPatch
                            ? "rgba(52, 211, 153, 0.25)"
                            : "#1e293b",
                          color: copiedPatch ? "#6ee7b7" : "#f8fafc",
                          border: "1px solid #334155",
                          borderRadius: 8,
                          padding: "5px 11px",
                          fontSize: 11.5,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        {copiedPatch ? "✓ コピー済み" : "📋 修正コードをコピー"}
                      </button>

                      <button
                        type="button"
                        onClick={handleCopyPrMarkdown}
                        style={{
                          background: copiedPrMd
                            ? "rgba(52, 211, 153, 0.25)"
                            : "rgba(99, 102, 241, 0.2)",
                          color: copiedPrMd ? "#6ee7b7" : "#c7d2fe",
                          border: "1px solid rgba(99, 102, 241, 0.45)",
                          borderRadius: 8,
                          padding: "5px 11px",
                          fontSize: 11.5,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        {copiedPrMd ? "✓ MDコピー済" : "📝 レポートをコピー"}
                      </button>
                    </div>
                  </div>

                  {diffMode === "split" ? (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 10,
                        background: "#020617",
                        border: "1px solid #1e293b",
                        borderRadius: 12,
                        padding: 12,
                        fontFamily:
                          "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
                        fontSize: 12,
                        overflowX: "auto",
                      }}
                    >
                      <div style={{ minWidth: 240 }}>
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: "#fda4af",
                            paddingBottom: 6,
                            marginBottom: 6,
                            borderBottom: "1px solid #1e293b",
                          }}
                        >
                          − 修正前（赤い行＝危険箇所）
                        </div>
                        {diffRows.map((row, idx) => {
                          const isRemovedOrMod =
                            row.status === "modified" ||
                            row.status === "removed";
                          return (
                            <div
                              key={`b-${idx}`}
                              style={{
                                display: "flex",
                                gap: 8,
                                padding: "2px 6px",
                                background: isRemovedOrMod
                                  ? "rgba(244, 63, 94, 0.18)"
                                  : "transparent",
                                borderLeft: isRemovedOrMod
                                  ? "3px solid #f43f5e"
                                  : "3px solid transparent",
                                color: isRemovedOrMod ? "#fecdd3" : "#94a3b8",
                                minHeight: 20,
                              }}
                            >
                              <span
                                style={{
                                  width: 20,
                                  textAlign: "right",
                                  color: "#64748b",
                                  userSelect: "none",
                                  flexShrink: 0,
                                }}
                              >
                                {row.beforeLineNum ?? ""}
                              </span>
                              <span style={{ whiteSpace: "pre" }}>
                                {row.beforeText}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      <div
                        style={{
                          minWidth: 240,
                          borderLeft: "1px solid #1e293b",
                          paddingLeft: 10,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: "#6ee7b7",
                            paddingBottom: 6,
                            marginBottom: 6,
                            borderBottom: "1px solid #1e293b",
                          }}
                        >
                          ＋ 修正後（緑の行＝安全なコード）
                        </div>
                        {diffRows.map((row, idx) => {
                          const isAddedOrMod =
                            row.status === "modified" || row.status === "added";
                          return (
                            <div
                              key={`a-${idx}`}
                              style={{
                                display: "flex",
                                gap: 8,
                                padding: "2px 6px",
                                background: isAddedOrMod
                                  ? "rgba(16, 185, 129, 0.18)"
                                  : "transparent",
                                borderLeft: isAddedOrMod
                                  ? "3px solid #10b981"
                                  : "3px solid transparent",
                                color: isAddedOrMod ? "#bbf7d0" : "#cbd5e1",
                                minHeight: 20,
                              }}
                            >
                              <span
                                style={{
                                  width: 20,
                                  textAlign: "right",
                                  color: "#64748b",
                                  userSelect: "none",
                                  flexShrink: 0,
                                }}
                              >
                                {row.afterLineNum ?? ""}
                              </span>
                              <span style={{ whiteSpace: "pre" }}>
                                {row.afterText}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        background: "#020617",
                        border: "1px solid #1e293b",
                        borderRadius: 12,
                        padding: 12,
                        fontFamily:
                          "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
                        fontSize: 12,
                        overflowX: "auto",
                      }}
                    >
                      {diffRows.map((row, idx) => {
                        if (row.status === "unchanged") {
                          return (
                            <div
                              key={`u-${idx}`}
                              style={{
                                display: "flex",
                                gap: 10,
                                padding: "2px 6px",
                                color: "#94a3b8",
                              }}
                            >
                              <span style={{ width: 26, color: "#64748b" }}>
                                {row.beforeLineNum}
                              </span>
                              <span>  {row.beforeText}</span>
                            </div>
                          );
                        }
                        return (
                          <React.Fragment key={`u-${idx}`}>
                            {row.beforeLineNum !== null && (
                              <div
                                style={{
                                  display: "flex",
                                  gap: 10,
                                  padding: "2px 6px",
                                  background: "rgba(244, 63, 94, 0.18)",
                                  borderLeft: "3px solid #f43f5e",
                                  color: "#fecdd3",
                                }}
                              >
                                <span style={{ width: 26, color: "#fb7185" }}>
                                  -{row.beforeLineNum}
                                </span>
                                <span style={{ whiteSpace: "pre" }}>
                                  - {row.beforeText}
                                </span>
                              </div>
                            )}
                            {row.afterLineNum !== null && (
                              <div
                                style={{
                                  display: "flex",
                                  gap: 10,
                                  padding: "2px 6px",
                                  background: "rgba(16, 185, 129, 0.18)",
                                  borderLeft: "3px solid #10b981",
                                  color: "#bbf7d0",
                                }}
                              >
                                <span style={{ width: 26, color: "#34d399" }}>
                                  +{row.afterLineNum}
                                </span>
                                <span style={{ whiteSpace: "pre" }}>
                                  + {row.afterText}
                                </span>
                              </div>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  )}
                </section>

                {/* 3. Checkable Task Pitfalls Template */}
                <section
                  style={{
                    background: "rgba(15, 23, 42, 0.92)",
                    border: "1px solid #1e293b",
                    borderRadius: 16,
                    padding: 18,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 8,
                    }}
                  >
                    <h3
                      style={{
                        margin: 0,
                        fontSize: 14.5,
                        fontWeight: 800,
                        color: "#34d399",
                      }}
                    >
                      ✅ 作業テンプレ・最終確認チェックリスト（{taskType}）
                    </h3>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => {
                          const all: Record<string, boolean> = {};
                          activeChecklist.forEach((c) => {
                            all[c.id] = true;
                          });
                          setCheckedIds(all);
                        }}
                        style={{
                          background: "#020617",
                          color: "#34d399",
                          border: "1px solid rgba(52,211,153,0.35)",
                          borderRadius: 6,
                          padding: "3px 8px",
                          fontSize: 11,
                          cursor: "pointer",
                        }}
                      >
                        すべて完了
                      </button>
                      <button
                        type="button"
                        onClick={() => setCheckedIds({})}
                        style={{
                          background: "#020617",
                          color: "#94a3b8",
                          border: "1px solid #334155",
                          borderRadius: 6,
                          padding: "3px 8px",
                          fontSize: 11,
                          cursor: "pointer",
                        }}
                      >
                        クリア
                      </button>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div
                    style={{
                      background: "#020617",
                      border: "1px solid #1e293b",
                      borderRadius: 10,
                      padding: "9px 12px",
                      marginBottom: 10,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 5,
                        fontSize: 12,
                      }}
                    >
                      <span style={{ fontWeight: 700, color: "#e2e8f0" }}>
                        チェック完了度
                      </span>
                      <span
                        style={{
                          fontWeight: 800,
                          color:
                            progressPercent === 100 ? "#34d399" : "#fbbf24",
                        }}
                      >
                        {completedCount} / {activeChecklist.length} 完了 (
                        {progressPercent}%)
                      </span>
                    </div>
                    <div
                      style={{
                        height: 8,
                        width: "100%",
                        background: "#0f172a",
                        borderRadius: 999,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${progressPercent}%`,
                          background:
                            progressPercent === 100
                              ? "linear-gradient(90deg, #10b981, #34d399)"
                              : "linear-gradient(90deg, #6366f1, #38bdf8)",
                          transition: "width 0.25s ease",
                        }}
                      />
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    {activeChecklist.map((item) => {
                      const checked = Boolean(checkedIds[item.id]);
                      return (
                        <label
                          key={item.id}
                          style={{
                            display: "flex",
                            gap: 10,
                            alignItems: "flex-start",
                            background: item.personalMatch
                              ? "rgba(99, 102, 241, 0.13)"
                              : "#020617",
                            border: item.personalMatch
                              ? "1px solid rgba(99, 102, 241, 0.45)"
                              : "1px solid #1e293b",
                            borderRadius: 10,
                            padding: 10,
                            cursor: "pointer",
                            opacity: checked ? 0.65 : 1,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setCheckedIds((prev) => ({
                                ...prev,
                                [item.id]: !prev[item.id],
                              }))
                            }
                            style={{ marginTop: 3 }}
                          />
                          <div>
                            <div
                              style={{
                                fontSize: 12.5,
                                fontWeight: 700,
                                color: "#f8fafc",
                                textDecoration: checked
                                  ? "line-through"
                                  : "none",
                              }}
                            >
                              {item.title}
                              {item.personalMatch && (
                                <span
                                  style={{
                                    marginLeft: 6,
                                    fontSize: 10.5,
                                    fontWeight: 700,
                                    color: "#c4b5fd",
                                    background: "rgba(139, 92, 246, 0.2)",
                                    padding: "1px 7px",
                                    borderRadius: 999,
                                  }}
                                >
                                  🧬 あなたの要注意クセ
                                </span>
                              )}
                            </div>
                            <div
                              style={{
                                fontSize: 11.5,
                                color: "#94a3b8",
                                marginTop: 2,
                                lineHeight: 1.45,
                              }}
                            >
                              {item.why}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>

                  {/* Next-step seamless bridge to /gitbridge */}
                  <div
                    style={{
                      marginTop: 14,
                      paddingTop: 14,
                      borderTop: "1px solid #1e293b",
                      display: "flex",
                      flexWrap: "wrap",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <span style={{ fontSize: 12, color: "#cbd5e1" }}>
                      チェックが終わったら、安全な手順で GitHub にコミット・公開しましょう！
                    </span>
                    <Link
                      href="/gitbridge"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        background:
                          "linear-gradient(135deg, #059669 0%, #0284c7 100%)",
                        color: "#fff",
                        padding: "9px 16px",
                        borderRadius: 10,
                        fontSize: 12.5,
                        fontWeight: 800,
                        textDecoration: "none",
                        boxShadow: "0 4px 14px rgba(5, 150, 105, 0.3)",
                      }}
                    >
                      🚀 修正コードを GitHub へ送る手順を見る (/gitbridge)
                    </Link>
                  </div>
                </section>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
