"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type {
  AuditResponse,
  ChecklistItem,
  PersonalMistake,
} from "@/app/api/codemistake/route";

const STORAGE_KEY = "codepitfall_personal_dna_v1";

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
    pattern: "import パス大文字小文字ミス・パッケージ未導入・EPERMロック",
    category: "Env",
    severity: "high",
    hits: 4,
  },
  {
    id: "h3",
    pattern: "Next.js の 'use client' 宣言忘れ＆初期描画 Hydration ズレ",
    category: "Hydration",
    severity: "high",
    hits: 5,
  },
  {
    id: "h4",
    pattern: "作業前・push前の git pull 忘れによる push rejected",
    category: "Git",
    severity: "medium",
    hits: 3,
  },
  {
    id: "h5",
    pattern: "response.ok を確認せずに .json() してしまう",
    category: "API",
    severity: "high",
    hits: 4,
  },
];

interface ErrorPreset {
  id: string;
  label: string;
  taskType: string;
  errorLog: string;
  optionalCode: string;
}

const ERROR_PRESETS: ErrorPreset[] = [
  {
    id: "preset-await",
    label: "TypeError: res.json is not a function (await忘れ)",
    taskType: "Next.js API / フォーム送信",
    errorLog: `Uncaught (in promise) TypeError: res.json is not a function
    at submitOrder (src/app/orders/page.tsx:14:20)
    at HTMLButtonElement.handleClick (src/app/orders/page.tsx:28:5)`,
    optionalCode: `async function submitOrder(payload: Record<string, unknown>) {
  const res = fetch("/api/orders", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const data = res.json();
  return data;
}`,
  },
  {
    id: "preset-eperm",
    label: "EPERM / パス・モジュール未検出",
    taskType: "Node.js / パッケージ・環境設定",
    errorLog: `Module not found: Can't resolve '@/components/OrderCard' in 'C:\\workspace\\app\\src\\app\\page.tsx'
Error: EPERM: operation not permitted, open 'C:\\workspace\\app\\.next\\trace'`,
    optionalCode: `import OrderCard from "@/components/ordercard"; // 実ファイル名は OrderCard.tsx`,
  },
  {
    id: "preset-hydration",
    label: "Next.js Hydration / use client エラー",
    taskType: "React / Next.js 画面・Hydration",
    errorLog: `Error: Hydration failed because the server rendered HTML didn't match the client.
You're importing a component that needs \`useState\`. This React Hook only works in a Client Component. To fix, mark the file (or its parent) with the \`"use client"\` directive.`,
    optionalCode: `import { useState } from "react";
export default function CounterCard() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{Date.now()}</button>;
}`,
  },
  {
    id: "preset-git",
    label: "GitHub push rejected / コンフリクト",
    taskType: "Git / GitHub Push・PR作成",
    errorLog: `To https://github.com/my-team/neon-task-manager.git
 ! [rejected]        main -> main (fetch first)
error: failed to push some refs to 'https://github.com/my-team/neon-task-manager.git'
hint: Updates were rejected because the remote contains work that you do not have locally.`,
    optionalCode: "",
  },
];

