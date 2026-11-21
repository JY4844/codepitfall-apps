"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import styles from "./GitBridge.module.css";

type GoalId = "first_publish" | "update_push_pr" | "secret_check";

interface GoalOption {
  id: GoalId;
  title: string;
  badge: string;
  description: string;
  placeholder: string;
  sampleNote: string;
  buttonLabel: string;
  accentColor: string;
  bgSoft: string;
  borderSoft: string;
}

const GOAL_OPTIONS: GoalOption[] = [
  {
    id: "first_publish",
    title: "🌱 はじめて GitHub にコードを公開する",
    badge: "STEP 1 → 初めての公開",
    description:
      "手元で作ったアプリやコードを、初めて GitHub リポジトリへ安全にアップロードする手順を1ステップずつ案内します。",
    placeholder:
      "例：初めて Next.js でアプリを作りました。.env.local に API キーが入っています。最初から GitHub に公開する手順を知りたいです。",
    sampleNote:
      "初めて Next.js アプリを作りました。.env.local に GEMINI_API_KEY が入っています。API キーを漏らさずに GitHub へ公開して URL を共有する手順を教えてください。",
    buttonLabel: "🌱 はじめての GitHub 公開ガイドを作成",
    accentColor: "#16a34a",
    bgSoft: "#f0fdf4",
    borderSoft: "#bbf7d0",
  },
  {
    id: "update_push_pr",
    title: "🔄 修正したコードを安全に更新（Push / PR）する",
    badge: "STEP 1 → 更新・Push・PR",
    description:
      "すでに公開中のリポジトリに対して、修正したコードを安全に Commit・Push・Pull Request する手順や既存コードの読み方を案内します。",
    placeholder:
      "例：画面のコンポーネントを2ファイル修正しました。変更内容を確認してから安全に Push / PR するコマンド手順を知りたいです。",
    sampleNote:
      "画面のデザインと API ルートを修正しました。変更した差分を安全に確認（git status / git diff）してから、ブランチを切って Push し Pull Request を作成する手順を教えてください。",
    buttonLabel: "🔄 安全な更新（Push / PR）ガイドを作成",
    accentColor: "#2563eb",
    bgSoft: "#eff6ff",
    borderSoft: "#bfdbfe",
  },
  {
    id: "secret_check",
    title: "🔒 個人情報や API キーが漏れていないかチェックする",
    badge: "STEP 1 → 秘密情報・安全チェック",
    description:
      "GitHub に Push する前に、API キー（.env）やパスワード・個人情報がコミットに含まれていないか確認・除外する手順を案内します。",
    placeholder:
      "例：.env.local に API キーを書いています。うっかり GitHub にアップしてしまわないか確認する方法と、.gitignore の設定を知りたいです。",
    sampleNote:
      "【秘密情報チェック希望】.env.local に GEMINI_API_KEY を保存しています。git add する前に API キーや個人情報が漏れていないか確認するコマンドと、万が一 git add してしまった時の取り消し方を教えてください。",
    buttonLabel: "🔒 API キー・秘密情報漏れチェック手順を作成",
    accentColor: "#d97706",
    bgSoft: "#fffbeb",
    borderSoft: "#fde68a",
  },
];

interface LearnResult {
  title: string;
  repo_summary: string;
  reading_order: { file_path: string; role: string; beginner_tip: string }[];
  key_concepts: { term: string; plain_explanation: string }[];
  quiz: {
    question: string;
    choices: string[];
    correct_index: number;
    explanation: string;
  }[];
  suggested_tasks: { title: string; priority: "high" | "medium" | "low"; memo: string }[];
}

interface PublishResult {
  title: string;
  summary: string;
  safety_checks: { item: string; why_important: string; how_to_fix: string }[];
  publish_steps: { step_title: string; command: string; meaning: string }[];
  common_errors: { error_pattern: string; recovery: string }[];
  suggested_tasks: { title: string; priority: "high" | "medium" | "low"; memo: string }[];
}

