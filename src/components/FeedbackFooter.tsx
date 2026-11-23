"use client";

import React from "react";

interface FeedbackFooterProps {
  appName: string;
  theme?: "light" | "dark";
}

const REPO_URL = "https://github.com/JY4844/codepitfall-apps";

export default function FeedbackFooter({
  appName,
  theme = "light",
}: FeedbackFooterProps) {
  const issueUrl = `${REPO_URL}/issues/new?title=${encodeURIComponent(
    `[Feedback] ${appName}: `
  )}&body=${encodeURIComponent(
    `### アプリ名\n${appName}\n\n### 良かった点・使いにくかった点・ほしい機能\n（ひとことだけでも大歓迎です！）\n\n### 利用環境（任意）\nPC / スマホ：`
  )}`;

  const isDark = theme === "dark";

  return (
    <footer
      style={{
        maxWidth: 960,
        margin: "28px auto 0",
        padding: "16px 20px",
        borderRadius: 16,
        background: isDark ? "rgba(15, 23, 42, 0.72)" : "#ffffff",
        border: isDark
          ? "1px solid rgba(148, 163, 184, 0.22)"
          : "1px solid #e2e8f0",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 12,
      }}
    >
      <div>
        <div
          style={{
            fontSize: 13.5,
            fontWeight: 800,
            color: isDark ? "#f1f5f9" : "#0f172a",
          }}
        >
          💬 使ってみた感想・改善アイデアを募集中！
        </div>
        <div
          style={{
            fontSize: 12,
            color: isDark ? "#94a3b8" : "#64748b",
            marginTop: 2,
          }}
        >
          「ここが使いにくい」「こんな機能がほしい」など、ひとことでも大歓迎です（Apache-2.0 オープンソース）
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <a
          href={issueUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 14px",
            borderRadius: 10,
            background: isDark ? "#0284c7" : "#2563eb",
            color: "#ffffff",
            fontSize: 12.5,
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          📝 フィードバックを送る (GitHub Issues) ↗
        </a>
        <a
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 12px",
            borderRadius: 10,
            background: isDark ? "rgba(30, 41, 59, 0.85)" : "#f8fafc",
            border: isDark
              ? "1px solid rgba(148, 163, 184, 0.35)"
              : "1px solid #cbd5e1",
            color: isDark ? "#e2e8f0" : "#334155",
            fontSize: 12.5,
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          ⭐ GitHub ソースを見る ↗
        </a>
      </div>
    </footer>
  );
}
