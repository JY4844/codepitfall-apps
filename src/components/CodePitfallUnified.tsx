"use client";

import React, { useState } from "react";
import CodePitfallMirror from "./CodePitfallMirror";
import GitBridge from "./GitBridge";

interface Props {
  initialTab?: "error" | "github";
}

export default function CodePitfallUnified({ initialTab = "error" }: Props) {
  const [activeTab, setActiveTab] = useState<"error" | "github">(initialTab);

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "rgba(255, 255, 255, 0.94)",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid #e2e8f0",
          padding: "10px 16px",
        }}
      >
        <div
          style={{
            maxWidth: 1080,
            margin: "0 auto",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>
              🪞 CodePitfall × 🌉 GitBridge
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "#2563eb",
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                padding: "2px 8px",
                borderRadius: 999,
              }}
            >
              開発・GitHub 補助コンパニオン
            </span>
          </div>

          <div
            role="tablist"
            aria-label="機能切替"
            style={{
              display: "inline-flex",
              background: "#f1f5f9",
              padding: 4,
              borderRadius: 12,
              gap: 4,
            }}
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "error"}
              onClick={() => setActiveTab("error")}
              style={{
                border: "none",
                borderRadius: 9,
                padding: "7px 14px",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                background: activeTab === "error" ? "#ffffff" : "transparent",
                color: activeTab === "error" ? "#1d4ed8" : "#475569",
                boxShadow:
                  activeTab === "error"
                    ? "0 1px 3px rgba(15,23,42,0.12)"
                    : "none",
              }}
            >
              🔍 エラー即解決＆やりがちミス
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "github"}
              onClick={() => setActiveTab("github")}
              style={{
                border: "none",
                borderRadius: 9,
                padding: "7px 14px",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                background: activeTab === "github" ? "#ffffff" : "transparent",
                color: activeTab === "github" ? "#1d4ed8" : "#475569",
                boxShadow:
                  activeTab === "github"
                    ? "0 1px 3px rgba(15,23,42,0.12)"
                    : "none",
              }}
            >
              🌉 はじめての GitHub 安全公開
            </button>
          </div>
        </div>
      </div>

      {activeTab === "error" ? <CodePitfallMirror /> : <GitBridge />}
    </div>
  );
}
