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

export default function GitBridge() {
  const [mode, setMode] = useState<"learn_repo" | "publish_guide">("learn_repo");
  const [repoUrl, setRepoUrl] = useState("");
  const [projectNote, setProjectNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [syncingGas, setSyncingGas] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [learnResult, setLearnResult] = useState<LearnResult | null>(null);
  const [publishResult, setPublishResult] = useState<PublishResult | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  function loadSample() {
    if (mode === "learn_repo") {
      setRepoUrl("https://github.com/kotae-lab/google-ai-challenge-2026");
      setProjectNote("Next.js と Gemini API をどう連携しているか初心者向けに順番に学びたい");
    } else {
      setProjectNote(
        "初めて Next.js アプリを作りました。.env.local に GEMINI_API_KEY が入っています。API キーを漏らさずに GitHub へ公開して URL を共有する手順を教えてください。"
      );
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);
    setAnswers({});

    try {
      const res = await fetch("/api/gitbridge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, repoUrl, projectNote }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "解析に失敗しました。");
      }
      if (mode === "learn_repo") {
        setLearnResult(data.result as LearnResult);
        setPublishResult(null);
      } else {
        setPublishResult(data.result as PublishResult);
        setLearnResult(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました。");
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
            <span className={styles.brand}>GitBridge</span>
            <span className={styles.geminiBadge}>✦ Google Gemini 3.8 Flash + GitHub Learning</span>
          </div>
          <div className={styles.navLinks}>
            <Link href="/codemistake" className={styles.navLink}>
              🔍 CodePitfall Mirror
            </Link>
            <Link href="/" className={styles.navLink}>
              GapTutor
            </Link>
            <Link href="/otayori" className={styles.navLink}>
              おたよりバトン
            </Link>
            <Link href="/machieye" className={styles.navLink}>
              MachiEye
            </Link>
          </div>
        </div>
      </nav>

      <main className={styles.container}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            marginBottom: 8,
          }}
        >
          <span className={styles.categoryTag} style={{ marginBottom: 0 }}>
            はたらく・まなぶ部門
          </span>
          <Link
            href="/codemistake"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "#eff6ff",
              color: "#1d4ed8",
              border: "1px solid #bfdbfe",
              padding: "6px 14px",
              borderRadius: 999,
              fontSize: "0.82rem",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            🔍 コミット前にやりがちミスをチェック（CodePitfall Mirror へ）
          </Link>
        </div>
        <h1 className={styles.title}>コード初心者の「GitHub で学ぶ・安全にアップする」AI ナビ</h1>
        <p className={styles.subtitle}>
          公開リポジトリの読む順番・用語・クイズを自動生成し、API キー漏れを防ぐ初めての GitHub 公開まで伴走します。
        </p>

        <div className={styles.modeTabs}>
          <button
            type="button"
            className={`${styles.modeBtn} ${mode === "learn_repo" ? styles.modeBtnActive : ""}`}
            onClick={() => setMode("learn_repo")}
          >
            <div className={styles.modeTitle}>① GitHub からコードを学ぶ</div>
            <div className={styles.modeSub}>URL を貼るだけで読む順番・用語解説・クイズを生成</div>
          </button>
          <button
            type="button"
            className={`${styles.modeBtn} ${mode === "publish_guide" ? styles.modeBtnActive : ""}`}
            onClick={() => setMode("publish_guide")}
          >
            <div className={styles.modeTitle}>② 初めての GitHub 公開ガイド</div>
            <div className={styles.modeSub}>API キー漏れ防止チェック＋意味つきコマンド手順を生成</div>
          </button>
        </div>

        {error && <div className={styles.alertError}>{error}</div>}
        {notice && <div className={styles.alertSuccess}>{notice}</div>}

        <section className={styles.card}>
          <div className={styles.toolbar}>
            <h2 className={styles.cardTitle}>
              {mode === "learn_repo"
                ? "学びたい GitHub リポジトリを入力"
                : "GitHub にアップしたいプロジェクトを説明"}
            </h2>
            <button type="button" className={styles.btn} onClick={loadSample}>
              ✨ サンプルを入力
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {mode === "learn_repo" && (
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
                {mode === "learn_repo"
                  ? "知りたいポイント・疑問（任意）"
                  : "プロジェクト構成や不安なこと（例: .env がある、初めて push する）"}
              </label>
              <textarea
                id="project-note"
                className={styles.textarea}
                rows={3}
                value={projectNote}
                onChange={(e) => setProjectNote(e.target.value)}
              />
            </div>

            <div className={styles.actions}>
              <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={loading}>
                {loading
                  ? "Gemini 3.8 Flash がガイド生成中..."
                  : mode === "learn_repo"
                  ? "コードの歩き方マップを生成"
                  : "安全な GitHub 公開手順を生成"}
              </button>
            </div>
          </form>
        </section>

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
                    <p style={{ margin: "6px 0 0", fontSize: "0.88rem" }}>{c.plain_explanation}</p>
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
                        const isCorrect = picked !== undefined && cIdx === q.correct_index;
                        const isWrong = picked === cIdx && cIdx !== q.correct_index;
                        return (
                          <button
                            key={cIdx}
                            type="button"
                            className={`${styles.quizChoice} ${
                              isCorrect ? styles.quizChoiceCorrect : ""
                            } ${isWrong ? styles.quizChoiceWrong : ""}`}
                            onClick={() => setAnswers((prev) => ({ ...prev, [qIdx]: cIdx }))}
                          >
                            {ch}
                          </button>
                        );
                      })}
                    </div>
                    {picked !== undefined && (
                      <p style={{ margin: "8px 0 0", fontSize: "0.86rem" }}>
                        <strong>{picked === q.correct_index ? "正解！" : "解説:"}</strong>{" "}
                        {q.explanation}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

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
              <h3>1. 公開前の安全チェック（秘密情報漏れ防止）</h3>
              <div className={styles.grid}>
                {publishResult.safety_checks.map((s, idx) => (
                  <div key={idx} className={styles.safetyCard}>
                    <strong>⚠ {s.item}</strong>
                    <p style={{ margin: "6px 0", fontSize: "0.86rem" }}>{s.why_important}</p>
                    <p style={{ margin: 0, fontSize: "0.84rem", color: "#92400e" }}>
                      対策: {s.how_to_fix}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.section}>
              <h3>2. GitHub 公開ステップ（意味つきコマンド）</h3>
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
                  <p style={{ margin: 0, fontSize: "0.86rem", color: "#475569" }}>{st.meaning}</p>
                </div>
              ))}
            </div>

            <div className={styles.section}>
              <h3>3. つまずきやすいエラー対処法</h3>
              <div className={styles.grid}>
                {publishResult.common_errors.map((e, idx) => (
                  <div key={idx} className={styles.subCard}>
                    <strong>{e.error_pattern}</strong>
                    <p style={{ margin: "6px 0 0", fontSize: "0.86rem" }}>{e.recovery}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
