"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  generatePreCommitHook,
  type HabitForHook,
} from "@/lib/deterministicGuard";
import type { RepoAuditResponse } from "@/app/api/repo-audit/route";
import FeedbackFooter from "@/components/FeedbackFooter";

const DNA_STORAGE_KEY = "codepitfall_personal_dna_v2";

interface GitDisasterScenario {
  id: string;
  label: string;
  badge: string;
  safeDataGuarantee: string;
  beforeCaption: string;
  afterCaption: string;
  command: string;
  whySafe: string;
  beforeNodes: Array<{ x: number; y: number; id: string; tag?: string; color: string }>;
  afterNodes: Array<{ x: number; y: number; id: string; tag?: string; color: string }>;
  beforeEdges: Array<[number, number]>;
  afterEdges: Array<[number, number]>;
}

const GIT_DISASTERS: GitDisasterScenario[] = [
  {
    id: "push-rejected",
    label: "push rejected (fetch first) で弾かれた",
    badge: "コード消失ゼロ",
    safeDataGuarantee: "手元のコミットは1行も消えません（最新の後ろに綺麗に並び直します）",
    beforeCaption: "リモート (origin/main) が先に進んで枝分かれしている状態",
    afterCaption: "git pull --rebase 後：最新のリモート変更の後ろに自分のコミットが安全に整列",
    command: "git pull --rebase origin main && git push origin main",
    whySafe:
      "force push（--force）を使わず、リモートの変更を先に取り込んでから自分の変更を重ねるため、チームメイトの作業も自分の作業も消えません。",
    beforeNodes: [
      { x: 60, y: 70, id: "C1", color: "#64748b" },
      { x: 165, y: 40, id: "R2", tag: "origin/main", color: "#0284c7" },
      { x: 165, y: 105, id: "L2", tag: "HEAD (あなた)", color: "#ef4444" },
    ],
    beforeEdges: [
      [0, 1],
      [0, 2],
    ],
    afterNodes: [
      { x: 60, y: 70, id: "C1", color: "#64748b" },
      { x: 155, y: 70, id: "R2", color: "#0284c7" },
      { x: 260, y: 70, id: "L2'", tag: "HEAD & origin/main", color: "#16a34a" },
    ],
    afterEdges: [
      [0, 1],
      [1, 2],
    ],
  },
  {
    id: "undo-commit-keep-code",
    label: "直前のコミットだけ取り消したい（コードは残す！）",
    badge: "編集内容そのまま保持",
    safeDataGuarantee: "書いたコードはすべて VS Code にそのまま残ります（--hard ではありません）",
    beforeCaption: "誤ってコミットした C3 に HEAD がある状態",
    afterCaption: "git reset --soft HEAD~1 後：HEAD だけ C2 に戻り、C3 の変更はステージに残る",
    command: "git reset --soft HEAD~1",
    whySafe:
      "--hard は編集内容を完全消去して危険ですが、--soft はコミット履歴の1歩だけを戻し、書いたコードは1文字も消しません。",
    beforeNodes: [
      { x: 60, y: 70, id: "C1", color: "#64748b" },
      { x: 155, y: 70, id: "C2", color: "#64748b" },
      { x: 255, y: 70, id: "C3", tag: "HEAD (誤コミット)", color: "#ef4444" },
    ],
    beforeEdges: [
      [0, 1],
      [1, 2],
    ],
    afterNodes: [
      { x: 60, y: 70, id: "C1", color: "#64748b" },
      { x: 155, y: 70, id: "C2", tag: "HEAD", color: "#16a34a" },
      { x: 260, y: 70, id: "変更", tag: "ステージに残存✓", color: "#f59e0b" },
    ],
    afterEdges: [
      [0, 1],
      [1, 2],
    ],
  },
  {
    id: "committed-to-main",
    label: "main に直接コミットしてしまった（別ブランチへ退避）",
    badge: "PR作成前に最適",
    safeDataGuarantee: "変更を新しい feature ブランチに丸ごと移してから main を綺麗に戻します",
    beforeCaption: "main ブランチに直接作業コミット (M2) を積んでしまった状態",
    afterCaption: "作業コミットは feature/fix に安全退避し、main は元の C1 へ復旧",
    command: "git branch feature/fix && git reset --hard origin/main && git switch feature/fix",
    whySafe:
      "最初に git branch feature/fix でコミットへのポインタ（退避先）を作ってから main を戻すため、作業内容は100% feature/fix に残ります。",
    beforeNodes: [
      { x: 60, y: 70, id: "C1", tag: "origin/main", color: "#0284c7" },
      { x: 195, y: 70, id: "M2", tag: "HEAD -> main (誤)", color: "#ef4444" },
    ],
    beforeEdges: [[0, 1]],
    afterNodes: [
      { x: 60, y: 70, id: "C1", tag: "main & origin/main", color: "#0284c7" },
      { x: 215, y: 40, id: "M2", tag: "HEAD -> feature/fix", color: "#16a34a" },
    ],
    afterEdges: [[0, 1]],
  },
  {
    id: "staged-env-secret",
    label: ".env / APIキーを直前のコミットに混ぜてしまった",
    badge: "push前の緊急対処",
    safeDataGuarantee: "手元の .env ファイル自体は消さず、Gitの追跡対象だけから除外します",
    beforeCaption: ".env が Git 履歴に含まれたまま push しようとしている危険状態",
    afterCaption: "Git の追跡から .env を外し、.gitignore に追記してクリーンな履歴に修正",
    command: "git rm --cached .env && echo .env >> .gitignore && git commit --amend --no-edit",
    whySafe:
      "--cached を付けることでパソコン内の .env 本体は消さずに、Git に上げるリストからだけ安全に除外できます（※既に push 済みの場合は必ずキーを再発行してください）。",
    beforeNodes: [
      { x: 60, y: 70, id: "C1", color: "#64748b" },
      { x: 205, y: 70, id: "C2+.env", tag: "HEAD (秘密鍵混入!)", color: "#dc2626" },
    ],
    beforeEdges: [[0, 1]],
    afterNodes: [
      { x: 60, y: 70, id: "C1", color: "#64748b" },
      { x: 205, y: 70, id: "C2'", tag: "HEAD (.env除外済✓)", color: "#16a34a" },
    ],
    afterEdges: [[0, 1]],
  },
];