const FALLBACK_GUIDES: Record<GoalId, PublishResult> = {
  first_publish: {
    title: "🌱 はじめての GitHub 安全公開ステップガイド",
    summary:
      "手元のプロジェクトを秘密情報（.env など）を守りながら Git で記録し、GitHub の新しいリポジトリへ初めて公開するまでの基本手順です。",
    safety_checks: [
      {
        item: ".gitignore に .env* が含まれているか確認",
        why_important: "API キーやパスワードをそのまま公開すると悪用・課金被害につながります。",
        how_to_fix: ".gitignore ファイルに `.env` と `.env.local` が書かれているか確認しましょう。",
      },
      {
        item: "git status で公開されるファイル一覧を確認",
        why_important: "意図しない設定ファイルや個人メモが混ざるのを防ぎます。",
        how_to_fix: "`git status` を実行し、秘密ファイルが表示されていないことを確認します。",
      },
    ],
    publish_steps: [
      {
        step_title: "Git の初期化と状態確認",
        command: "git init && git status",
        meaning: "プロジェクトで Git の記録を開始し、どのファイルが対象か一覧表示します。",
      },
      {
        step_title: "ファイルをステージングして最初のコミットを作成",
        command: 'git add . && git commit -m "Initial commit"',
        meaning: "変更ファイルをまとめて、最初のセーブポイント（コミット）を作ります。",
      },
      {
        step_title: "GitHub リポジトリへ接続して Push（公開）",
        command: "git branch -M main && git remote add origin <GitHubのURL> && git push -u origin main",
        meaning: "メインブランチを GitHub のリポジトリへ紐づけてコードをアップロードします。",
      },
    ],
    common_errors: [
      {
        error_pattern: "remote origin already exists と表示されたとき",
        recovery: "`git remote set-url origin <新しいGitHubのURL>` を実行すると接続先を更新できます。",
      },
      {
        error_pattern: "ビルドエラーやコードのバグで動かないとき",
        recovery: "公開前に CodePitfall Mirror（/codemistake）でやりがちミスを自動チェックしましょう。",
      },
    ],
    suggested_tasks: [
      {
        title: ".gitignore に .env.local が入っているか確認する",
        priority: "high",
        memo: "git status で .env.local が出ないことを確認",
      },
      {
        title: "README.md にアプリの概要と使い方を3行書く",
        priority: "medium",
        memo: "見る人がすぐに動かせるように手順を記載",
      },
    ],
  },
  update_push_pr: {
    title: "🔄 修正したコードを安全に更新（Push / PR）するガイド",
    summary:
      "変更した差分を事前にチェックしてからコミットし、安全に GitHub へ Push または Pull Request を送る手順です。",
    safety_checks: [
      {
        item: "git diff でデバッグ用の console.log や仮キーが残っていないか確認",
        why_important: "テスト用の仮コードや秘密キーを誤って Push するのを防ぎます。",
        how_to_fix: "コミット前に `git diff` で変更行を目視チェックしましょう。",
      },
      {
        item: "作業用ブランチを切ってから変更を Push する",
        why_important: "main ブランチを直接壊さずに、安全にレビュー・確認ができます。",
        how_to_fix: "`git checkout -b fix/update-ui` のようにブランチを作って作業します。",
      },
    ],
    publish_steps: [
      {
        step_title: "変更したファイルと差分（diff）を確認する",
        command: "git status && git diff",
        meaning: "どのファイルのどこを書き換えたか、コミット前に確認します。",
      },
      {
        step_title: "作業ブランチを作成して変更をコミットする",
        command: 'git checkout -b feat/update && git add . && git commit -m "Update feature"',
        meaning: "安全な別ブランチに変更を記録します。",
      },
      {
        step_title: "GitHub にブランチを Push して PR を作成する",
        command: "git push -u origin feat/update",
        meaning: "GitHub に変更を送り、ブラウザ上の Compare & pull request ボタンから PR を作ります。",
      },
    ],
    common_errors: [
      {
        error_pattern: "rejected - non-fast-forward（Push が拒否された）",
        recovery: "リモートに新しい変更があるため、`git pull --rebase origin main` で最新を取り込んでから Push します。",
      },
      {
        error_pattern: "修正後に型エラーや実行時エラーが出たとき",
        recovery: "CodePitfall Mirror（/codemistake）にコードを貼って、やりがちミスやバグ原因を診断してください。",
      },
    ],
    suggested_tasks: [
      {
        title: "git diff で意図しない変更が含まれていないか確認",
        priority: "high",
        memo: "不要な変更があれば git checkout -- <ファイル名> で戻す",
      },
      {
        title: "GitHub 上で Pull Request の変更ファイル一覧を確認",
        priority: "medium",
        memo: "Files changed タブで最終チェック",
      },
    ],
  },
  secret_check: {
    title: "🔒 個人情報・API キー漏洩防止チェック＆対策ガイド",
    summary:
      "GitHub にコードを公開・更新する前に、API キーや個人情報が絶対に含まれないように確認・除外するためのセキュリティ手順です。",
    safety_checks: [
      {
        item: ".env / .env.local が Git の追跡対象から外れているか",
        why_important: "一度でも Push すると Git の履歴（コミットログ）に API キーが残ってしまいます。",
        how_to_fix: ".gitignore に `.env*` を追記し、`git status` に出ないことを確認します。",
      },
      {
        item: "ソースコード内に直接 API キー（AIza... / sk-...）をベタ書きしていないか",
        why_important: ".env を使っていても、テスト中にコードへ直書きしたキーが残っていると漏洩します。",
        how_to_fix: "`process.env.GEMINI_API_KEY` などの環境変数経由で読み込むように統一します。",
      },
    ],
    publish_steps: [
      {
        step_title: "ステージング前後の追跡ファイルをチェックする",
        command: "git status --ignored",
        meaning: ".env.local などが「Ignored files（無視されたファイル）」に入っているか確認します。",
      },
      {
        step_title: "コミット予定の差分に API キーが含まれていないか確認する",
        command: "git diff --cached",
        meaning: "git add した内容の中身をすべて表示し、秘密情報がないか最終確認します。",
      },
      {
        step_title: "【万が一】誤って git add した秘密ファイルを追跡解除する",
        command: "git rm --cached .env.local",
        meaning: "手元のファイルは消さずに、Git のアップロード対象からだけ安全に外します。",
      },
    ],
    common_errors: [
      {
        error_pattern: ".gitignore に書いたのに .env が git status に出続ける",
        recovery: "すでに一度 git add されているため、`git rm --cached .env` を実行してキャッシュから外してください。",
      },
      {
        error_pattern: "コード内に危険な書き方やハードコードがないか不安なとき",
        recovery: "CodePitfall Mirror（/codemistake）を使うと、コード内の危険パターンやミスを自動で点検できます。",
      },
    ],
    suggested_tasks: [
      {
        title: "git status --ignored で .env ファイルが無視されているか確認",
        priority: "high",
        memo: "Ignored files に .env.local があれば安全",
      },
      {
        title: "CodePitfall Mirror でコードの安全性をチェックする",
        priority: "high",
        memo: "/codemistake でコミット前診断を実行",
      },
    ],
  },
};

