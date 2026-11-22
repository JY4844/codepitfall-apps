"use client";

import React, { useMemo, useState } from "react";
import FeedbackFooter from "@/components/FeedbackFooter";
import type { WhatIfResponse } from "@/app/api/whatif/route";

interface ExampleScenario {
  id: string;
  label: string;
  situation: string;
  interventionA: string;
  interventionB: string;
  intensity: number;
}

const EXAMPLES: ExampleScenario[] = [
  {
    id: "housing",
    label: "🏠 家計・引っ越しの分岐",
    situation:
      "現在の家賃は月9.5万円（通勤45分）。更新時期が迫っており、職場近く（月11.5万円・通勤15分）へ引っ越すか、今の部屋を更新するか迷っている。",
    interventionA: "月2万円高くても職場近くへ引っ越し、毎日1時間の自由時間を作る",
    interventionB: "今の部屋を更新し、浮いた年24万円＋引っ越し費用40万円を積立投資に回す",
    intensity: 75,
  },
  {
    id: "disaster",
    label: "🌧️ 台風・避難タイミングの分岐",
    situation:
      "夜間に大雨警報が出る予報。自宅は川の近くで1階に高齢の家族が住んでいるが、今のところ雨はまだ小降り。",
    interventionA: "明るいうち（夕方17時）に高台の親戚宅・避難所へ予防避難する",
    interventionB: "避難指示が出るまで自宅待機し、必要なら2階へ垂直避難する",
    intensity: 85,
  },
  {
    id: "career",
    label: "💼 副業・キャリアの分岐",
    situation:
      "本業を続けながら個人開発アプリを伸ばしたいが、毎日残業で時間が足りない。残業を減らして開発時間を確保するか、週末集中にするか迷っている。",
    interventionA: "平日の業務を自動化して毎日1時間早く帰り、週5時間コンスタントに開発する",
    interventionB: "平日は本業に集中し、土日の午前中だけ3時間ずつ開発に充てる",
    intensity: 70,
  },
];