function CommitGraphSvg({
  nodes,
  edges,
}: {
  nodes: GitDisasterScenario["beforeNodes"];
  edges: GitDisasterScenario["beforeEdges"];
}) {
  return (
    <svg
      viewBox="0 0 340 140"
      style={{
        width: "100%",
        height: 140,
        background: "#0f172a",
        borderRadius: 12,
        border: "1px solid #334155",
      }}
    >
      {edges.map(([fromIdx, toIdx], idx) => {
        const a = nodes[fromIdx];
        const b = nodes[toIdx];
        if (!a || !b) return null;
        return (
          <line
            key={idx}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke="#94a3b8"
            strokeWidth={3}
            strokeDasharray={b.id === "変更" ? "5 4" : undefined}
          />
        );
      })}
      {nodes.map((n, idx) => (
        <g key={`${n.id}-${idx}`}>
          <circle
            cx={n.x}
            cy={n.y}
            r={20}
            fill={n.color}
            stroke="#f8fafc"
            strokeWidth={2.5}
          />
          <text
            x={n.x}
            y={n.y + 4}
            textAnchor="middle"
            fill="#ffffff"
            fontSize="10.5"
            fontWeight="800"
          >
            {n.id}
          </text>
          {n.tag && (
            <text
              x={n.x}
              y={n.y > 75 ? n.y + 32 : n.y - 26}
              textAnchor="middle"
              fill="#e2e8f0"
              fontSize="10"
              fontWeight="700"
            >
              {n.tag}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

export default function DeterministicDevLab() {
  // ③ Git Visual Simulator state
  const [selectedDisasterId, setSelectedDisasterId] = useState<string>(
    GIT_DISASTERS[0].id
  );
  const [simulated, setSimulated] = useState<boolean>(false);
  const [copiedGitCmd, setCopiedGitCmd] = useState<boolean>(false);

  // ④ Live GitHub Repo Real-File Auditor state
  const [repoUrl, setRepoUrl] = useState<string>("");
  const [auditing, setAuditing] = useState<boolean>(false);
  const [auditError, setAuditError] = useState<string>("");
  const [auditResult, setAuditResult] = useState<RepoAuditResponse | null>(null);

  // ② Zero-AI .git/hooks/pre-commit generator state
  const [habits, setHabits] = useState<HabitForHook[]>([]);
  const [copiedHook, setCopiedHook] = useState<boolean>(false);
  const [downloadedHook, setDownloadedHook] = useState<boolean>(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DNA_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setHabits(parsed);
      }
    } catch {
      // Ignore
    }
  }, []);

  const disaster =
    GIT_DISASTERS.find((d) => d.id === selectedDisasterId) ?? GIT_DISASTERS[0];

  const hookScript = useMemo(() => generatePreCommitHook(habits), [habits]);

  const handleRunRepoAudit = async (overrideUrl?: string) => {
    const target = (overrideUrl ?? repoUrl).trim();
    if (!target) return;
    if (overrideUrl) setRepoUrl(overrideUrl);
    setAuditing(true);
    setAuditError("");
    try {
      const res = await fetch("/api/repo-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl: target }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAuditError(data.error || "リポジトリ監査に失敗しました。");
        setAuditResult(null);
      } else {
        setAuditResult(data as RepoAuditResponse);
      }
    } catch {
      setAuditError("ネットワークエラーが発生しました。");
    } finally {
      setAuditing(false);
    }
  };

  const handleDownloadHook = () => {
    const blob = new Blob([hookScript], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pre-commit";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setDownloadedHook(true);
    setTimeout(() => setDownloadedHook(false), 3000);
  };

  return (
    <main
      style={{
        maxWidth: 960,
        margin: "0 auto",
        padding: "24px 20px 64px",
        color: "#0f172a",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Hiragino Sans", "Noto Sans JP", sans-serif',
      }}
    >
      {/* Intro Banner: Why NOT just an AI wrapper */}
      <section
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          color: "#f8fafc",
          borderRadius: 16,
          padding: "20px 24px",
          marginBottom: 22,
          border: "1px solid #334155",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span
            style={{
              fontSize: 11.5,
              fontWeight: 800,
              padding: "3px 10px",
              borderRadius: 999,
              background: "#10b981",
              color: "#022c22",
            }}
          >
            NON-LLM / DETERMINISTIC ENGINE
          </span>
          <span style={{ fontSize: 12.5, color: "#94a3b8", fontWeight: 600 }}>
            AIチャットには絶対にできない「決定的・実データ・物理ガード」ツール群
          </span>
        </div>
        <h2 style={{ margin: "10px 0 6px", fontSize: 20, fontWeight: 800 }}>
          🛡️ 非AI 安全ツール（Git図解シミュレーター・実リポ生監査・pre-commit生成）
        </h2>
        <p style={{ margin: 0, fontSize: 13, color: "#cbd5e1", lineHeight: 1.6 }}>
          LLM の推測やハルシネーションに頼らず、<strong>Gitコミット木の視覚シミュレーション</strong>・<strong>GitHub API による実ファイル生監査</strong>・<strong>本物の `.git/hooks/pre-commit` 物理ガード生成</strong>をゼロAIトークンで実行します。
        </p>
      </section>

      {/* FEATURE ③: Visual Git Disaster Recovery Simulator */}
      <section
        style={{
          background: "#ffffff",
          borderRadius: 16,
          border: "1px solid #cbd5e1",
          padding: "22px 24px",
          marginBottom: 22,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>
              🌳 1. 視覚的 Git 事故リカバリー・シミュレーター（git-sim インスパイア）
            </h3>
            <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "#64748b" }}>
              コマンドを打つ前に「コミット木がどう動くか・コードが消えないか」を図で事前確認できます。
            </p>
          </div>
          <span
            style={{
              alignSelf: "flex-start",
              fontSize: 12,
              fontWeight: 700,
              padding: "4px 10px",
              borderRadius: 999,
              background: "#dcfce7",
              color: "#166534",
            }}
          >
            ✅ {disaster.badge}
          </span>
        </div>

        {/* Scenario Pills */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
          {GIT_DISASTERS.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => {
                setSelectedDisasterId(d.id);
                setSimulated(false);
              }}
              style={{
                padding: "7px 12px",
                borderRadius: 10,
                border:
                  d.id === selectedDisasterId
                    ? "1.5px solid #2563eb"
                    : "1px solid #cbd5e1",
                background: d.id === selectedDisasterId ? "#eff6ff" : "#f8fafc",
                color: d.id === selectedDisasterId ? "#1d4ed8" : "#334155",
                fontSize: 12.5,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {d.label}
            </button>
          ))}
        </div>

        {/* Before / After SVG Graph */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))",
            gap: 14,
            marginBottom: 14,
          }}
        >
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#dc2626", marginBottom: 6 }}>
              Before（いまの事故状態）：{disaster.beforeCaption}
            </div>
            <CommitGraphSvg nodes={disaster.beforeNodes} edges={disaster.beforeEdges} />
          </div>
          <div style={{ opacity: simulated ? 1 : 0.45, transition: "opacity 0.25s ease" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#15803d", marginBottom: 6 }}>
              After（実行後の安全な状態）：{disaster.afterCaption}
            </div>
            <CommitGraphSvg nodes={disaster.afterNodes} edges={disaster.afterEdges} />
          </div>
        </div>

        <div
          style={{
            padding: "12px 14px",
            borderRadius: 12,
            background: "#f0fdf4",
            border: "1px solid #86efac",
            marginBottom: 12,
            fontSize: 12.5,
            color: "#166534",
          }}
        >
          <strong>🛡️ 安全保証:</strong> {disaster.safeDataGuarantee}
          <div style={{ marginTop: 4, color: "#15803d" }}>{disaster.whySafe}</div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setSimulated((prev) => !prev)}
            style={{
              padding: "9px 16px",
              borderRadius: 10,
              border: "none",
              background: "#2563eb",
              color: "#ffffff",
              fontWeight: 800,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            {simulated ? "↺ Before に戻す" : "▶ After をシミュレート確認"}
          </button>

          <code
            style={{
              flex: 1,
              minWidth: 220,
              padding: "9px 12px",
              borderRadius: 10,
              background: "#0f172a",
              color: "#38bdf8",
              fontSize: 12.5,
              fontFamily: "ui-monospace, Consolas, monospace",
            }}
          >
            {disaster.command}
          </code>

          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(disaster.command);
                setCopiedGitCmd(true);
                setTimeout(() => setCopiedGitCmd(false), 2400);
              } catch {
                // Ignore
              }
            }}
            style={{
              padding: "9px 14px",
              borderRadius: 10,
              border: "1px solid #cbd5e1",
              background: "#ffffff",
              color: "#0f172a",
              fontWeight: 700,
              fontSize: 12.5,
              cursor: "pointer",
            }}
          >
            {copiedGitCmd ? "✓ コピー済み" : "📋 コマンドをコピー"}
          </button>
        </div>
      </section>

      {/* FEATURE ④: Live GitHub Public Repo Real-File Auditor */}
      <section
        style={{
          background: "#ffffff",
          borderRadius: 16,
          border: "1px solid #cbd5e1",
          padding: "22px 24px",
          marginBottom: 22,
        }}
      >
        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>
          📊 2. GitHub 公開リポジトリ 実ファイル生監査＆安全スコア（0〜100点）
        </h3>
        <p style={{ margin: "4px 0 12px", fontSize: 12.5, color: "#64748b" }}>
          GitHub 公開 API を直接叩き、実際の `.env` 露出・`.gitignore`・`LICENSE`・`package.json` の危険フック・`AGENTS.md` 適性を実データで即採点します（AI推測ゼロ）。
        </p>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          <input
            type="text"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="https://github.com/owner/repo または owner/repo"
            style={{
              flex: 1,
              minWidth: 260,
              padding: "10px 14px",
              borderRadius: 10,
              border: "1.5px solid #cbd5e1",
              fontSize: 13.5,
              background: "#f8fafc",
            }}
          />
          <button
            type="button"
            disabled={auditing || !repoUrl.trim()}
            onClick={() => void handleRunRepoAudit()}
            style={{
              padding: "10px 18px",
              borderRadius: 10,
              border: "none",
              background: !repoUrl.trim() ? "#94a3b8" : "#0f172a",
              color: "#ffffff",
              fontWeight: 800,
              fontSize: 13,
              cursor: auditing ? "wait" : "pointer",
            }}
          >
            {auditing ? "実ファイル監査中..." : "🔍 実ファイルを監査する"}
          </button>
          <button
            type="button"
            onClick={() =>
              void handleRunRepoAudit(
                "https://github.com/JY4844/codepitfall-kit"
              )
            }
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #cbd5e1",
              background: "#f8fafc",
              color: "#475569",
              fontWeight: 700,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            例（本リポジトリ）を監査
          </button>
        </div>

        {auditError && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#b91c1c",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            ⚠️ {auditError}
          </div>
        )}

        {auditResult && (
          <div
            style={{
              marginTop: 14,
              padding: 16,
              borderRadius: 14,
              background: "#f8fafc",
              border: "1px solid #cbd5e1",
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
                <a
                  href={auditResult.htmlUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 16, fontWeight: 800, color: "#1d4ed8", textDecoration: "none" }}
                >
                  {auditResult.owner}/{auditResult.repo} ↗
                </a>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                  branch: {auditResult.defaultBranch} · ⭐ {auditResult.stars} · 監査時刻: {auditResult.checkedAt}
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 16px",
                  borderRadius: 12,
                  background: auditResult.score >= 80 ? "#dcfce7" : auditResult.score >= 60 ? "#fef9c3" : "#fee2e2",
                  color: auditResult.score >= 80 ? "#166534" : auditResult.score >= 60 ? "#854d0e" : "#991b1b",
                }}
              >
                <span style={{ fontSize: 24, fontWeight: 900 }}>
                  {auditResult.score}
                  <span style={{ fontSize: 13 }}>/100</span>
                </span>
                <span style={{ fontSize: 18, fontWeight: 900 }}>
                  ランク {auditResult.grade}
                </span>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {auditResult.checks.map((c) => (
                <div
                  key={c.id}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800 }}>
                      {c.status === "pass" ? "✅" : c.status === "warn" ? "⚠️" : "❌"}{" "}
                      {c.label}
                    </div>
                    <div style={{ fontSize: 12, color: "#475569", marginTop: 3 }}>
                      {c.detail}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      whiteSpace: "nowrap",
                      color: c.status === "pass" ? "#15803d" : c.status === "warn" ? "#b45309" : "#dc2626",
                    }}
                  >
                    {c.points}/{c.maxPoints}pt
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* FEATURE ②: Real .git/hooks/pre-commit Generator */}
      <section
        style={{
          background: "#ffffff",
          borderRadius: 16,
          border: "1px solid #cbd5e1",
          padding: "22px 24px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>
              🪝 3. 本物の `.git/hooks/pre-commit` 物理ガード 1クリック生成
            </h3>
            <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "#64748b" }}>
              あなたの過去ミスDNA（現在 {habits.length} 件記憶中）と秘密鍵スキャンを、Git コミット瞬間に0.1秒・AIトークンゼロで物理ブロックするシェルスクリプトに変換します。
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={handleDownloadHook}
              style={{
                padding: "9px 14px",
                borderRadius: 10,
                border: "none",
                background: "#16a34a",
                color: "#ffffff",
                fontWeight: 800,
                fontSize: 12.5,
                cursor: "pointer",
              }}
            >
              {downloadedHook ? "✓ pre-commit を保存しました" : "⬇️ pre-commit をダウンロード"}
            </button>
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(hookScript);
                  setCopiedHook(true);
                  setTimeout(() => setCopiedHook(false), 2400);
                } catch {
                  // Ignore
                }
              }}
              style={{
                padding: "9px 14px",
                borderRadius: 10,
                border: "1px solid #cbd5e1",
                background: "#f8fafc",
                color: "#0f172a",
                fontWeight: 700,
                fontSize: 12.5,
                cursor: "pointer",
              }}
            >
              {copiedHook ? "✓ コピー済み" : "📋 スクリプトをコピー"}
            </button>
          </div>
        </div>

        <pre
          style={{
            margin: 0,
            padding: 14,
            borderRadius: 12,
            background: "#0f172a",
            color: "#e2e8f0",
            fontSize: 11.5,
            lineHeight: 1.55,
            maxHeight: 260,
            overflow: "auto",
            fontFamily: "ui-monospace, Consolas, monospace",
          }}
        >
          {hookScript}
        </pre>
      </section>

      <FeedbackFooter appName="CodePitfall × GitBridge" theme="light" />
    </main>
  );
}