const TASK_TEMPLATES: Record<string, ChecklistItem[]> = {
  "Next.js API / フォーム送信": [
    {
      id: "next-1",
      title: "fetch() と res.json() の両方に await を付けたか",
      why: "Promise のまま参照して TypeError: res.json is not a function になる最多ミスを防ぎます。",
      personalMatch: true,
    },
    {
      id: "next-2",
      title: "res.ok (HTTP 200-299) を確認してから .json() を呼んでいるか",
      why: "404/500 エラー時に HTML が返って SyntaxError で落ちる事故を防ぎます。",
      personalMatch: true,
    },
    {
      id: "next-3",
      title: "送信ボタンの二度押し防止（disabled={loading}）を入れたか",
      why: "通信中の連打による二重送信・重複登録を防ぎます。",
      personalMatch: false,
    },
    {
      id: "next-4",
      title: "環境変数（process.env）のスペルと NEXT_PUBLIC_ の有無を確認したか",
      why: "クライアント側で undefined になり通信先 URL が壊れるミスを防ぎます。",
      personalMatch: false,
    },
  ],
  "React / Next.js 画面・Hydration": [
    {
      id: "hyd-1",
      title: "useState / useEffect / onClick を使うファイルの先頭に 'use client' を書いたか",
      why: "Next.js App Router で Server Component 扱いになりエラーになるのを防ぎます。",
      personalMatch: true,
    },
    {
      id: "hyd-2",
      title: "localStorage / window / Date.now() を初期描画中に直接呼んでいないか",
      why: "サーバー描画とブラウザ描画の結果がズレる Hydration failed エラーを防ぎます。",
      personalMatch: true,
    },
    {
      id: "hyd-3",
      title: "リスト描画（.map）の直下要素に一意な key={item.id} を付けたか",
      why: "表示順序ズレや React コンソール警告を防ぎます。",
      personalMatch: false,
    },
    {
      id: "hyd-4",
      title: "<p> の中に <div> や <button> の中に <button> を入れ子にしていないか",
      why: "HTML 仕様違反による Hydration mismatch クラッシュを防ぎます。",
      personalMatch: false,
    },
  ],
  "Node.js / パッケージ・環境設定": [
    {
      id: "env-1",
      title: "import パスの大文字・小文字が実際のファイル名と完全一致しているか",
      why: "Module not found: Can't resolve エラーや Linux デプロイ時の失敗を防ぎます。",
      personalMatch: true,
    },
    {
      id: "env-2",
      title: "package.json 更新後に npm install を実行したか",
      why: "Cannot find module エラーを防ぎます。",
      personalMatch: false,
    },
    {
      id: "env-3",
      title: "EPERM ロックが出たら開発サーバー（npm run dev）を一度止めて再起動したか",
      why: "Windows で .next フォルダがロックされてビルドが止まる現象を即解消できます。",
      personalMatch: true,
    },
    {
      id: "env-4",
      title: ".env.local を編集したあと開発サーバーを再起動したか",
      why: "環境変数の変更が反映されず undefined のまま悩む時間をゼロにします。",
      personalMatch: false,
    },
  ],
  "Git / GitHub Push・PR作成": [
    {
      id: "git-1",
      title: "作業開始前・push 前に git pull（最新取得）を実行したか",
      why: "non-fast-forward / push rejected エラーや大きなコンフリクトを防ぎます。",
      personalMatch: true,
    },
    {
      id: "git-2",
      title: ".env や API キー・シークレットが git status に混ざっていないか",
      why: "GitHub への秘密鍵誤公開インシデントを未然に防ぎます。",
      personalMatch: false,
    },
    {
      id: "git-3",
      title: "コンフリクト解消後に <<<<<<< HEAD マーカーが残っていないか",
      why: "マーカー残存による構文エラー（SyntaxError）を防ぎます。",
      personalMatch: false,
    },
    {
      id: "git-4",
      title: "コミット前に npx tsc --noEmit で型エラーがないか確認したか",
      why: "GitHub Actions / Vercel デプロイでのビルド失敗を防ぎます。",
      personalMatch: false,
    },
  ],
  "Python / データ処理・スクリプト": [
    {
      id: "py-1",
      title: "open() でファイルを読み書きするとき encoding='utf-8' を明示したか",
      why: "Windows (cp932) 環境での UnicodeDecodeError 文字化けクラッシュを防ぎます。",
      personalMatch: false,
    },
    {
      id: "py-2",
      title: "JavaScript の JSON.parse と Python の json.loads を混同していないか",
      why: "言語切り替え直後の NameError / AttributeError を防ぎます。",
      personalMatch: false,
    },
    {
      id: "py-3",
      title: "割り算や平均計算の前に空リスト（len == 0）ガードを入れたか",
      why: "バッチ処理途中の ZeroDivisionError 停止を防ぎます。",
      personalMatch: false,
    },
    {
      id: "py-4",
      title: "仮想環境（venv）を有効化してから pip install / 実行しているか",
      why: "ModuleNotFoundError: No module named ... を防ぎます。",
      personalMatch: false,
    },
  ],
  "DB / 認証・本番リリース前チェック": [
    {
      id: "rel-1",
      title: "デバッグ用の console.log（特に token / secret）を削除したか",
      why: "本番ログへの認証情報・個人情報の露出を防ぎます。",
      personalMatch: false,
    },
    {
      id: "rel-2",
      title: "配列ループの境界条件が <= .length ではなく < .length になっているか",
      why: "最後の要素で undefined 参照（off-by-one）になるバグを防ぎます。",
      personalMatch: false,
    },
    {
      id: "rel-3",
      title: "既存テーブルへのカラム追加で DEFAULT なしの NOT NULL にしていないか",
      why: "本番 DB マイグレーションの即死エラーを防ぎます。",
      personalMatch: false,
    },
    {
      id: "rel-4",
      title: "本番デプロイ先に必要な環境変数がすべて登録されているか",
      why: "リリース直後の 500 エラーや真っ白画面を防ぎます。",
      personalMatch: false,
    },
  ],
};