export default function WhatIfMirror() {
  // Starts completely empty by default
  const [situation, setSituation] = useState<string>("");
  const [interventionA, setInterventionA] = useState<string>("");
  const [interventionB, setInterventionB] = useState<string>("");
  const [intensity, setIntensity] = useState<number>(70);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [result, setResult] = useState<WhatIfResponse | null>(null);
  const [savedNotice, setSavedNotice] = useState<string>("");

  // 0ms deterministic client-side risk/benefit projection preview as slider moves
  const livePreview = useMemo(() => {
    const baseRisk = result?.factualBaseline.riskScore ?? 62;
    const baseBenefit = result?.factualBaseline.benefitScore ?? 52;
    const branchARisk = result?.branches[0]?.riskScore ?? Math.max(14, baseRisk - Math.round(intensity * 0.42));
    const branchABenefit = result?.branches[0]?.benefitScore ?? Math.min(95, 58 + Math.round(intensity * 0.34));
    const branchBRisk = result?.branches[1]?.riskScore ?? Math.min(90, baseRisk + Math.round((100 - intensity) * 0.16));
    const branchBBenefit = result?.branches[1]?.benefitScore ?? Math.max(38, 66 - Math.round((100 - intensity) * 0.14));
    return { baseRisk, baseBenefit, branchARisk, branchABenefit, branchBRisk, branchBBenefit };
  }, [intensity, result]);

  const handleRunSimulation = async () => {
    if (!situation.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/whatif", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          situation,
          interventionA,
          interventionB,
          intensity,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "シミュレーションに失敗しました。");
      } else {
        setResult(data as WhatIfResponse);
      }
    } catch {
      setError("通信エラーが発生しました。");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMarkdown = () => {
    if (!result) return;
    const md = [
      "# WhatIf Mirror — 反実仮想（Counterfactual）シミュレーション記録",
      "",
      `- 記録日時: ${new Date().toLocaleString("ja-JP")}`,
      `- 介入強度 do(X): ${intensity}%`,
      "",
      "## 現状の状況",
      situation,
      "",
      "## 現状維持（事実ベースライン）",
      `- リスク: ${result.factualBaseline.riskScore}/100 ・ 期待メリット: ${result.factualBaseline.benefitScore}/100`,
      `- 予測: ${result.factualBaseline.outcome}`,
      "",
      "## 反実仮想ルート比較",
      ...result.branches.flatMap((b) => [
        `### ${b.label}`,
        `- 介入: ${b.intervention}`,
        `- リスク: ${b.riskScore}/100 ・ 期待メリット: ${b.benefitScore}/100`,
        `- 予測: ${b.outcomeSummary}`,
        `- 隠れ要因（交絡因子）: ${b.hiddenConfounder}`,
        `- 最初の一歩: ${b.firstAction}`,
        "",
      ]),
      "## 見落としがちな交絡因子",
      ...result.hiddenConfounders.map((c) => `- ${c}`),
      "",
      "## 後悔しないための確認チェックリスト",
      ...result.regretPreventionChecklist.map((c) => `- [ ] ${c}`),
    ].join("\n");

    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "whatif-simulation.md";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setSavedNotice("📝 シミュレーション結果をローカル (.md) に保存しました！");
    setTimeout(() => setSavedNotice(""), 3000);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)",
        color: "#0f172a",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Hiragino Sans", "Noto Sans JP", sans-serif',
        paddingBottom: 64,
      }}
    >
      <header
        style={{
          background: "rgba(255, 255, 255, 0.92)",
          backdropFilter: "blur(10px)",
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
            gap: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "#eef2ff",
                border: "1px solid #c7d2fe",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
              }}
            >
              🔀
            </span>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h1 style={{ margin: 0, fontSize: 17, fontWeight: 900 }}>
                  WhatIf Mirror
                </h1>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: "#e0e7ff",
                    color: "#3730a3",
                  }}
                >
                  反実仮想 do(X) シミュレーター
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
                事実の要約ではなく「もし別の選択をしたら？」と隠れ要因（交絡因子）を可視化
              </p>
            </div>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 960, margin: "0 auto", padding: "24px 20px" }}>
        {savedNotice && (
          <div
            style={{
              marginBottom: 14,
              padding: "10px 14px",
              borderRadius: 10,
              background: "#ecfdf5",
              border: "1px solid #6ee7b7",
              color: "#065f46",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {savedNotice}
          </div>
        )}

        {/* Input Card */}
        <section
          style={{
            background: "#ffffff",
            borderRadius: 16,
            border: "1px solid #cbd5e1",
            padding: "22px 24px",
            marginBottom: 20,
            boxShadow: "0 4px 20px rgba(15, 23, 42, 0.04)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: 12,
            }}
          >
            <strong style={{ fontSize: 15.5 }}>
              1. いま迷っている状況・選択を入力（最初は空欄です）
            </strong>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {EXAMPLES.map((ex) => (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => {
                    setSituation(ex.situation);
                    setInterventionA(ex.interventionA);
                    setInterventionB(ex.interventionB);
                    setIntensity(ex.intensity);
                  }}
                  style={{
                    padding: "5px 10px",
                    borderRadius: 8,
                    border: "1px solid #c7d2fe",
                    background: "#eef2ff",
                    color: "#3730a3",
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {ex.label}
                </button>
              ))}
            </div>
          </div>

          <textarea
            value={situation}
            onChange={(e) => setSituation(e.target.value)}
            rows={3}
            placeholder="例：家賃更新で引っ越すか迷っている / 台風前に避難すべきか / 転職・副業の進め方を迷っている…"
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "12px 14px",
              borderRadius: 12,
              border: "1.5px solid #cbd5e1",
              background: "#f8fafc",
              fontSize: 13.5,
              lineHeight: 1.55,
              marginBottom: 14,
            }}
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 12,
              marginBottom: 14,
            }}
          >
            <div>
              <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#1d4ed8", marginBottom: 4 }}>
                🔀 反実仮想の介入 A（もしこうしたら？）
              </label>
              <input
                type="text"
                value={interventionA}
                onChange={(e) => setInterventionA(e.target.value)}
                placeholder="例：先に動く・思い切って条件を変える"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "9px 12px",
                  borderRadius: 10,
                  border: "1px solid #bfdbfe",
                  background: "#eff6ff",
                  fontSize: 13,
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#7c3aed", marginBottom: 4 }}>
                🔀 反実仮想の介入 B（別の選択肢）
              </label>
              <input
                type="text"
                value={interventionB}
                onChange={(e) => setInterventionB(e.target.value)}
                placeholder="例：現状維持・小さく様子を見る"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "9px 12px",
                  borderRadius: 10,
                  border: "1px solid #ddd6fe",
                  background: "#f5f3ff",
                  fontSize: 13,
                }}
              />
            </div>
          </div>

          {/* 0ms Deterministic Intervention Intensity Slider */}
          <div
            style={{
              padding: "12px 14px",
              borderRadius: 12,
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              marginBottom: 14,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>
              <span>🎚️ 介入 do(X) の実行強度（リアルタイムSVG連動・0ms）</span>
              <span style={{ color: "#4f46e5" }}>{intensity}%</span>
            </div>
            <input
              type="range"
              min={10}
              max={100}
              step={5}
              value={intensity}
              onChange={(e) => setIntensity(Number(e.target.value))}
              style={{ width: "100%", accentColor: "#4f46e5" }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
            <span style={{ fontSize: 12, color: "#64748b" }}>
              ※ 数値分岐グラフはブラウザ内0ms計算 ＋ 隠れ要因（交絡因子）分析は Gemini 3 Flash が担当
            </span>
            <button
              type="button"
              disabled={loading || !situation.trim()}
              onClick={() => void handleRunSimulation()}
              style={{
                padding: "10px 22px",
                borderRadius: 10,
                border: "none",
                background: !situation.trim() ? "#94a3b8" : "#4f46e5",
                color: "#ffffff",
                fontWeight: 800,
                fontSize: 14,
                cursor: loading ? "wait" : !situation.trim() ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "反実仮想を分析中..." : "🔀 反実仮想ルートをシミュレートする"}
            </button>
          </div>

          {error && (
            <div style={{ marginTop: 10, color: "#dc2626", fontSize: 13, fontWeight: 700 }}>
              ⚠️ {error}
            </div>
          )}
        </section>

        {/* 0ms Interactive SVG Counterfactual Branching Graph */}
        <section
          style={{
            background: "#0f172a",
            color: "#f8fafc",
            borderRadius: 16,
            padding: "18px 22px",
            marginBottom: 20,
            border: "1px solid #334155",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
            <strong style={{ fontSize: 14.5 }}>
              🌌 反実仮想 do(X) 分岐マップ（現状 vs ルートA vs ルートB）
            </strong>
            <span style={{ fontSize: 11.5, color: "#94a3b8" }}>
              リスクは低いほど安全 / メリットは高いほど良好
            </span>
          </div>

          <svg viewBox="0 0 680 185" style={{ width: "100%", height: "auto", display: "block" }}>
            <line x1="110" y1="92" x2="290" y2="38" stroke="#60a5fa" strokeWidth="3" />
            <line x1="110" y1="92" x2="290" y2="92" stroke="#94a3b8" strokeWidth="2.5" strokeDasharray="6 4" />
            <line x1="110" y1="92" x2="290" y2="148" stroke="#c084fc" strokeWidth="3" />

            <rect x="16" y="68" width="96" height="48" rx="10" fill="#1e293b" stroke="#cbd5e1" strokeWidth="2" />
            <text x="64" y="96" textAnchor="middle" fill="#f8fafc" fontSize="12" fontWeight="800">いまの事実</text>

            {/* Route A */}
            <rect x="290" y="14" width="374" height="48" rx="10" fill="#1e3a8a" stroke="#60a5fa" strokeWidth="2" />
            <text x="306" y="34" fill="#bfdbfe" fontSize="12" fontWeight="800">
              ルートA (do(X) 介入 {intensity}%)
            </text>
            <text x="306" y="52" fill="#ffffff" fontSize="11.5" fontWeight="700">
              リスク {livePreview.branchARisk}/100 ・ 期待メリット {livePreview.branchABenefit}/100
            </text>

            {/* Baseline */}
            <rect x="290" y="69" width="374" height="46" rx="10" fill="#1e293b" stroke="#64748b" strokeWidth="1.5" />
            <text x="306" y="88" fill="#cbd5e1" fontSize="12" fontWeight="800">
              現状維持（何もしない事実延長）
            </text>
            <text x="306" y="105" fill="#94a3b8" fontSize="11.5" fontWeight="700">
              リスク {livePreview.baseRisk}/100 ・ 期待メリット {livePreview.baseBenefit}/100
            </text>

            {/* Route B */}
            <rect x="290" y="124" width="374" height="48" rx="10" fill="#3b0764" stroke="#c084fc" strokeWidth="2" />
            <text x="306" y="144" fill="#e9d5ff" fontSize="12" fontWeight="800">
              ルートB（慎重・代替介入）
            </text>
            <text x="306" y="162" fill="#ffffff" fontSize="11.5" fontWeight="700">
              リスク {livePreview.branchBRisk}/100 ・ 期待メリット {livePreview.branchBBenefit}/100
            </text>
          </svg>
        </section>

        {/* Detailed Causal Analysis Result */}
        {result && (
          <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div
              style={{
                background: "#ffffff",
                borderRadius: 16,
                border: "1px solid #c7d2fe",
                padding: "20px 22px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: "#4f46e5" }}>
                  ✨ 反実仮想シミュレーション結果（{result.source === "gemini" ? "Gemini 3 Flash 構造分析" : "ローカル因果モデル"}）
                </span>
                <button
                  type="button"
                  onClick={handleSaveMarkdown}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                    background: "#f8fafc",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  📝 結果を .md でローカル保存
                </button>
              </div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, lineHeight: 1.6 }}>
                {result.situationSummary}
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))",
                gap: 14,
              }}
            >
              {result.branches.map((b, i) => (
                <div
                  key={i}
                  style={{
                    background: "#ffffff",
                    borderRadius: 16,
                    border: i === 0 ? "1.5px solid #93c5fd" : "1.5px solid #d8b4fe",
                    padding: "18px 20px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  <div style={{ fontSize: 15, fontWeight: 800, color: i === 0 ? "#1d4ed8" : "#6d28d9" }}>
                    {b.label}
                  </div>
                  <div style={{ fontSize: 12, color: "#475569", fontWeight: 700 }}>
                    介入: {b.intervention}
                  </div>
                  <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}>{b.outcomeSummary}</p>
                  <div style={{ padding: "8px 10px", borderRadius: 10, background: "#fffbeb", border: "1px solid #fde68a", fontSize: 12, color: "#92400e" }}>
                    <strong>⚠️ 見落としがちな隠れ要因:</strong> {b.hiddenConfounder}
                  </div>
                  <div style={{ padding: "8px 10px", borderRadius: 10, background: "#f0fdf4", border: "1px solid #bbf7d0", fontSize: 12, color: "#166534" }}>
                    <strong>🚀 今日できる最初の一歩:</strong> {b.firstAction}
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                background: "#ffffff",
                borderRadius: 16,
                border: "1px solid #cbd5e1",
                padding: "18px 20px",
              }}
            >
              <strong style={{ fontSize: 14 }}>🔍 事実データだけでは見えない「隠れ要因（交絡因子）」＆後悔防止チェック</strong>
              <ul style={{ margin: "8px 0 12px", paddingLeft: 20, fontSize: 13, lineHeight: 1.65 }}>
                {result.hiddenConfounders.map((c, idx) => (
                  <li key={idx}>{c}</li>
                ))}
              </ul>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {result.regretPreventionChecklist.map((item, idx) => (
                  <label key={idx} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                    <input type="checkbox" />
                    <span>{item}</span>
                  </label>
                ))}
              </div>
            </div>
          </section>
        )}

        <FeedbackFooter appName="WhatIf Mirror (反実仮想シミュレーター)" theme="light" />
      </main>
    </div>
  );
}
