"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useState } from "react";
import { StudyAnalysis, StudySession } from "@/types/study";

interface StudyTutorProps {
  onTasksCreated?: () => void;
}

const SAMPLE_TEXT = `ベイズの定理: P(A|B) = P(B|A) * P(A) / P(B)
事前確率 P(A) と尤度 P(B|A) から事後確率 P(A|B) を更新する式。
特に分母の P(B) = Σ P(B|A_i)P(A_i)（周辺尤度）の意味が直感的にピンとこない。`;

const PRIORITY_LABEL: Record<string, string> = {
  high: "高",
  medium: "中",
  low: "低",
};

const CHOICE_LETTERS = ["A", "B", "C", "D", "E", "F"];

const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB（送信前に縮小するため入力上限は緩め）
const MAX_IMAGE_EDGE = 1600;

type Provider = "gemini" | "ollama" | "xestrata";
type GeminiModel = "gemini-3.8-flash" | "gemini-4-hydrogen";

const PROVIDERS: { id: Provider; name: string; desc: string; local: boolean }[] = [
  { id: "gemini", name: "Gemini", desc: "手書きノート／画像解析・構造化出力", local: false },
  { id: "ollama", name: "Ollama", desc: "127.0.0.1:11434・テキスト／オフライン", local: true },
  { id: "xestrata", name: "XeStrata", desc: "127.0.0.1:8080・機密ノート向け", local: true },
];

const GEMINI_MODELS: { id: GeminiModel; label: string }[] = [
  { id: "gemini-3.8-flash", label: "gemini-3.8-flash（推奨・高速）" },
  { id: "gemini-4-hydrogen", label: "gemini-4-hydrogen" },
];

// /api/analyze の error code → ユーザー向けの次アクション
const ERROR_HINTS: Record<string, string> = {
  RATE_LIMITED: "Gemini の利用上限に達しました。少し待つか、ローカルの Ollama に切り替えてください。",
  UPSTREAM_TIMEOUT: "AI の応答がタイムアウトしました。入力を短くするか、もう一度お試しください。",
  UPSTREAM_UNREACHABLE: "AI サーバーに接続できません。ローカル LLM の場合はサーバーが起動しているか確認してください。",
  IMAGE_UNSUPPORTED_LOCAL: "ローカル LLM は画像に対応していません。Gemini を選択するか、テキストで入力してください。",
  MISSING_API_KEY: "API キーが未設定です。.env.local を確認してください。",
  MISSING_INPUT: "テキストまたは画像のどちらかを入力してください。",
  INVALID_AI_OUTPUT: "AI の出力を解釈できませんでした。もう一度生成してください。",
};

