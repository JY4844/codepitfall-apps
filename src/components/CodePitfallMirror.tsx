"use client";

import React, { useEffect, useState } from "react";
import type {
  AuditResponse,
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
];

const SAMPLE_SNIPPETS: Record<string, { task: string; code: string }> = {
  "Next.js API / フォーム送信": {
    task: "Next.js API / フォーム送信",
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
  "Python データ処理 / ML パイプライン": {
    task: "Python データ処理 / ML パイプライン",
    code: `import json

def load_scores(raw_text: str, weights: list[float]):
    parsed = JSON.parse(raw_text)
    total = 0.0
    for i in range(len(weights)):
        total += weights[i]
    return total / len(weights)`,
  },
  "DB スキーマ変更 / マイグレーション": {
    task: "DB スキーマ変更 / マイグレーション",
    code: `async function runMigration(sql: string) {
  const dbUrl = process.env.DATABASE_URL;
  const res = fetch(dbUrl + "/migrate", { method: "POST", body: sql });
  return res.json();
}`,
  },
};

export default function CodePitfallMirror() {
  const [habits, setHabits] = useState<PersonalMistake[]>(DEFAULT_HABITS);
  const [newHabitText, setNewHabitText] = useState("");
  const [newHabitCategory, setNewHabitCategory] = useState("Async");
  const [taskType, setTaskType] = useState<string>("Next.js API / フォーム送信");
  const [code, setCode] = useState<string>(
    SAMPLE_SNIPPETS["Next.js API / フォーム送信"].code
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AuditResponse | null>(null);
  const [checkedIds, setCheckedIds] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setHabits(parsed);
        }
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  const persistHabits = (next: PersonalMistake[]) => {
    setHabits(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage errors
    }
  };

  const handleAddHabit = () => {
    const trimmed = newHabitText.trim();
    if (!trimmed) return;
    persistHabits([
      {
        id: `h-${Date.now()}`,
        pattern: trimmed,
        category: newHabitCategory,
        severity: "high",
        hits: 1,
      },
      ...habits,
    ]);
    setNewHabitText("");
  };

  const handleDeleteHabit = (id: string) => {
    persistHabits(habits.filter((h) => h.id !== id));
  };

  const handleSelectTask = (nextTask: string) => {
    setTaskType(nextTask);
    if (SAMPLE_SNIPPETS[nextTask]) {
      setCode(SAMPLE_SNIPPETS[nextTask].code);
    }
    setCheckedIds({});
  };

  const handleAudit = async () => {
    setLoading(true);
    setCopied(false);
    try {
      const res = await fetch("/api/codemistake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, taskType, habits }),
      });
      if (!res.ok) throw new Error("Audit failed");
      const data: AuditResponse = await res.json();
      setResult(data);
      setCheckedIds({});

      // Increment hit counter for matched personal habits
      const matchedTexts = new Set(
        data.diagnostics
          .map((d) => d.matchedPersonalHabit)
          .filter((x): x is string => Boolean(x))
      );
      if (matchedTexts.size > 0) {
        persistHabits(
          habits.map((h) =>
            matchedTexts.has(h.pattern) ? { ...h, hits: h.hits + 1 } : h
          )
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopyFixed = async () => {
    if (!result?.fixedCode) return;
    await navigator.clipboard.writeText(result.fixedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const issueLines = new Map<number, "high" | "medium" | "low">();
  result?.diagnostics.forEach((d) => {
    const prev = issueLines.get(d.line);
    if (!prev || d.severity === "high") {
      issueLines.set(d.line, d.severity);
    }
  });

  const codeLines = code.split("\n");

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "radial-gradient(circle at top left, #0f172a 0%, #020617 70%)",
        color: "#f8fafc",
        padding: "24px 18px 48px",
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
      }}
    >
      <div style={{ maxWidth: 1240, margin: "0 auto" }}>
        {/* Header */}
        <header
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            borderBottom: "1px solid #1e293b",
            paddingBottom: 16,
            marginBottom: 20,
          }}
        >
          <div>
            <div
              style={{
                display: "inline-block",
                fontSize: 12,
                fontWeight: 700,
                color: "#818cf8",
                background: "rgba(99,102,241,0.14)",
                border: "1px solid rgba(99,102,241,0.35)",
                padding: "4px 10px",
                borderRadius: 999,
                marginBottom: 8,
              }}
            >
              ✦ Google Gemini Flagship App — Personal Mistake DNA &amp; Pitfall Templates
            </div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800 }}>
              CodePitfall Mirror Pro
            </h1>
            <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: 14 }}>
              あなたの過去の「やりがちミス履歴」を記憶し、行単位バグ検出＋作業別「よくある間違いテンプレート」で事故を未然に防ぐ専用 IDE チェッカー
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {Object.keys(SAMPLE_SNIPPETS).map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => handleSelectTask(name)}
                style={{
                  padding: "8px 12px",
                  borderRadius: 10,
                  border:
                    taskType === name
                      ? "1px solid #6366f1"
                      : "1px solid #334155",
                  background:
                    taskType === name ? "rgba(99,102,241,0.2)" : "#0f172a",
                  color: "#f8fafc",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {name}
              </button>
            ))}
          </div>
        </header>

        {/* Main 3-column / 2-column layout */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "320px 1fr",
            gap: 18,
            alignItems: "start",
          }}
        >
          {/* Left: Personal Mistake DNA Profile */}
          <aside
            style={{
              background: "rgba(15,23,42,0.9)",
              border: "1px solid #1e293b",
              borderRadius: 14,
              padding: 16,
            }}
          >
            <h2
              style={{
                margin: "0 0 8px",
                fontSize: 14,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "#a5b4fc",
              }}
            >
              1. あなたの「やりがちミス DNA」({habits.length}件)
            </h2>
            <p style={{ margin: "0 0 12px", fontSize: 12, color: "#94a3b8" }}>
              登録されたクセはローカル保存され、コード監査時に最優先で照合＆再発カウントされます。
            </p>

            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              <select
                value={newHabitCategory}
                onChange={(e) => setNewHabitCategory(e.target.value)}
                style={{
                  background: "#020617",
                  color: "#e2e8f0",
                  border: "1px solid #334155",
                  borderRadius: 8,
                  padding: "6px 8px",
                  fontSize: 12,
                }}
              >
                <option value="Async">Async</option>
                <option value="API">API</option>
                <option value="Logic">Logic</option>
                <option value="Config">Config</option>
                <option value="DB">DB</option>
              </select>
              <input
                type="text"
                value={newHabitText}
                onChange={(e) => setNewHabitText(e.target.value)}
                placeholder="自分のクセを追加..."
                style={{
                  flex: 1,
                  background: "#020617",
                  color: "#f8fafc",
                  border: "1px solid #334155",
                  borderRadius: 8,
                  padding: "6px 10px",
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
                  padding: "6px 10px",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                追加
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {habits.map((h) => (
                <div
                  key={h.id}
                  style={{
                    background: "#020617",
                    border: "1px solid #1e293b",
                    borderRadius: 10,
                    padding: "8px 10px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>
                      {h.pattern}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "#94a3b8",
                        marginTop: 2,
                      }}
                    >
                      [{h.category}] 再発検出: {h.hits}回
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
              ))}
            </div>
          </aside>

          {/* Right: Code Editor + Diagnostics + Task Template */}
          <main style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <section
              style={{
                background: "rgba(15,23,42,0.9)",
                border: "1px solid #1e293b",
                borderRadius: 14,
                padding: 16,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 10,
                }}
              >
                <h2
                  style={{
                    margin: 0,
                    fontSize: 14,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "#38bdf8",
                  }}
                >
                  2. コード入力＆行番号つきパーソナル監査（作業: {taskType}）
                </h2>
                <button
                  type="button"
                  onClick={handleAudit}
                  disabled={loading}
                  style={{
                    background: "linear-gradient(135deg, #4f46e5, #0284c7)",
                    color: "#fff",
                    border: "none",
                    borderRadius: 10,
                    padding: "10px 18px",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: loading ? "not-allowed" : "pointer",
                  }}
                >
                  {loading
                    ? "パーソナル監査を実行中..."
                    : "⚡ パーソナルミス監査＋作業テンプレ生成"}
                </button>
              </div>

              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                rows={10}
                style={{
                  width: "100%",
                  background: "#020617",
                  color: "#e2e8f0",
                  border: "1px solid #334155",
                  borderRadius: 10,
                  padding: 12,
                  fontFamily:
                    'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                  fontSize: 13,
                  lineHeight: 1.55,
                }}
              />

              {/* Line-highlighted preview when result exists */}
              {result && (
                <div
                  style={{
                    marginTop: 12,
                    background: "#020617",
                    border: "1px solid #1e293b",
                    borderRadius: 10,
                    padding: 10,
                    fontFamily:
                      'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                    fontSize: 12,
                    overflowX: "auto",
                  }}
                >
                  {codeLines.map((line, idx) => {
                    const sev = issueLines.get(idx + 1);
                    const bg =
                      sev === "high"
                        ? "rgba(244,63,94,0.18)"
                        : sev === "medium"
                          ? "rgba(245,158,11,0.16)"
                          : "transparent";
                    return (
                      <div
                        key={idx}
                        style={{
                          display: "flex",
                          gap: 12,
                          padding: "2px 6px",
                          background: bg,
                          borderLeft:
                            sev === "high"
                              ? "3px solid #f43f5e"
                              : sev === "medium"
                                ? "3px solid #f59e0b"
                                : "3px solid transparent",
                        }}
                      >
                        <span
                          style={{
                            width: 24,
                            textAlign: "right",
                            color: "#64748b",
                            userSelect: "none",
                          }}
                        >
                          {idx + 1}
                        </span>
                        <span style={{ whiteSpace: "pre" }}>{line}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Results Area */}
            {result && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 16,
                }}
              >
                {/* Left result: Line Diagnostics + Fixed Patch */}
                <section
                  style={{
                    background: "rgba(15,23,42,0.9)",
                    border: "1px solid #1e293b",
                    borderRadius: 14,
                    padding: 16,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 10,
                    }}
                  >
                    <h3 style={{ margin: 0, fontSize: 14, color: "#fb7185" }}>
                      3. 検出された危険箇所（リスク {result.riskScore}/100）
                    </h3>
                    <span style={{ fontSize: 11, color: "#94a3b8" }}>
                      Engine: {result.source}
                    </span>
                  </div>
                  <p style={{ margin: "0 0 12px", fontSize: 13, color: "#cbd5e1" }}>
                    {result.summary}
                  </p>

                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {result.diagnostics.map((d, i) => (
                      <div
                        key={i}
                        style={{
                          background: "#020617",
                          border:
                            d.severity === "high"
                              ? "1px solid rgba(244,63,94,0.45)"
                              : "1px solid #334155",
                          borderRadius: 10,
                          padding: 10,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: d.severity === "high" ? "#fda4af" : "#fde68a",
                          }}
                        >
                          Line {d.line}: {d.title}
                        </div>
                        {d.matchedPersonalHabit && (
                          <div
                            style={{
                              display: "inline-block",
                              marginTop: 4,
                              fontSize: 11,
                              fontWeight: 700,
                              color: "#c4b5fd",
                              background: "rgba(139,92,246,0.18)",
                              padding: "2px 8px",
                              borderRadius: 999,
                            }}
                          >
                            ★ あなたの過去クセ一致: {d.matchedPersonalHabit}
                          </div>
                        )}
                        <p
                          style={{
                            margin: "6px 0 0",
                            fontSize: 12,
                            color: "#cbd5e1",
                            lineHeight: 1.5,
                          }}
                        >
                          {d.reason}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: 14,
                      marginBottom: 6,
                    }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#34d399" }}>
                      修正済みコードパッチ
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyFixed}
                      style={{
                        background: "#1e293b",
                        color: "#f8fafc",
                        border: "1px solid #334155",
                        borderRadius: 6,
                        padding: "4px 10px",
                        fontSize: 11,
                        cursor: "pointer",
                      }}
                    >
                      {copied ? "✓ コピー済み" : "パッチをコピー"}
                    </button>
                  </div>
                  <pre
                    style={{
                      margin: 0,
                      background: "#020617",
                      border: "1px solid #1e293b",
                      borderRadius: 10,
                      padding: 10,
                      fontSize: 12,
                      color: "#a7f3d0",
                      overflowX: "auto",
                    }}
                  >
                    {result.fixedCode}
                  </pre>
                </section>

                {/* Right result: Task-Specific Common Pitfalls Template */}
                <section
                  style={{
                    background: "rgba(15,23,42,0.9)",
                    border: "1px solid #1e293b",
                    borderRadius: 14,
                    padding: 16,
                  }}
                >
                  <h3 style={{ margin: "0 0 8px", fontSize: 14, color: "#34d399" }}>
                    4. 作業別「よくある間違いテンプレート」（{taskType}）
                  </h3>
                  <p style={{ margin: "0 0 12px", fontSize: 12, color: "#94a3b8" }}>
                    この作業を完了・PR 提出する前に必ず潰すべき定番落とし穴です（あなたの過去クセに一致する項目はハイライト表示）。
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {result.preflightChecklist.map((item) => {
                      const checked = Boolean(checkedIds[item.id]);
                      return (
                        <label
                          key={item.id}
                          style={{
                            display: "flex",
                            gap: 10,
                            alignItems: "flex-start",
                            background: item.personalMatch
                              ? "rgba(99,102,241,0.12)"
                              : "#020617",
                            border: item.personalMatch
                              ? "1px solid rgba(99,102,241,0.45)"
                              : "1px solid #1e293b",
                            borderRadius: 10,
                            padding: 10,
                            cursor: "pointer",
                            opacity: checked ? 0.6 : 1,
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
                                fontSize: 13,
                                fontWeight: 700,
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
                                    fontSize: 10,
                                    color: "#a5b4fc",
                                  }}
                                >
                                  [あなたの要注意]
                                </span>
                              )}
                            </div>
                            <div
                              style={{
                                fontSize: 12,
                                color: "#94a3b8",
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
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