export default function GitBridge() {
  // Step 1 -> Step 2 Progressive Disclosure state
  const [selectedGoal, setSelectedGoal] = useState<GoalId | null>(null);

  // Optional sub-mode for update_push_pr ("publish_guide" by default, or "learn_repo" if user wants to read existing repo)
  const [subMode, setSubMode] = useState<"publish_guide" | "learn_repo">("publish_guide");
  const [repoUrl, setRepoUrl] = useState("");
  const [projectNote, setProjectNote] = useState("");

  // Quick interactive checklist for secret_check
  const [securityChecks, setSecurityChecks] = useState<Record<string, boolean>>({
    gitignore: false,
    noHardcode: false,
    gitStatus: false,
  });

  const [loading, setLoading] = useState(false);
  const [syncingGas, setSyncingGas] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [learnResult, setLearnResult] = useState<LearnResult | null>(null);
  const [publishResult, setPublishResult] = useState<PublishResult | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const activeGoal = GOAL_OPTIONS.find((g) => g.id === selectedGoal) ?? null;

  function handleSelectGoal(goal: GoalOption) {
    setSelectedGoal(goal.id);
    setSubMode("publish_guide");
    setRepoUrl("");
    setProjectNote("");
    setError(null);
    setNotice(null);
    setLearnResult(null);
    setPublishResult(null);
    setAnswers({});
  }

  function handleResetGoal() {
    setSelectedGoal(null);
    setSubMode("publish_guide");
    setRepoUrl("");
    setProjectNote("");
    setError(null);
    setNotice(null);
    setLearnResult(null);
    setPublishResult(null);
    setAnswers({});
  }

  function loadSample() {
    if (!activeGoal) return;
    setError(null);
    if (selectedGoal === "update_push_pr" && subMode === "learn_repo") {
      setRepoUrl("https://github.com/kotae-lab/google-ai-challenge-2026");
      setProjectNote("修正する前に、このリポジトリのコード構成と読む順番を把握したい");
    } else {
      setProjectNote(activeGoal.sampleNote);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedGoal || !activeGoal) return;

    setLoading(true);
    setError(null);
    setNotice(null);
    setAnswers({});

    const apiMode =
      selectedGoal === "update_push_pr" && subMode === "learn_repo"
        ? "learn_repo"
        : "publish_guide";

    const noteToSend =
      projectNote.trim() || activeGoal.sampleNote;

    try {
      const res = await fetch("/api/gitbridge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: apiMode,
          repoUrl,
          projectNote: `[やりたいこと: ${activeGoal.title}] ${noteToSend}`,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "AI ガイド生成に失敗しました。");
      }
      if (apiMode === "learn_repo") {
        setLearnResult(data.result as LearnResult);
        setPublishResult(null);
      } else {
        setPublishResult(data.result as PublishResult);
        setLearnResult(null);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "エラーが発生しました。";
      setError(msg);
      // Even when API errors happen, provide the built-in step-by-step guide so the user can proceed
      if (apiMode === "publish_guide") {
        setPublishResult(FALLBACK_GUIDES[selectedGoal]);
        setLearnResult(null);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy(text: string, idx: number) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    } catch {
      setError("コピーに失敗しました。");
    }
  }

  async function handleGasSync() {
    const active = learnResult || publishResult;
    if (!active) return;
    setSyncingGas(true);
    setError(null);
    setNotice(null);

    try {
      const summary = learnResult ? learnResult.repo_summary : publishResult?.summary ?? "";
      const res = await fetch("/api/gas-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic_title: `[GitBridge] ${active.title}`,
          summary,
          tasks: active.suggested_tasks ?? [],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Google Workspace 連携に失敗しました。");
      }
      setNotice(
        `学習ログを Google スプレッドシート（${data.addedRows ?? 0}行）と Google カレンダー（${data.addedEvents ?? 0}件）に記録しました！`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "GAS 連携中にエラーが発生しました。");
    } finally {
      setSyncingGas(false);
    }
  }

  return (
    <div className={styles.shell}>
      <nav className={styles.topNav} aria-label="アプリ切り替え">
        <div className={styles.topNavInner}>
          <div className={styles.brandGroup}>
            <span className={styles.brand}>🌉 GitBridge</span>
            <span className={styles.geminiBadge}>✦ はじめての GitHub 安全ナビ</span>
          </div>
          <div className={styles.navLinks}>
            <Link href="/" className={styles.navLink}>
              🏠 ホーム
            </Link>
            <Link href="/codemistake" className={styles.navLink}>
              🔍 CodePitfall Mirror
            </Link>
            <Link href="/otayori" className={styles.navLink}>
              🍊 おたよりバトン
            </Link>
            <Link href="/machieye" className={styles.navLink}>
              🛰️ MachiEye
            </Link>
          </div>
        </div>
      </nav>

      <main className={styles.container}>
        <span className={styles.categoryTag}>はたらく・まなぶ部門</span>
        <h1 className={styles.title}>
          コード初心者の「GitHub で公開・更新・安全チェック」AI ナビ
        </h1>
        <p className={styles.subtitle}>
          {selectedGoal === null
            ? "まずはやりたいことを1つ選んでください。選んだあとに必要な入力と手順だけを表示します。"
            : "状況を入力（またはサンプルを選択）すると、意味つきのコマンド手順と安全チェックを作成します。"}
        </p>

        {/* ============================================================
            STEP 1: INITIAL SCREEN — ONLY 3 BIG GOAL CARDS
           ============================================================ */}
        {selectedGoal === null && (
          <section
            aria-label="まずはやりたいことを選ぶ"
            style={{ marginTop: 12 }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 16,
              }}
            >
              <span
                style={{
                  background: "#1d4ed8",
                  color: "#ffffff",
                  fontSize: "0.76rem",
                  fontWeight: 800,
                  padding: "4px 11px",
                  borderRadius: 999,
                  letterSpacing: "0.04em",
                }}
              >
                STEP 1
              </span>
              <h2
                style={{
                  margin: 0,
                  fontSize: "1.22rem",
                  fontWeight: 800,
                  color: "#0f172a",
                }}
              >
                まずはやりたいことを選ぶ
              </h2>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 16,
              }}
            >
              {GOAL_OPTIONS.map((goal) => (
                <button
                  key={goal.id}
                  type="button"
                  onClick={() => handleSelectGoal(goal)}
                  style={{
                    textAlign: "left",
                    background: "#ffffff",
                    border: `2px solid ${goal.borderSoft}`,
                    borderRadius: 16,
                    padding: "22px 20px",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: 14,
                    boxShadow: "0 4px 16px rgba(15, 23, 42, 0.05)",
                    transition: "transform 0.15s ease, box-shadow 0.15s ease",
                  }}
                >
                  <div>
                    <span
                      style={{
                        display: "inline-block",
                        fontSize: "0.75rem",
                        fontWeight: 800,
                        color: goal.accentColor,
                        background: goal.bgSoft,
                        border: `1px solid ${goal.borderSoft}`,
                        padding: "3px 10px",
                        borderRadius: 999,
                        marginBottom: 12,
                      }}
                    >
                      {goal.badge}
                    </span>
                    <div
                      style={{
                        fontSize: "1.18rem",
                        fontWeight: 800,
                        color: "#0f172a",
                        lineHeight: 1.4,
                        marginBottom: 8,
                      }}
                    >
                      {goal.title}
                    </div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.9rem",
                        color: "#475569",
                        lineHeight: 1.6,
                      }}
                    >
                      {goal.description}
                    </p>
                  </div>

                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: "0.88rem",
                      fontWeight: 800,
                      color: goal.accentColor,
                    }}
                  >
                    <span>この手順へ進む →</span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ============================================================
            STEP 2: FOCUSED HELPER FOR THE SELECTED GOAL
           ============================================================ */}
        {selectedGoal !== null && activeGoal && (
          <div>
            {/* Back button & current goal header */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: 16,
                padding: "12px 16px",
                background: activeGoal.bgSoft,
                border: `1.5px solid ${activeGoal.borderSoft}`,
                borderRadius: 14,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={handleResetGoal}
                  className={styles.btn}
                  style={{
                    fontWeight: 800,
                    background: "#ffffff",
                    borderColor: "#cbd5e1",
                  }}
                >
                  ← やり直す
                </button>
                <div>
                  <div style={{ fontSize: "0.75rem", fontWeight: 800, color: activeGoal.accentColor }}>
                    STEP 2 · 選択中のやりたいこと
                  </div>
                  <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "#0f172a" }}>
                    {activeGoal.title}
                  </div>
                </div>
              </div>

              <Link
                href="/codemistake"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: "#ffffff",
                  color: "#1d4ed8",
                  border: "1px solid #bfdbfe",
                  padding: "7px 13px",
                  borderRadius: 999,
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                🔍 エラー・やりがちミス診断（CodePitfall へ）
              </Link>
            </div>

            {error && (
              <div className={styles.alertError}>
                <div style={{ marginBottom: 8 }}>
                  <strong>⚠ エラーが発生しました:</strong> {error}
                </div>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: 10,
                    fontSize: "0.85rem",
                  }}
                >
                  <span>
                    コードのエラーやコミット前のつまずきは、専用ツールで原因を診断できます：
                  </span>
                  <Link
                    href="/codemistake"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      background: "#ffffff",
                      color: "#b91c1c",
                      border: "1px solid #fca5a5",
                      padding: "4px 11px",
                      borderRadius: 999,
                      fontWeight: 800,
                      textDecoration: "none",
                    }}
                  >
                    🔍 CodePitfall Mirror（/codemistake）でエラーを調べる →
                  </Link>
                </div>
              </div>
            )}

            {notice && <div className={styles.alertSuccess}>{notice}</div>}

            {/* Focused Input Card for the Selected Goal */}
            <section className={styles.card}>
              <div className={styles.toolbar}>
                <h2 className={styles.cardTitle}>
                  {selectedGoal === "first_publish" &&
                    "公開したいプロジェクトの状況を教えてください"}
                  {selectedGoal === "update_push_pr" &&
                    "更新したい内容（または読み解きたいリポジトリ）を入力"}
                  {selectedGoal === "secret_check" &&
                    "公開前のセキュリティ自己点検 ＆ 相談内容を入力"}
                </h2>
                <button type="button" className={styles.btn} onClick={loadSample}>
                  ✨ サンプルを入力
                </button>
              </div>

              {/* Goal 2 optional sub-toggle: Update Commands vs Read Existing Repo */}
              {selectedGoal === "update_push_pr" && (
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    marginBottom: 14,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setSubMode("publish_guide")}
                    className={styles.btn}
                    style={{
                      background: subMode === "publish_guide" ? "#eff6ff" : "#ffffff",
                      borderColor: subMode === "publish_guide" ? "#2563eb" : "#cbd5e1",
                      color: subMode === "publish_guide" ? "#1d4ed8" : "#475569",
                      fontWeight: 700,
                    }}
                  >
                    🔄 修正コードの Commit / Push / PR 手順を作る
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubMode("learn_repo")}
                    className={styles.btn}
                    style={{
                      background: subMode === "learn_repo" ? "#eff6ff" : "#ffffff",
                      borderColor: subMode === "learn_repo" ? "#2563eb" : "#cbd5e1",
                      color: subMode === "learn_repo" ? "#1d4ed8" : "#475569",
                      fontWeight: 700,
                    }}
                  >
                    📖 既存 GitHub リポジトリの読む順番・構造を調べる
                  </button>
                </div>
              )}

              {/* Goal 3 quick interactive 3-point checklist */}
              {selectedGoal === "secret_check" && (
                <div
                  style={{
                    background: "#fffbeb",
                    border: "1px solid #fde68a",
                    borderRadius: 12,
                    padding: "14px 16px",
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: "0.9rem",
                      color: "#92400e",
                      marginBottom: 10,
                    }}
                  >
                    🔒 まずは3秒セルフチェック（タップして確認）
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {[
                      {
                        key: "gitignore",
                        label: ".gitignore ファイルに「.env」や「.env.local」が書かれている",
                      },
                      {
                        key: "noHardcode",
                        label: "ソースコードの中に直接 API キー（AIza... や sk-...）を書き込んでいない",
                      },
                      {
                        key: "gitStatus",
                        label: "個人情報（本名入りのパス・電話番号・テスト用顧客データ）が含まれていない",
                      },
                    ].map((item) => (
                      <label
                        key={item.key}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          fontSize: "0.88rem",
                          fontWeight: 600,
                          color: "#1e293b",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(securityChecks[item.key])}
                          onChange={() =>
                            setSecurityChecks((prev) => ({
                              ...prev,
                              [item.key]: !prev[item.key],
                            }))
                          }
                        />
                        <span>{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                {selectedGoal === "update_push_pr" && subMode === "learn_repo" && (
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="repo-url">
                      GitHub リポジトリ URL
                    </label>
                    <input
                      id="repo-url"
                      className={styles.input}
                      type="text"
                      placeholder="https://github.com/owner/repo"
                      value={repoUrl}
                      onChange={(e) => setRepoUrl(e.target.value)}
                    />
                  </div>
                )}

                <div className={styles.field}>
                  <label className={styles.label} htmlFor="project-note">
                    {selectedGoal === "first_publish" &&
                      "どんなプロジェクトですか？（不安な点や使っている環境など）"}
                    {selectedGoal === "update_push_pr" &&
                      (subMode === "learn_repo"
                        ? "知りたいポイント・修正したい箇所（任意）"
                        : "今回修正した内容や、Push / PR でやりたいこと")}
                    {selectedGoal === "secret_check" &&
                      "現在のファイル状況や不安なこと（未入力でも基本チェック手順を生成できます）"}
                  </label>
                  <textarea
                    id="project-note"
                    className={styles.textarea}
                    rows={3}
                    placeholder={activeGoal.placeholder}
                    value={projectNote}
                    onChange={(e) => setProjectNote(e.target.value)}
                  />
                </div>

                <div className={styles.actions}>
                  <button
                    type="submit"
                    className={`${styles.btn} ${styles.btnPrimary}`}
                    disabled={loading}
                  >
                    {loading
                      ? "AI がステップガイドを作成中..."
                      : selectedGoal === "update_push_pr" && subMode === "learn_repo"
                      ? "📖 コードの歩き方マップを生成"
                      : activeGoal.buttonLabel}
                  </button>
                </div>
              </form>
            </section>

            {/* Result for Learn Repo */}
            {learnResult && (
              <section className={styles.card}>
                <div className={styles.toolbar}>
                  <div>
                    <h2 className={styles.cardTitle}>{learnResult.title}</h2>
                    <p className={styles.subtitle} style={{ margin: "4px 0 0" }}>
                      {learnResult.repo_summary}
                    </p>
                  </div>
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnPrimary}`}
                    disabled={syncingGas}
                    onClick={handleGasSync}
                  >
                    {syncingGas ? "送信中..." : "Google カレンダー / シートへ記録 (GAS)"}
                  </button>
                </div>

                <div className={styles.section}>
                  <h3>1. 初心者向け コードの歩き方（読む順番）</h3>
                  <div className={styles.grid}>
                    {learnResult.reading_order.map((item, idx) => (
                      <div key={idx} className={styles.subCard}>
                        <strong>
                          Step {idx + 1}: {item.file_path}
                        </strong>
                        <p style={{ margin: "6px 0", fontSize: "0.88rem" }}>{item.role}</p>
                        <p style={{ margin: 0, fontSize: "0.84rem", color: "#1d4ed8" }}>
                          ポイント: {item.beginner_tip}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={styles.section}>
                  <h3>2. このコードから学べる重要キーワード</h3>
                  <div className={styles.grid}>
                    {learnResult.key_concepts.map((c, idx) => (
                      <div key={idx} className={styles.subCard}>
                        <strong>{c.term}</strong>
                        <p style={{ margin: "6px 0 0", fontSize: "0.88rem" }}>
                          {c.plain_explanation}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={styles.section}>
                  <h3>3. 理解度チェッククイズ</h3>
                  {learnResult.quiz.map((q, qIdx) => {
                    const picked = answers[qIdx];
                    return (
                      <div key={qIdx} className={styles.subCard} style={{ marginBottom: 10 }}>
                        <strong>
                          Q{qIdx + 1}. {q.question}
                        </strong>
                        <div className={styles.quizChoices}>
                          {q.choices.map((ch, cIdx) => {
                            const isCorrect =
                              picked !== undefined && cIdx === q.correct_index;
                            const isWrong =
                              picked === cIdx && cIdx !== q.correct_index;
                            return (
                              <button
                                key={cIdx}
                                type="button"
                                className={`${styles.quizChoice} ${
                                  isCorrect ? styles.quizChoiceCorrect : ""
                                } ${isWrong ? styles.quizChoiceWrong : ""}`}
                                onClick={() =>
                                  setAnswers((prev) => ({ ...prev, [qIdx]: cIdx }))
                                }
                              >
                                {ch}
                              </button>
                            );
                          })}
                        </div>
                        {picked !== undefined && (
                          <p style={{ margin: "8px 0 0", fontSize: "0.86rem" }}>
                            <strong>
                              {picked === q.correct_index ? "正解！" : "解説:"}
                            </strong>{" "}
                            {q.explanation}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Result for Publish / Update / Secret Check */}
            {publishResult && (
              <section className={styles.card}>
                <div className={styles.toolbar}>
                  <div>
                    <h2 className={styles.cardTitle}>{publishResult.title}</h2>
                    <p className={styles.subtitle} style={{ margin: "4px 0 0" }}>
                      {publishResult.summary}
                    </p>
                  </div>
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnPrimary}`}
                    disabled={syncingGas}
                    onClick={handleGasSync}
                  >
                    {syncingGas ? "送信中..." : "Google カレンダー / シートへ記録 (GAS)"}
                  </button>
                </div>

                <div className={styles.section}>
                  <h3>1. 公開・更新前の安全チェック（秘密情報漏れ防止）</h3>
                  <div className={styles.grid}>
                    {publishResult.safety_checks.map((s, idx) => (
                      <div key={idx} className={styles.safetyCard}>
                        <strong>⚠ {s.item}</strong>
                        <p style={{ margin: "6px 0", fontSize: "0.86rem" }}>
                          {s.why_important}
                        </p>
                        <p style={{ margin: 0, fontSize: "0.84rem", color: "#92400e" }}>
                          対策: {s.how_to_fix}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={styles.section}>
                  <h3>2. 実行ステップ（意味つきコマンド）</h3>
                  {publishResult.publish_steps.map((st, idx) => (
                    <div key={idx} className={styles.subCard} style={{ marginBottom: 10 }}>
                      <strong>
                        Step {idx + 1}: {st.step_title}
                      </strong>
                      <div className={styles.codeBox}>
                        <code>{st.command}</code>
                        <button
                          type="button"
                          className={styles.copyBtn}
                          onClick={() => handleCopy(st.command, idx)}
                        >
                          {copiedIdx === idx ? "コピー済み" : "コピー"}
                        </button>
                      </div>
                      <p style={{ margin: 0, fontSize: "0.86rem", color: "#475569" }}>
                        {st.meaning}
                      </p>
                    </div>
                  ))}
                </div>

                <div className={styles.section}>
                  <h3>3. エラーが起きたときの対処法 ＆ コード診断</h3>
                  <div className={styles.grid}>
                    {publishResult.common_errors.map((e, idx) => (
                      <div key={idx} className={styles.subCard}>
                        <strong>{e.error_pattern}</strong>
                        <p style={{ margin: "6px 0 0", fontSize: "0.86rem" }}>
                          {e.recovery}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div
                    style={{
                      marginTop: 12,
                      padding: "12px 14px",
                      borderRadius: 10,
                      background: "#eff6ff",
                      border: "1px solid #bfdbfe",
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                    }}
                  >
                    <span style={{ fontSize: "0.86rem", fontWeight: 700, color: "#1e3a8a" }}>
                      💡 エラーが解決しないときや、コミット前にコードのミス・危険箇所を調べたいときは：
                    </span>
                    <Link
                      href="/codemistake"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        background: "#2563eb",
                        color: "#ffffff",
                        padding: "7px 14px",
                        borderRadius: 8,
                        fontSize: "0.84rem",
                        fontWeight: 800,
                        textDecoration: "none",
                      }}
                    >
                      🔍 CodePitfall Mirror（/codemistake）へ進む →
                    </Link>
                  </div>
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