function formatDate(value?: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function StudyTutor({ onTasksCreated }: StudyTutorProps) {
  const [provider, setProvider] = useState<Provider>("gemini");
  const [geminiModel, setGeminiModel] = useState<GeminiModel>("gemini-3.8-flash");
  const [usedModel, setUsedModel] = useState<string | null>(null);
  const [sourceText, setSourceText] = useState("");
  const [question, setQuestion] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState("");
  const [imageMimeType, setImageMimeType] = useState("");

  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncingGas, setSyncingGas] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [analysis, setAnalysis] = useState<StudyAnalysis | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [highlightedPrereq, setHighlightedPrereq] = useState<number | null>(null);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [tasksRegistered, setTasksRegistered] = useState(false);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/study-sessions", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setSessions(data.sessions ?? []);
    } catch {
      // 履歴取得失敗時はサイレントに無視
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  function clearImage() {
    setImagePreview(null);
    setImageBase64("");
    setImageMimeType("");
  }

  function handleImageChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      clearImage();
      return;
    }

    // プリフライトチェック: 形式とサイズ（デモ中の失敗を防ぐ）
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      clearImage();
      e.target.value = "";
      setError("対応していない画像形式です。PNG / JPEG / WebP の画像を選択してください。");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      clearImage();
      e.target.value = "";
      setError(
        `画像サイズが大きすぎます（${(file.size / 1024 / 1024).toFixed(1)} MB）。${
          MAX_IMAGE_BYTES / 1024 / 1024
        } MB 以下の画像を選択してください。`
      );
      return;
    }
    setError(null);

    const reader = new FileReader();
    reader.onerror = () => {
      clearImage();
      setError("画像の読み込みに失敗しました。別の画像でお試しください。");
    };
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      // 大きな写真は送信前に長辺 MAX_IMAGE_EDGE px の JPEG へ縮小（API のボディ上限・速度対策）
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(img.width, img.height));
        let dataUrl = result;
        let mime = file.type || "image/png";
        if (scale < 1 || file.size > 1.5 * 1024 * 1024) {
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            dataUrl = canvas.toDataURL("image/jpeg", 0.88);
            mime = "image/jpeg";
          }
        }
        const [, base64] = dataUrl.split(",");
        setImagePreview(dataUrl);
        setImageBase64(base64 ?? "");
        setImageMimeType(mime);
      };
      img.onerror = () => {
        clearImage();
        setError("画像を解釈できませんでした。PNG / JPEG / WebP の画像を選択してください。");
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  }

  async function handleAnalyze(e: FormEvent) {
    e.preventDefault();
    setAnalyzing(true);
    setError(null);
    setNotice(null);
    setSelectedAnswers({});
    setHighlightedPrereq(null);
    setTasksRegistered(false);

    try {
      const isLocal = provider !== "gemini";
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          ...(isLocal ? {} : { geminiModel }),
          sourceText,
          question,
          // ローカル LLM は画像非対応のため、テキストのみ送信
          imageBase64: isLocal ? "" : imageBase64,
          imageMimeType: isLocal ? "" : imageMimeType,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const hint = data.code ? ERROR_HINTS[data.code] : undefined;
        throw new Error(
          [data.error || "解析に失敗しました。", hint].filter(Boolean).join(" ")
        );
      }
      setAnalysis(data.analysis);
      setUsedModel(
        typeof data.usedModel === "string"
          ? `${data.usedProvider ?? provider} · ${data.usedModel}`
          : null
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "解析中にエラーが発生しました。");
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleSaveToNeon(registerTasks: boolean) {
    if (!analysis) return;
    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const res = await fetch("/api/study-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysis,
          sourceText,
          registerTasks,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Neon への保存に失敗しました。");
      }
      setNotice(
        registerTasks
          ? `学習ログを保存し、復習タスクを ${data.createdTaskCount ?? 0} 件「学習タスク管理」に登録しました。`
          : "学習ログを Neon に保存しました。"
      );
      if (registerTasks) setTasksRegistered(true);
      await fetchSessions();
      if (registerTasks && onTasksCreated) {
        onTasksCreated();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存中にエラーが発生しました。");
    } finally {
      setSaving(false);
    }
  }

  async function handleSyncToGas() {
    if (!analysis) return;
    setSyncingGas(true);
    setError(null);
    setNotice(null);

    try {
      const res = await fetch("/api/gas-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic_title: analysis.topic_title,
          summary: analysis.summary,
          tasks: analysis.suggested_tasks,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Google Apps Script 連携に失敗しました。");
      }
      setNotice(
        `Google Workspace に連携しました（スプレッドシート記録: ${data.addedRows ?? 0} 行 / カレンダー予定: ${data.addedEvents ?? 0} 件）。`
      );
      setTasksRegistered(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "GAS 連携中にエラーが発生しました。");
    } finally {
      setSyncingGas(false);
    }
  }

  async function handleAddFocusTask(concept: string, quickRefresher: string) {
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `【前提補強】${concept}`,
          status: "todo",
          priority: "high",
          memo: quickRefresher,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "復習タスクの登録に失敗しました。");
      }
      setNotice(`前提知識「${concept}」を優先度「高」の復習タスクとして Neon に登録しました。`);
      setTasksRegistered(true);
      if (onTasksCreated) {
        onTasksCreated();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "タスク登録中にエラーが発生しました。");
    }
  }

  // --- 進捗・スコア計算 ---
  const quizTotal = analysis?.quiz.length ?? 0;
  const answeredCount = analysis
    ? analysis.quiz.filter((_, i) => selectedAnswers[i] !== undefined).length
    : 0;
  const correctCount = analysis
    ? analysis.quiz.filter((q, i) => selectedAnswers[i] === q.correct_index).length
    : 0;
  const allAnswered = quizTotal > 0 && answeredCount === quizTotal;
  const scorePct = quizTotal > 0 ? Math.round((correctCount / quizTotal) * 100) : 0;
  const weakPrereqs = analysis
    ? Array.from(
        new Set(
          analysis.quiz
            .map((q, i) =>
              selectedAnswers[i] !== undefined &&
              selectedAnswers[i] !== q.correct_index &&
              typeof q.related_prerequisite_index === "number"
                ? q.related_prerequisite_index
                : null
            )
            .filter((v): v is number => v !== null && !!analysis.prerequisites[v])
        )
      )
    : [];

  const hasInput = sourceText.trim().length > 0 || !!imageBase64;
  const flowSteps = [
    { label: "入力", sub: "数式・ノート", done: hasInput || !!analysis, active: !analysis },
    { label: "診断", sub: "前提ギャップ", done: !!analysis, active: analyzing },
    {
      label: "演習",
      sub: "理解度チェック",
      done: allAnswered,
      active: !!analysis && !allAnswered,
    },
    {
      label: "定着",
      sub: "Neon / Google",
      done: tasksRegistered,
      active: allAnswered && !tasksRegistered,
    },
  ];

  const scoreTone = scorePct >= 80 ? "great" : scorePct >= 50 ? "good" : "low";

  return (
    <div className="study-tutor">
      <ol className="flow-stepper" aria-label="学習フロー">
        {flowSteps.map((s, i) => (
          <li
            key={s.label}
            className={`flow-step ${s.done ? "is-done" : ""} ${
              s.active && !s.done ? "is-active" : ""
            }`}
          >
            <span className="flow-dot">{s.done ? "✓" : i + 1}</span>
            <span className="flow-text">
              <span className="flow-label">{s.label}</span>
              <span className="flow-sub">{s.sub}</span>
            </span>
          </li>
        ))}
      </ol>

      {error && (
        <div className="alert-error" role="alert">
          <strong>エラー:</strong> {error}
        </div>
      )}
      {notice && (
        <div className="alert-success" role="status">
          <span className="alert-icon" aria-hidden="true">
            ✓
          </span>
          {notice}
        </div>
      )}

      <section className="card card-input">
        <div className="toolbar">
          <div className="section-head">
            <span className="step-badge">STEP 1</span>
            <h2 className="card-title" style={{ margin: 0 }}>
              数式・論文・専門書を解析する
            </h2>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={() => {
              setSourceText(SAMPLE_TEXT);
              setQuestion("周辺尤度 P(B) がなぜ分母に来るのか、具体例で知りたい");
            }}
          >
            ✨ サンプルを入力
          </button>
        </div>

        <form onSubmit={handleAnalyze}>
          <div className="form-field" style={{ marginBottom: 14 }}>
            <span className="field-label" id="ai-provider-label">
              使用する AI エンジン
            </span>
            <div className="provider-toggle" role="radiogroup" aria-labelledby="ai-provider-label">
              {PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={provider === p.id}
                  className={`provider-option ${provider === p.id ? "is-active" : ""}`}
                  onClick={() => setProvider(p.id)}
                >
                  <span className="provider-name">
                    {p.name}
                    <span className={`provider-tag ${p.local ? "is-local" : ""}`}>
                      {p.local ? "LOCAL" : "CLOUD"}
                    </span>
                  </span>
                  <span className="provider-desc">{p.desc}</span>
                </button>
              ))}
            </div>
            {provider === "gemini" && (
              <div className="model-row">
                <label htmlFor="gemini-model">Gemini モデル</label>
                <select
                  id="gemini-model"
                  value={geminiModel}
                  onChange={(e) => setGeminiModel(e.target.value as GeminiModel)}
                >
                  {GEMINI_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {provider !== "gemini" && imageBase64 && (
              <p className="field-hint warn">
                ⚠️ ローカル LLM は画像解析に対応していません。テキストのみで解析するか、Gemini を選択してください。
              </p>
            )}
          </div>

          <div className="input-grid">
            <div className="form-field">
              <label htmlFor="study-image">手書きノート・専門書ページの画像（任意）</label>
              <label htmlFor="study-image" className={`dropzone ${imagePreview ? "has-image" : ""}`}>
                {imagePreview ? (
                  <img src={imagePreview} alt="アップロード画像プレビュー" className="image-preview" />
                ) : (
                  <span className="dropzone-inner">
                    <span className="dropzone-icon" aria-hidden="true">
                      📷
                    </span>
                    <span>クリックして画像を選択</span>
                    <span className="dropzone-hint">板書・ノート・スクショ（PNG / JPEG / WebP・10 MB まで）</span>
                  </span>
                )}
              </label>
              <input
                id="study-image"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="visually-hidden"
                onChange={handleImageChange}
              />
            </div>

            <div className="form-field">
              <label htmlFor="study-source">数式・論文の抜粋・メモテキスト</label>
              <textarea
                id="study-source"
                rows={6}
                placeholder="数式や論文の定義、専門書の文章を貼り付けてください（画像のみでも可）"
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
              />
            </div>
          </div>

          <div className="form-field" style={{ marginTop: 14 }}>
            <label htmlFor="study-question">どこでつまずいていますか？（任意）</label>
            <input
              id="study-question"
              type="text"
              placeholder="例: なぜこの式変形が成り立つのかわからない"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
          </div>

          <div className="form-actions">
            <button className="btn btn-primary btn-lg" type="submit" disabled={analyzing}>
              {analyzing ? (
                <>
                  <span className="spinner" aria-hidden="true" />
                  {`${PROVIDERS.find((p) => p.id === provider)?.name ?? "AI"} が解析中...`}
                </>
              ) : (
                "前提ギャップと演習を生成 →"
              )}
            </button>
          </div>
        </form>
      </section>

      {analyzing && !analysis && (
        <section className="card skeleton-card" aria-busy="true" aria-label="解析中">
          <div className="skeleton skeleton-title" />
          <div className="skeleton skeleton-line" />
          <div className="skeleton skeleton-line short" />
          <div className="skeleton-row">
            <div className="skeleton skeleton-box" />
            <div className="skeleton skeleton-box" />
            <div className="skeleton skeleton-box" />
          </div>
        </section>
      )}

      {analysis && (
        <section className={`card card-result ${analyzing ? "is-stale" : ""}`}>
          <div className="result-hero">
            <div className="result-hero-text">
              <div className="result-hero-top">
                <span className="step-badge step-badge-light">STEP 2 · 診断結果</span>
                {usedModel && <span className="model-pill">⚡ {usedModel}</span>}
              </div>
              <h2 className="result-title">{analysis.topic_title}</h2>
              <p className="result-summary">{analysis.summary}</p>
              <div className="result-metrics">
                <span className="metric-chip">
                  前提ギャップ <strong>{analysis.prerequisites.length}</strong>
                </span>
                <span className="metric-chip">
                  理解ステップ <strong>{analysis.steps.length}</strong>
                </span>
                <span className="metric-chip">
                  演習 <strong>{analysis.quiz.length}</strong>
                </span>
                <span className="metric-chip">
                  復習タスク <strong>{analysis.suggested_tasks.length}</strong>
                </span>
              </div>
              <div
                className="schema-pipeline"
                title="Gemini の構造化出力（JSON Schema）が、そのまま UI 部品と Neon のテーブルに流れ込みます"
              >
                <span>Gemini JSON Schema</span>
                <span aria-hidden="true">→</span>
                <span>前提ギャップ / ステップ / 演習</span>
                <span aria-hidden="true">→</span>
                <span>Neon tasks・Google カレンダー</span>
              </div>
            </div>
          </div>

          <div className="analysis-block">
            <div className="block-head">
              <span className="num-badge">MAP</span>
              <h3>知識の依存関係マップ</h3>
            </div>
            <div className="knowledge-map">
              <div className="map-column">
                <div className="map-col-label">必要な前提知識</div>
                {analysis.prerequisites.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`map-node map-node-prereq ${
                      highlightedPrereq === idx ? "is-highlighted" : ""
                    } ${weakPrereqs.includes(idx) ? "is-weak" : ""}`}
                    onClick={() => setHighlightedPrereq(idx)}
                  >
                    {item.concept}
                  </button>
                ))}
              </div>
              <div className="map-arrow" aria-hidden="true">
                →
              </div>
              <div className="map-column">
                <div className="map-col-label">今回のテーマ</div>
                <div className="map-node map-node-current">{analysis.topic_title}</div>
              </div>
              {analysis.next_topics && analysis.next_topics.length > 0 && (
                <>
                  <div className="map-arrow" aria-hidden="true">
                    →
                  </div>
                  <div className="map-column">
                    <div className="map-col-label">次の発展トピック</div>
                    {analysis.next_topics.map((topic, idx) => (
                      <div key={idx} className="map-node map-node-next">
                        {topic}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="analysis-block">
            <div className="block-head">
              <span className="num-badge">1</span>
              <h3>抜け漏れやすい前提知識</h3>
            </div>
            <div className="grid-cards">
              {analysis.prerequisites.map((item, idx) => (
                <div
                  key={idx}
                  className={`sub-card prereq-card ${
                    highlightedPrereq === idx ? "is-highlighted-card" : ""
                  }`}
                >
                  <div className="sub-card-title">
                    <span className="mini-index">{idx + 1}</span>
                    {item.concept}
                  </div>
                  <p className="sub-card-meta">
                    <span className="meta-label">必要な理由</span> {item.why_needed}
                  </p>
                  <p className="sub-card-body">{item.quick_refresher}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="analysis-block">
            <div className="block-head">
              <span className="num-badge">2</span>
              <h3>段階的理解ステップ</h3>
            </div>
            <ol className="timeline">
              {analysis.steps.map((step, idx) => (
                <li key={idx} className="timeline-item">
                  <span className="timeline-dot">{idx + 1}</span>
                  <div className="sub-card timeline-card">
                    <div className="sub-card-title">
                      <span className="step-tag">Step {idx + 1}</span>
                      {step.step_title}
                    </div>
                    <p className="sub-card-body">{step.explanation}</p>
                    <p className="pitfall">
                      <span aria-hidden="true">⚠️</span> よくある誤解: {step.common_pitfall}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="analysis-block">
            <div className="block-head">
              <span className="num-badge">3</span>
              <h3>理解度チェック演習</h3>
              <span className="block-head-meta">
                {answeredCount} / {quizTotal} 回答済み
              </span>
            </div>

            <div className={`score-card tone-${allAnswered ? scoreTone : "pending"}`}>
              <div className="score-main">
                <div className="score-number">
                  {correctCount}
                  <span className="score-denom">/ {quizTotal}</span>
                </div>
                <div className="score-caption">
                  {allAnswered
                    ? scorePct >= 80
                      ? "素晴らしい！前提知識はほぼ定着しています"
                      : scorePct >= 50
                      ? "あと一歩。弱点の前提知識を補強しましょう"
                      : "前提知識の補強から始めるのがおすすめです"
                    : "すべての問題に回答するとスコアが確定します"}
                </div>
              </div>
              <div
                className="score-bar"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={quizTotal}
                aria-valuenow={correctCount}
                aria-label="正答数"
              >
                <div
                  className="score-bar-fill"
                  style={{ width: `${quizTotal ? (correctCount / quizTotal) * 100 : 0}%` }}
                />
                <div
                  className="score-bar-answered"
                  style={{ width: `${quizTotal ? (answeredCount / quizTotal) * 100 : 0}%` }}
                />
              </div>
              {weakPrereqs.length > 0 && (
                <div className="score-weak">
                  <span className="score-weak-label">要補強:</span>
                  {weakPrereqs.map((i) => (
                    <button
                      key={i}
                      type="button"
                      className="weak-chip"
                      onClick={() => setHighlightedPrereq(i)}
                    >
                      {analysis.prerequisites[i].concept}
                    </button>
                  ))}
                </div>
              )}
              {answeredCount > 0 && (
                <button
                  type="button"
                  className="btn btn-sm btn-ghost score-reset"
                  onClick={() => {
                    setSelectedAnswers({});
                    setHighlightedPrereq(null);
                  }}
                >
                  ↺ もう一度解く
                </button>
              )}
            </div>

            <div className="step-list">
              {analysis.quiz.map((q, qIdx) => {
                const picked = selectedAnswers[qIdx];
                const isAnswered = picked !== undefined;
                const isCorrect = picked === q.correct_index;

                return (
                  <div
                    key={qIdx}
                    className={`sub-card quiz-card ${
                      isAnswered ? (isCorrect ? "is-ok" : "is-ng") : ""
                    }`}
                  >
                    <div className="sub-card-title quiz-question">
                      <span className="q-badge">Q{qIdx + 1}</span>
                      <span>{q.question}</span>
                    </div>
                    <div className="quiz-choices">
                      {q.choices.map((choice, cIdx) => (
                        <button
                          key={cIdx}
                          type="button"
                          className={`quiz-choice ${picked === cIdx ? "is-selected" : ""} ${
                            isAnswered && cIdx === q.correct_index ? "is-correct" : ""
                          } ${isAnswered && picked === cIdx && !isCorrect ? "is-wrong" : ""}`}
                          onClick={() =>
                            setSelectedAnswers((prev) => ({ ...prev, [qIdx]: cIdx }))
                          }
                        >
                          <span className="choice-letter">{CHOICE_LETTERS[cIdx] ?? cIdx + 1}</span>
                          <span>{choice}</span>
                        </button>
                      ))}
                    </div>
                    {isAnswered && (
                      <div className={`quiz-feedback ${isCorrect ? "ok" : "ng"}`}>
                        <strong>{isCorrect ? "✓ 正解！" : "✗ 不正解"}</strong> {q.explanation}
                        {!isCorrect &&
                          typeof q.related_prerequisite_index === "number" &&
                          analysis.prerequisites[q.related_prerequisite_index] && (
                            <div className="adaptive-recovery">
                              <span>
                                🔍 つまずき診断：前提知識「
                                <strong>
                                  {analysis.prerequisites[q.related_prerequisite_index].concept}
                                </strong>
                                」の補強がおすすめです。
                              </span>
                              <button
                                type="button"
                                className="btn btn-sm btn-danger-solid"
                                onClick={() => {
                                  const idx = q.related_prerequisite_index as number;
                                  const target = analysis.prerequisites[idx];
                                  setHighlightedPrereq(idx);
                                  handleAddFocusTask(target.concept, target.quick_refresher);
                                }}
                              >
                                優先度「高」で復習タスクに追加
                              </button>
                            </div>
                          )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="analysis-block">
            <div className="block-head">
              <span className="num-badge">4</span>
              <h3>提案された復習タスク</h3>
            </div>
            <ul className="suggested-list">
              {analysis.suggested_tasks.map((t, idx) => (
                <li key={idx} className="suggested-item">
                  <span className={`badge badge-priority-${t.priority}`}>
                    優先度 {PRIORITY_LABEL[t.priority] ?? t.priority}
                  </span>
                  <div className="suggested-text">
                    <strong>{t.title}</strong>
                    {t.memo && <span className="suggested-memo">{t.memo}</span>}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="action-dock">
            <div className="action-dock-text">
              <span className="step-badge">STEP 4</span>
              <span>学習を「定着」させる — Neon と Google Workspace へワンクリック連携</span>
            </div>
            <div className="task-actions">
              <button
                type="button"
                className="btn btn-sm"
                disabled={saving}
                onClick={() => handleSaveToNeon(false)}
              >
                ログだけ保存
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={saving}
                onClick={() => handleSaveToNeon(true)}
              >
                {saving ? "保存中..." : "🗂 復習タスクを Neon に一括登録"}
              </button>
              <button
                type="button"
                className="btn btn-sm btn-google"
                disabled={syncingGas}
                onClick={handleSyncToGas}
              >
                {syncingGas ? "GAS 送信中..." : "📅 Google カレンダー / シートへ連携"}
              </button>
            </div>
          </div>
        </section>
      )}

      {sessions.length > 0 && (
        <section className="card">
          <h2 className="card-title">最近の解析履歴（Neon 保存済み）</h2>
          <div className="history-grid">
            {sessions.map((s) => (
              <div key={s.id} className="history-item">
                <div className="task-top">
                  <h3 className="task-title">{s.topic_title}</h3>
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => {
                      setAnalysis(s);
                      setUsedModel(null);
                      setSelectedAnswers({});
                      setHighlightedPrereq(null);
                      setTasksRegistered(false);
                      if (typeof window !== "undefined") {
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }
                    }}
                  >
                    表示する
                  </button>
                </div>
                <p className="task-memo history-summary">{s.summary}</p>
                {formatDate(s.created_at) && (
                  <span className="task-meta">{formatDate(s.created_at)}</span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
