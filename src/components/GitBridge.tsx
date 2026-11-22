"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import styles from "./GitBridge.module.css";

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

const FALLBACK_PUBLISH_GUIDE: PublishResult = {
  title: "🌉 GitHub 安全公開・更新ステップガイド",
  summary:
    "手元のプロジェクトを秘密情報（.env など）を守りながら Git で記録し、GitHub リポジトリへ安全に公開・更新するための基本手順です。",
  safety_checks: [
    {
      item: ".gitignore に .env* が含まれているか確認",
      why_important: "API キーやパスワードをそのまま公開すると悪用・課金被害につながります。",
      how_to_fix: ".gitignore ファイルに `.env` と `.env.local` が書かれているか確認しましょう。",
    },
    {
      item: "git status / git diff で公開されるファイルと差分を確認",
      why_important: "意図しない設定ファイルや個人メモ、仮の API キーが混ざるのを防ぎます。",
      how_to_fix: "`git status` と `git diff` を実行し、秘密情報が含まれていないことを確認します。",
    },
  ],
  publish_steps: [
    {
      step_title: "Git の状態と無視設定を確認",
      command: "git status --ignored",
      meaning: "変更されたファイル一覧と、.env.local などが無視対象になっているか確認します。",
    },
    {
      step_title: "ファイルをステージングしてコミットを作成",
      command: 'git add . && git commit -m "Update project"',
      meaning: "変更ファイルをまとめて、セーブポイント（コミット）を作ります。",
    },
    {
      step_title: "GitHub リポジトリへ Push（公開・更新）",
      command: "git push -u origin main",
      meaning: "手元のコミットを GitHub のリポジトリへアップロードします。",
    },
  ],
  common_errors: [
    {
      error_pattern: "rejected - non-fast-forward（Push が拒否された）",
      recovery:
        "リモートに新しい変更があるため、`git pull --rebase origin main` で最新を取り込んでから Push します。",
    },
    {
      error_pattern: "ビルドエラーやコードのバグで動かないとき",
      recovery:
        "CodePitfall Mirror（/codemistake）にエラーログを貼って、原因と直し方を診断してください。",
    },
  ],
  suggested_tasks: [
    {
      title: ".gitignore に .env.local が入っているか確認する",
      priority: "high",
      memo: "git status で .env.local が出ないことを確認",
    },
    {
      title: "README.md にアプリの概要と使い方を記載する",
      priority: "medium",
      memo: "見る人がすぐに動かせるように手順を記載",
    },
  ],
};

export default function GitBridge() {
  const [projectNote, setProjectNote] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [showRepoUrlInput, setShowRepoUrlInput] = useState(false);

  const [loading, setLoading] = useState(false);
  const [syncingGas, setSyncingGas] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [learnResult, setLearnResult] = useState<LearnResult | null>(null);
  const [publishResult, setPublishResult] = useState<PublishResult | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  function loadOneExample() {
    setError(null);
    setProjectNote(
      "初めて Next.js アプリを作りました。.env.local に API キーが入っています。API キーを漏らさずに GitHub へ安全に公開する手順を教えてください。"
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!projectNote.trim() && !repoUrl.trim()) {
      setError("やりたいことや現在の状況を入力してください。");
      return;
    }

    setLoading(true);
    setError(null);
    setNotice(null);
    setAnswers({});

    const apiMode =
      showRepoUrlInput && repoUrl.trim() ? "learn_repo" : "publish_guide";

    try {
      const res = await fetch("/api/gitbridge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: apiMode,
          repoUrl: repoUrl.trim(),
          projectNote: projectNote.trim(),
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
      if (apiMode === "publish_guide") {
        setPublishResult(FALLBACK_PUBLISH_GUIDE);
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
      const summary = learnResult
        ? learnResult.repo_summary
        : publishResult?.summary ?? "";
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
      setError(
        err instanceof Error ? err.message : "GAS 連携中にエラーが発生しました。"
      );
    } finally {
      setSyncingGas(false);
    }
  }

  return (
    <div className={styles.shell}>
      <nav className={styles.topNav} aria-label="GitBridge ナビゲーション">
        <div className={styles.topNavInner}>
          <div className={styles.brandGroup}>
            <span className={styles.brand}>🌉 GitBridge</span>
            <span className={styles.geminiBadge}>✦ はじめての GitHub 安全ナビ</span>
          </div>
          <div className={styles.navLinks}>
            <Link href="/codemistake" className={styles.navLink}>
              🔍 エラー診断（CodePitfall）
            </Link>
          </div>
        </div>
      </nav>

      <main className={styles.container}>
        <span className={styles.categoryTag}>はたらく・まなぶ部門</span>
        <h1 className={styles.title}>
          GitHub 公開・更新・秘密情報チェックの AI ステップナビ
        </h1>
        <p className={styles.subtitle}>
          今の状況ややりたいことを入力すると、秘密情報（.env など）の漏れを防ぐチェックと意味つきの Git コマンド手順を作成します。
        </p>

        {error && (
          <div className={styles.alertError}>
            <div style={{ marginBottom: 8 }}>
              <strong>⚠ 確認:</strong> {error}
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

        {/* Single Clean Focused Input Card */}
        <section className={styles.card}>
          <form onSubmit={handleSubmit}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="project-note">
                GitHub でやりたいこと・今のプロジェクト状況
              </label>
              <textarea
                id="project-note"
                className={styles.textarea}
                rows={4}
                placeholder="例：初めてアプリを GitHub に公開したい / 修正したコードを安全に Push・PR したい / .env の API キーが漏れていないか確認したい"
                value={projectNote}
                onChange={(e) => setProjectNote(e.target.value)}
              />
            </div>

            {showRepoUrlInput && (
              <div className={styles.field} style={{ marginTop: 12 }}>
                <label className={styles.label} htmlFor="repo-url">
                  読み解きたい GitHub リポジトリ URL（任意）
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

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                marginTop: 14,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={loadOneExample}
                  style={{
                    background: "transparent",
                    border: "none",
                    padding: 0,
                    color: "#64748b",
                    fontSize: "0.82rem",
                    textDecoration: "underline",
                    cursor: "pointer",
                  }}
                >
                  例を1つ試す
                </button>
                <button
                  type="button"
                  onClick={() => setShowRepoUrlInput((prev) => !prev)}
                  style={{
                    background: "transparent",
                    border: "none",
                    padding: 0,
                    color: "#64748b",
                    fontSize: "0.82rem",
                    textDecoration: "underline",
                    cursor: "pointer",
                  }}
                >
                  {showRepoUrlInput
                    ? "－ リポジトリURL欄を閉じる"
                    : "＋ 既存リポジトリのURLを指定して構造を読む（任意）"}
                </button>
                {(projectNote || repoUrl) && (
                  <button
                    type="button"
                    onClick={() => {
                      setProjectNote("");
                      setRepoUrl("");
                      setLearnResult(null);
                      setPublishResult(null);
                      setError(null);
                      setNotice(null);
                    }}
                    style={{
                      background: "transparent",
                      border: "none",
                      padding: 0,
                      color: "#94a3b8",
                      fontSize: "0.82rem",
                      cursor: "pointer",
                    }}
                  >
                    クリア
                  </button>
                )}
              </div>

              <button
                type="submit"
                className={`${styles.btn} ${styles.btnPrimary}`}
                disabled={loading}
              >
                {loading
                  ? "AI がステップガイドを作成中..."
                  : "✨ GitHub 手順＆安全チェックを作成"}
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
                  💡 エラーが解決しないときや、コミット前にエラーログを調べたいときは：
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
      </main>
    </div>
  );
}