export default function CodePitfallMirror() {
  const [habits, setHabits] = useState<PersonalMistake[]>(DEFAULT_HABITS);
  const [errorLog, setErrorLog] = useState<string>(ERROR_PRESETS[0].errorLog);
  const [optionalCode, setOptionalCode] = useState<string>(
    ERROR_PRESETS[0].optionalCode
  );
  const [showCodeBox, setShowCodeBox] = useState<boolean>(false);
  const [activePresetId, setActivePresetId] = useState<string>(
    ERROR_PRESETS[0].id
  );
  const [taskType, setTaskType] = useState<string>(ERROR_PRESETS[0].taskType);

  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<AuditResponse | null>(null);

  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);
  const [copiedCmd, setCopiedCmd] = useState<boolean>(false);
  const [showPromptPreview, setShowPromptPreview] = useState<boolean>(false);
  const [pasteStatus, setPasteStatus] = useState<string>("");
  const [dnaStatus, setDnaStatus] = useState<string>("");
  const [rememberedCurrent, setRememberedCurrent] = useState<boolean>(false);

  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [newHabitInput, setNewHabitInput] = useState<string>("");

  const persistHabits = (next: PersonalMistake[]) => {
    setHabits(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage errors
    }
  };

  const runDiagnosis = useCallback(
    async (
      targetError: string,
      targetCode: string,
      targetTask: string,
      currentHabits: PersonalMistake[]
    ) => {
      setLoading(true);
      setRememberedCurrent(false);
      try {
        const res = await fetch("/api/codemistake", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            errorLog: targetError,
            code: targetCode,
            taskType: targetTask,
            habits: currentHabits,
          }),
        });
        if (res.ok) {
          const data: AuditResponse = await res.json();
          setResult(data);
        }
      } catch {
        // Keep existing result if offline
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Initial load from localStorage and run initial diagnosis
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
      // Ignore
    }
    void runDiagnosis(
      ERROR_PRESETS[0].errorLog,
      ERROR_PRESETS[0].optionalCode,
      ERROR_PRESETS[0].taskType,
      initialHabits
    );
  }, [runDiagnosis]);

  // 1-Click Preset Selection
  const handleSelectPreset = (preset: ErrorPreset) => {
    setActivePresetId(preset.id);
    setErrorLog(preset.errorLog);
    setOptionalCode(preset.optionalCode);
    setTaskType(preset.taskType);
    void runDiagnosis(
      preset.errorLog,
      preset.optionalCode,
      preset.taskType,
      habits
    );
  };

  // 1-Click Paste from Clipboard & Immediate Diagnosis
  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        setErrorLog(text);
        setActivePresetId("");
        setPasteStatus("✓ クリップボードから貼り付けて診断しました");
        setTimeout(() => setPasteStatus(""), 2800);
        void runDiagnosis(text, optionalCode, taskType, habits);
      } else {
        setPasteStatus("クリップボードが空です。エラーをコピーしてから押してください");
        setTimeout(() => setPasteStatus(""), 3000);
      }
    } catch {
      setPasteStatus(
        "ブラウザの権限設定により直接読み取れませんでした。ボックス内で Ctrl+V を押してください"
      );
      setTimeout(() => setPasteStatus(""), 3500);
    }
  };

  // Copy AI Fix Prompt for VS Code / Copilot / Cursor
  const handleCopyAiPrompt = async () => {
    if (!result?.aiFixPrompt) return;
    try {
      await navigator.clipboard.writeText(result.aiFixPrompt);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2500);
    } catch {
      // Ignore
    }
  };

  // Copy Terminal Command
  const handleCopyCommand = async (cmd: string) => {
    try {
      await navigator.clipboard.writeText(cmd);
      setCopiedCmd(true);
      setTimeout(() => setCopiedCmd(false), 2500);
    } catch {
      // Ignore
    }
  };

  // 1-Click Remember into Personal DNA
  const handleRememberHabit = () => {
    if (!result) return;
    const pattern =
      result.suggestedHabitPattern ||
      result.matchedHabit?.pattern ||
      "エラー再発防止パターン";
    const existingIdx = habits.findIndex(
      (h) => h.pattern.toLowerCase() === pattern.toLowerCase()
    );

    let next: PersonalMistake[];
    if (existingIdx >= 0) {
      next = habits.map((h, idx) =>
        idx === existingIdx ? { ...h, hits: h.hits + 1 } : h
      );
    } else {
      next = [
        {
          id: `dna-${Date.now()}`,
          pattern,
          category: result.category || "Logic",
          severity: result.severity || "high",
          hits: 1,
        },
        ...habits,
      ];
    }

    persistHabits(next);
    setRememberedCurrent(true);
    setDnaStatus(`🧬「${pattern}」を自分のクセDNAに記憶しました！`);
    setTimeout(() => setDnaStatus(""), 3500);
  };

  // Add manual custom habit
  const handleAddCustomHabit = () => {
    const trimmed = newHabitInput.trim();
    if (!trimmed) return;
    const next: PersonalMistake[] = [
      {
        id: `dna-${Date.now()}`,
        pattern: trimmed,
        category: "Logic",
        severity: "medium",
        hits: 1,
      },
      ...habits,
    ];
    persistHabits(next);
    setNewHabitInput("");
    setDnaStatus(`🧬「${trimmed}」を追加しました`);
    setTimeout(() => setDnaStatus(""), 2800);
  };

  const handleDeleteHabit = (id: string) => {
    persistHabits(habits.filter((h) => h.id !== id));
  };

  // Download .codepitfall.json for Git repo
  const handleDownloadGitJson = () => {
    const payload = {
      $schema: "https://codepitfall.local/schema/v2.json",
      app: "CodePitfall Mirror Companion",
      exportedAt: new Date().toISOString(),
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
    setDnaStatus("📂 .codepitfall.json をPCに保存しました（Git管理用）");
    setTimeout(() => setDnaStatus(""), 3200);
  };

  // Download Markdown summary to local SSD
  const handleDownloadMarkdown = () => {
    const lines = [
      "# CodePitfall Mirror — エラー解決＆自分のクセDNAメモ",
      "",
      `- 保存日時: ${new Date().toLocaleString("ja-JP")}`,
      `- 作業カテゴリ: ${taskType}`,
      "",
      "## 1. 直近のエラー診断",
      `- **エラー内容**: \`${errorLog.split("\n")[0] || "なし"}\``,
      `- **3秒で分かる原因**: ${result?.quickCause ?? "-"}`,
      `- **理由**: ${result?.whyItHappened ?? "-"}`,
      "",
      "## 2. 直す手順（VS Code / ターミナル）",
      ...(result?.fixSteps.map(
        (s) =>
          `${s.stepNumber}. **[${s.where}]** ${s.instruction}${
            s.codeOrCommand ? `\n   \`${s.codeOrCommand}\`` : ""
          }`
      ) ?? []),
      "",
      "## 3. 自分の過去クセDNA一覧",
      ...habits.map((h) => `- **${h.pattern}** (${h.category} / 累計 ${h.hits}回)`),
      "",
    ];
    const blob = new Blob([lines.join("\n")], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "codepitfall-note.md";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setDnaStatus("📝 診断＆クセDNAメモ (.md) をPCに保存しました");
    setTimeout(() => setDnaStatus(""), 3200);
  };

  const activeChecklist =
    TASK_TEMPLATES[taskType] ?? TASK_TEMPLATES["Next.js API / フォーム送信"];
  const completedCount = activeChecklist.filter(
    (item) => checkedItems[item.id]
  ).length;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        color: "#0f172a",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Hiragino Sans", "Noto Sans JP", sans-serif',
        paddingBottom: 64,
      }}
    >
      {/* Top Navigation Bar */}
      <header
        style={{
          background: "#ffffff",
          borderBottom: "1px solid #e2e8f0",
          position: "sticky",
          top: 0,
          zIndex: 30,
        }}
      >
        <div
          style={{
            maxWidth: 960,
            margin: "0 auto",
            padding: "14px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 34,
                height: 34,
                borderRadius: 10,
                background: "#eff6ff",
                color: "#1d4ed8",
                fontWeight: 800,
                fontSize: 18,
                border: "1px solid #bfdbfe",
              }}
            >
              🪞
            </span>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h1
                  style={{
                    fontSize: 17,
                    fontWeight: 800,
                    margin: 0,
                    color: "#0f172a",
                    letterSpacing: "-0.01em",
                  }}
                >
                  CodePitfall Mirror
                </h1>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: "#e0f2fe",
                    color: "#0369a1",
                  }}
                >
                  VS Code / GitHub 補助サイドキック
                </span>
              </div>
              <p
                style={{
                  fontSize: 12,
                  color: "#64748b",
                  margin: 0,
                }}
              >
                コードは VS Code で書くまま。エラーが出た瞬間だけここに貼って3秒解決
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Link
              href="/gitbridge"
              style={{
                fontSize: 12.5,
                fontWeight: 700,
                color: "#1e40af",
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                padding: "7px 12px",
                borderRadius: 8,
                textDecoration: "none",
              }}
            >
              🌉 GitHub の基本手順を見る
            </Link>
            <Link
              href="/"
              style={{
                fontSize: 12.5,
                fontWeight: 600,
                color: "#475569",
                background: "#f1f5f9",
                border: "1px solid #e2e8f0",
                padding: "7px 12px",
                borderRadius: 8,
                textDecoration: "none",
              }}
            >
              ← ホーム
            </Link>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 960, margin: "0 auto", padding: "24px 20px" }}>
        {/* Status Toast */}
        {(pasteStatus || dnaStatus) && (
          <div
            style={{
              marginBottom: 16,
              padding: "10px 16px",
              borderRadius: 10,
              background: "#ecfdf5",
              border: "1px solid #6ee7b7",
              color: "#065f46",
              fontSize: 13,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span>{pasteStatus || dnaStatus}</span>
          </div>
        )}

        {/* MAIN INPUT CARD: Error Log Paste Box (NOT a code editor) */}
        <section
          style={{
            background: "#ffffff",
            borderRadius: 16,
            border: "1px solid #cbd5e1",
            boxShadow: "0 4px 20px rgba(15, 23, 42, 0.04)",
            padding: "22px 24px",
            marginBottom: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <div>
              <label
                htmlFor="error-paste-box"
                style={{
                  fontSize: 16,
                  fontWeight: 800,
                  color: "#0f172a",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span>🚨 VS Code・ターミナル・GitHub のエラーをここに貼るだけ</span>
              </label>
              <p
                style={{
                  fontSize: 12.5,
                  color: "#64748b",
                  margin: "4px 0 0 0",
                }}
              >
                赤いエラー文やターミナルのログをそのまま貼り付けてください（ここでコードを書く必要はありません）
              </p>
            </div>

            <button
              type="button"
              onClick={handlePasteFromClipboard}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "9px 14px",
                borderRadius: 10,
                background: "#eff6ff",
                border: "1px solid #93c5fd",
                color: "#1d4ed8",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              📋 クリップボードから貼る
            </button>
          </div>

          {/* 4 Instant Realistic Error Presets */}
          <div style={{ marginBottom: 12 }}>
            <div
              style={{
                fontSize: 11.5,
                fontWeight: 700,
                color: "#64748b",
                marginBottom: 6,
              }}
            >
              ⚡ ワンクリックで試せるよくあるエラー例（4選）：
            </div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              {ERROR_PRESETS.map((preset) => {
                const active = activePresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      border: active
                        ? "1.5px solid #2563eb"
                        : "1px solid #cbd5e1",
                      background: active ? "#eff6ff" : "#f8fafc",
                      color: active ? "#1d4ed8" : "#334155",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Error Paste Textarea */}
          <textarea
            id="error-paste-box"
            value={errorLog}
            onChange={(e) => {
              setErrorLog(e.target.value);
              setActivePresetId("");
            }}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                e.preventDefault();
                void runDiagnosis(errorLog, optionalCode, taskType, habits);
              }
            }}
            rows={4}
            placeholder="例: TypeError: res.json is not a function / Module not found: Can't resolve ... / ! [rejected] main -> main (fetch first)"
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "14px 16px",
              borderRadius: 12,
              border: "1.5px solid #cbd5e1",
              background: "#f8fafc",
              color: "#0f172a",
              fontSize: 13.5,
              fontFamily:
                'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Courier New", monospace',
              lineHeight: 1.55,
              resize: "vertical",
              outline: "none",
            }}
          />

          {/* Optional Collapsed Toggle for Code Context + Primary Diagnose CTA */}
          <div
            style={{
              marginTop: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <button
              type="button"
              onClick={() => setShowCodeBox((prev) => !prev)}
              style={{
                background: "transparent",
                border: "1px dashed #94a3b8",
                color: "#475569",
                padding: "7px 12px",
                borderRadius: 8,
                fontSize: 12.5,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {showCodeBox
                ? "－ 該当コード欄を閉じる"
                : "＋ 該当コードを添える（任意）"}
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 11.5, color: "#64748b" }}>
                ショートカット: <strong>Ctrl + Enter</strong>
              </span>
              <button
                type="button"
                onClick={() =>
                  void runDiagnosis(errorLog, optionalCode, taskType, habits)
                }
                disabled={loading}
                style={{
                  padding: "10px 20px",
                  borderRadius: 10,
                  border: "none",
                  background: "#2563eb",
                  color: "#ffffff",
                  fontWeight: 800,
                  fontSize: 14,
                  cursor: loading ? "wait" : "pointer",
                  boxShadow: "0 2px 8px rgba(37, 99, 235, 0.25)",
                }}
              >
                {loading ? "診断中..." : "🔍 原因と直し方を即診断する"}
              </button>
            </div>
          </div>

          {/* Collapsed Optional Code Box */}
          {showCodeBox && (
            <div
              style={{
                marginTop: 12,
                padding: 14,
                borderRadius: 10,
                background: "#f1f5f9",
                border: "1px solid #cbd5e1",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#475569",
                  marginBottom: 6,
                }}
              >
                💡 VS Code でエラーが出ている周辺のコード（数行だけコピー＆ペースト・空欄でもOK）：
              </div>
              <textarea
                value={optionalCode}
                onChange={(e) => setOptionalCode(e.target.value)}
                rows={4}
                placeholder="// 任意：VS Code からエラー行の周辺だけをここに貼ると、AI修正指示プロンプトに自動で組み込まれます"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: 12,
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  color: "#0f172a",
                  fontSize: 12.5,
                  fontFamily:
                    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Courier New", monospace',
                  lineHeight: 1.5,
                }}
              />
            </div>
          )}
        </section>

        {/* OUTPUT SECTION ① & ②: Instant Actionable Diagnosis */}
        {result && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: 20,
              marginBottom: 24,
            }}
          >
            {/* ① 3秒で分かる原因 ＆ あなたの過去クセ一致アラート */}
            <section
              style={{
                background: "#ffffff",
                borderRadius: 16,
                border: "1.5px solid #bfdbfe",
                padding: "20px 24px",
                boxShadow: "0 2px 12px rgba(37, 99, 235, 0.05)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 10,
                  marginBottom: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      padding: "3px 10px",
                      borderRadius: 999,
                      background: "#dbeafe",
                      color: "#1e40af",
                    }}
                  >
                    ① 3秒で分かる原因
                  </span>
                  <span
                    style={{
                      fontSize: 11.5,
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 6,
                      background: "#f1f5f9",
                      color: "#475569",
                    }}
                  >
                    分類: {result.category}
                  </span>
                </div>

                {/* ④ 1-click 「＋ 自分のクセDNAに記憶」 */}
                <button
                  type="button"
                  onClick={handleRememberHabit}
                  disabled={rememberedCurrent}
                  style={{
                    padding: "7px 14px",
                    borderRadius: 999,
                    fontSize: 12.5,
                    fontWeight: 800,
                    cursor: rememberedCurrent ? "default" : "pointer",
                    border: rememberedCurrent
                      ? "1px solid #86efac"
                      : "1px solid #f59e0b",
                    background: rememberedCurrent ? "#dcfce7" : "#fffbeb",
                    color: rememberedCurrent ? "#166534" : "#b45309",
                  }}
                >
                  {rememberedCurrent
                    ? "✓ 自分のクセDNAに記憶済み"
                    : "＋ 自分のクセDNAに記憶"}
                </button>
              </div>

              {/* Matched Personal Habit Alert Banner */}
              {result.matchedHabit && (
                <div
                  style={{
                    marginBottom: 14,
                    padding: "11px 14px",
                    borderRadius: 10,
                    background: "#fffbeb",
                    border: "1.5px solid #fcd34d",
                    color: "#92400e",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 8,
                  }}
                >
                  <div style={{ fontSize: 13.5, fontWeight: 800 }}>
                    ⚡ あなたの過去クセ一致アラート：「
                    {result.matchedHabit.pattern}」
                  </div>
                  <span
                    style={{
                      fontSize: 11.5,
                      fontWeight: 800,
                      padding: "2px 9px",
                      borderRadius: 999,
                      background: "#fef3c7",
                      color: "#b45309",
                    }}
                  >
                    過去 {result.matchedHabit.hits} 回発生している得意ミス
                  </span>
                </div>
              )}

              {/* 3-Second Root Cause Headline */}
              <div
                style={{
                  fontSize: 17,
                  fontWeight: 800,
                  color: "#0f172a",
                  lineHeight: 1.5,
                  marginBottom: 8,
                }}
              >
                {result.quickCause}
              </div>
              <p
                style={{
                  fontSize: 13.5,
                  color: "#475569",
                  lineHeight: 1.65,
                  margin: 0,
                }}
              >
                {result.whyItHappened}
              </p>
            </section>

            {/* ② VS Code / ターミナルですぐ直す手順（1・2・3） + AI修正指示コピー + コマンドコピー */}
            <section
              style={{
                background: "#ffffff",
                borderRadius: 16,
                border: "1px solid #cbd5e1",
                padding: "20px 24px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 10,
                  marginBottom: 16,
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    padding: "3px 10px",
                    borderRadius: 999,
                    background: "#dcfce7",
                    color: "#166534",
                  }}
                >
                  ② VS Code / ターミナルですぐ直す手順（1・2・3）
                </span>

                <Link
                  href="/gitbridge"
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#2563eb",
                    textDecoration: "none",
                  }}
                >
                  GitHub の基本手順を見る →
                </Link>
              </div>

              {/* Steps 1 - 2 - 3 */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr",
                  gap: 12,
                  marginBottom: 18,
                }}
              >
                {result.fixSteps.map((step) => (
                  <div
                    key={step.stepNumber}
                    style={{
                      padding: "12px 16px",
                      borderRadius: 12,
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 4,
                      }}
                    >
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 22,
                          height: 22,
                          borderRadius: 999,
                          background: "#2563eb",
                          color: "#ffffff",
                          fontSize: 12,
                          fontWeight: 800,
                        }}
                      >
                        {step.stepNumber}
                      </span>
                      <span
                        style={{
                          fontSize: 11.5,
                          fontWeight: 800,
                          padding: "2px 8px",
                          borderRadius: 6,
                          background: "#e2e8f0",
                          color: "#334155",
                        }}
                      >
                        {step.where}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 13.5,
                        color: "#1e293b",
                        fontWeight: 600,
                        lineHeight: 1.55,
                        marginLeft: 30,
                      }}
                    >
                      {step.instruction}
                    </div>
                    {step.codeOrCommand && (
                      <pre
                        style={{
                          margin: "8px 0 0 30px",
                          padding: "10px 12px",
                          borderRadius: 8,
                          background: "#0f172a",
                          color: "#f8fafc",
                          fontSize: 12,
                          fontFamily:
                            'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Courier New", monospace',
                          overflowX: "auto",
                        }}
                      >
                        <code>{step.codeOrCommand}</code>
                      </pre>
                    )}
                  </div>
                ))}
              </div>

              {/* Action Bar: 1-Click Copyable AI Fix Prompt & Copyable Terminal Command */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 16px",
                  borderRadius: 12,
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                }}
              >
                <button
                  type="button"
                  onClick={handleCopyAiPrompt}
                  style={{
                    padding: "10px 16px",
                    borderRadius: 10,
                    border: "none",
                    background: copiedPrompt ? "#16a34a" : "#1d4ed8",
                    color: "#ffffff",
                    fontWeight: 800,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  {copiedPrompt
                    ? "✓ 修正指示をコピーしました（VS CodeのAIに貼り付けてください）"
                    : "🤖 VS Code / AI にそのまま貼る修正指示をコピー"}
                </button>

                {result.terminalCommand && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      background: "#ffffff",
                      border: "1px solid #cbd5e1",
                      borderRadius: 10,
                      padding: "6px 10px",
                    }}
                  >
                    <code
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#0f172a",
                      }}
                    >
                      $ {result.terminalCommand}
                    </code>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopyCommand(result.terminalCommand ?? "")
                      }
                      style={{
                        padding: "5px 10px",
                        borderRadius: 6,
                        border: "1px solid #cbd5e1",
                        background: copiedCmd ? "#dcfce7" : "#f8fafc",
                        color: copiedCmd ? "#166534" : "#334155",
                        fontSize: 11.5,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      {copiedCmd ? "✓ コピー済" : "コマンドをコピー"}
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setShowPromptPreview((prev) => !prev)}
                  style={{
                    marginLeft: "auto",
                    background: "transparent",
                    border: "none",
                    color: "#1e40af",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  {showPromptPreview ? "修正指示の中身を隠す" : "修正指示の中身を見る"}
                </button>
              </div>

              {showPromptPreview && (
                <pre
                  style={{
                    marginTop: 10,
                    padding: 12,
                    borderRadius: 10,
                    background: "#f8fafc",
                    border: "1px solid #cbd5e1",
                    fontSize: 12,
                    color: "#334155",
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.55,
                  }}
                >
                  {result.aiFixPrompt}
                </pre>
              )}
            </section>
          </div>
        )}

        {/* ③ 作業別「よくある間違いテンプレート」（6種・コミット前チェックリスト） */}
        <section
          style={{
            background: "#ffffff",
            borderRadius: 16,
            border: "1px solid #cbd5e1",
            padding: "20px 24px",
            marginBottom: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 10,
              marginBottom: 12,
            }}
          >
            <div>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  padding: "3px 10px",
                  borderRadius: 999,
                  background: "#f3e8ff",
                  color: "#6b21a8",
                }}
              >
                ③ 作業別「よくある間違いテンプレート」（6種）
              </span>
              <h2
                style={{
                  fontSize: 15.5,
                  fontWeight: 800,
                  margin: "8px 0 0 0",
                  color: "#0f172a",
                }}
              >
                VS Code でコミット・保存する前の30秒セルフチェック
              </h2>
            </div>

            <div
              style={{
                fontSize: 12.5,
                fontWeight: 800,
                color: "#1e40af",
                background: "#eff6ff",
                padding: "5px 12px",
                borderRadius: 999,
              }}
            >
              チェック進捗: {completedCount} / {activeChecklist.length}
            </div>
          </div>

          {/* 6 Selectable Task Template Pills */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: 14,
            }}
          >
            {Object.keys(TASK_TEMPLATES).map((tName) => {
              const selected = taskType === tName;
              return (
                <button
                  key={tName}
                  type="button"
                  onClick={() => setTaskType(tName)}
                  style={{
                    padding: "7px 12px",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    border: selected
                      ? "1.5px solid #2563eb"
                      : "1px solid #cbd5e1",
                    background: selected ? "#eff6ff" : "#f8fafc",
                    color: selected ? "#1d4ed8" : "#475569",
                  }}
                >
                  {tName}
                </button>
              );
            })}
          </div>

          {/* Checkable Pre-Flight List */}
          <div style={{ display: "grid", gap: 8 }}>
            {activeChecklist.map((item) => {
              const checked = !!checkedItems[item.id];
              return (
                <label
                  key={item.id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    padding: "10px 14px",
                    borderRadius: 10,
                    border: checked
                      ? "1px solid #86efac"
                      : "1px solid #e2e8f0",
                    background: checked ? "#f0fdf4" : "#f8fafc",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      setCheckedItems((prev) => ({
                        ...prev,
                        [item.id]: !prev[item.id],
                      }))
                    }
                    style={{ marginTop: 3, width: 16, height: 16 }}
                  />
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: 8,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 13.5,
                          fontWeight: 700,
                          color: checked ? "#166534" : "#0f172a",
                          textDecoration: checked ? "line-through" : "none",
                        }}
                      >
                        {item.title}
                      </span>
                      {item.personalMatch && (
                        <span
                          style={{
                            fontSize: 10.5,
                            fontWeight: 800,
                            padding: "1px 7px",
                            borderRadius: 999,
                            background: "#fef3c7",
                            color: "#b45309",
                          }}
                        >
                          🧬 過去クセ注意
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "#64748b",
                        marginTop: 2,
                      }}
                    >
                      {item.why}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </section>

        {/* ④ 自分のクセDNAポケット（LocalStorage + .codepitfall.json + .md 出力） */}
        <section
          style={{
            background: "#ffffff",
            borderRadius: 16,
            border: "1px solid #cbd5e1",
            padding: "20px 24px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 12,
              marginBottom: 14,
            }}
          >
            <div>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  padding: "3px 10px",
                  borderRadius: 999,
                  background: "#fef3c7",
                  color: "#b45309",
                }}
              >
                ④ 記憶している「自分のクセDNA」（{habits.length}件）
              </span>
              <p
                style={{
                  fontSize: 12,
                  color: "#64748b",
                  margin: "6px 0 0 0",
                }}
              >
                ブラウザ（localStorage）に自動保存されます。GitリポジトリやPC（SSD）への書き出しもワンクリックです。
              </p>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <button
                type="button"
                onClick={handleDownloadGitJson}
                style={{
                  padding: "7px 12px",
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  background: "#f8fafc",
                  color: "#0f172a",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                📂 .codepitfall.json 保存 (Git用)
              </button>
              <button
                type="button"
                onClick={handleDownloadMarkdown}
                style={{
                  padding: "7px 12px",
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  background: "#f8fafc",
                  color: "#0f172a",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                📝 解決メモ (.md) 保存 (SSD用)
              </button>
              <Link
                href="/gitbridge"
                style={{
                  padding: "7px 12px",
                  borderRadius: 8,
                  border: "1px solid #bfdbfe",
                  background: "#eff6ff",
                  color: "#1d4ed8",
                  fontSize: 12,
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                🌉 GitHub の基本手順を見る
              </Link>
            </div>
          </div>

          {/* Quick Add Habit Input */}
          <div
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 12,
            }}
          >
            <input
              type="text"
              value={newHabitInput}
              onChange={(e) => setNewHabitInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddCustomHabit();
                }
              }}
              placeholder="自分のやりがちなミスを1行で追加（例：.env.local 変更後の npm run dev 再起動忘れ）"
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid #cbd5e1",
                fontSize: 12.5,
              }}
            />
            <button
              type="button"
              onClick={handleAddCustomHabit}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                border: "none",
                background: "#0f172a",
                color: "#ffffff",
                fontSize: 12.5,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              ＋ 追加
            </button>
          </div>

          {/* Compact Habit Pills */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {habits.map((h) => (
              <div
                key={h.id}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 12px",
                  borderRadius: 999,
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  fontSize: 12,
                }}
              >
                <span style={{ fontWeight: 700, color: "#1e293b" }}>
                  {h.pattern}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: "#b45309",
                    background: "#fef3c7",
                    padding: "1px 7px",
                    borderRadius: 999,
                  }}
                >
                  {h.hits}回
                </span>
                <button
                  type="button"
                  onClick={() => handleDeleteHabit(h.id)}
                  title="削除"
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "#94a3b8",
                    cursor: "pointer",
                    fontSize: 13,
                    padding: 0,
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Footer with Open Source notice & 1-click Feedback Link */}
        <footer
          style={{
            marginTop: 28,
            paddingTop: 18,
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
            fontSize: 12,
            color: "#64748b",
          }}
        >
          <div>
            ログイン不要・データはお使いのブラウザに保存 • Apache-2.0 Open Source
          </div>
          <a
            href="https://github.com/JY4844/google-ai-challenge-2026/issues/new?title=%5BCodePitfall%5D+%E6%84%9F%E6%83%B3%E3%83%BB%E6%94%B9%E5%96%84%E8%A6%81%E6%9C%9B"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "#2563eb",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            💬 使ってみた感想・改善要望を送る
          </a>
        </footer>
      </main>
    </div>
  );
}
