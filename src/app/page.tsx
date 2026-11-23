"use client";

import React from "react";
import Link from "next/link";

interface FlagshipAppCard {
  id: string;
  department: string;
  deptColor: string;
  deptBg: string;
  deptBorder: string;
  icon: string;
  title: string;
  tagline: string;
  oneLineDesc: string;
  highlights: string[];
  href: string;
  ctaLabel: string;
  accentColor: string;
}

const FLAGSHIP_APPS: FlagshipAppCard[] = [
  {
    id: "codepitfall",
    department: "💻 はたらく・まなぶ部門 フラッグシップ",
    deptColor: "#1d4ed8",
    deptBg: "#eff6ff",
    deptBorder: "#bfdbfe",
    icon: "🪞",
    title: "CodePitfall Mirror",
    tagline: "VS Code・ターミナル・GitHub のエラー補助サイドキック",
    oneLineDesc:
      "コードは VS Code で書くまま。エラーが出た瞬間に貼るだけで3秒原因診断・過去クセDNA照合・AI修正指示＆角の立たない質問文を1クリック生成します。",
    highlights: [
      "🚨 エラー貼り付け＆Ctrl+Enterで3秒原因特定＋過去クセ一致アラート",
      "🤖 VS Code / AI 修正指示コピー ＆ 先輩への角の立たない質問文・README追記メモ生成",
      "🧬 自分のクセDNA記憶（localStorage＋.codepitfall.json / .md 保存）",
    ],
    href: "/codemistake",
    ctaLabel: "CodePitfall Mirror を開く →",
    accentColor: "#2563eb",
  },
  {
    id: "otayori",
    department: "🏠 暮らしと家族の部門 フラッグシップ",
    deptColor: "#c2410c",
    deptBg: "#fff7ed",
    deptBorder: "#fed7aa",
    icon: "🍊",
    title: "おたよりバトン Ultra",
    tagline: "あらゆる紙の通知・お薬説明書・プリントを家族4役のバトンへ",
    oneLineDesc:
      "学校プリント・病院や薬局の説明書・役所の通知・家族メモを写真やテキストから構造化し、ママ・パパ・子ども・祖父母の役割分担とカレンダー登録まで1画面で完結します。",
    highlights: [
      "💊 お薬・アレルギー・体調注意バッジ自動抽出 ＆ 園・学校・窓口への返信／欠席クッション文生成",
      "📅 Googleカレンダー1クリック登録・.ics一括出力・LINE家族共有フォーマット",
      "🔊 料理中のハンズフリー音声読み上げ ＆ 祖父母向けやさしい3行要約",
    ],
    href: "/otayori",
    ctaLabel: "おたよりバトン Ultra を開く →",
    accentColor: "#ea580c",
  },
  {
    id: "machieye",
    department: "🌏 まちと地球の未来部門 フラッグシップ",
    deptColor: "#047857",
    deptBg: "#ecfdf5",
    deptBorder: "#a7f3d0",
    icon: "🛰️",
    title: "MachiEye Live",
    tagline: "街の危険・バリアフリー点検 ＆ 防災・災害対策AIレーダー",
    oneLineDesc:
      "日常の段差・点字ブロック破損・夜道死角から、豪雨冠水・停電断水・ペット同行避難・猛暑日陰ルートまで写真1枚でAI診断し、地域マップと自治体要望書を生成します。",
    highlights: [
      "♿ 車椅子・ベビーカー・高齢者向けの具体的な「バリアフリー迂回・防災安全アドバイス」",
      "🌐 4言語（やさしい日本語 / 英 / 中 / 韓）あんしん注意カードの1クリック切替＆コピー",
      "🗺️ 地域安全ピンマップ ＆ 自治体担当課あて通報・改善要望レポート自動作成",
    ],
    href: "/machieye",
    ctaLabel: "MachiEye Live を開く →",
    accentColor: "#059669",
  },
];

export default function HomePage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        color: "#0f172a",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Hiragino Sans", "Noto Sans JP", sans-serif',
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Clean Google-Minimalist Top Header */}
      <header
        style={{
          background: "#ffffff",
          borderBottom: "1px solid #e2e8f0",
          position: "sticky",
          top: 0,
          zIndex: 20,
        }}
      >
        <div
          style={{
            maxWidth: 1080,
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
                border: "1px solid #bfdbfe",
                fontSize: 18,
              }}
            >
              ✦
            </span>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    fontSize: 16,
                    fontWeight: 800,
                    color: "#0f172a",
                    letterSpacing: "-0.01em",
                  }}
                >
                  Everyday AI Flagships
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: "#f1f5f9",
                    color: "#475569",
                    border: "1px solid #cbd5e1",
                  }}
                >
                  Apache-2.0 Open Source
                </span>
              </div>
              <div style={{ fontSize: 11.5, color: "#64748b" }}>
                ログイン不要・設定不要ですぐ使える3部門フラッグシップAIスイート
              </div>
            </div>
          </div>

          <nav
            aria-label="フラッグシップナビゲーション"
            style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}
          >
            <Link
              href="/codemistake"
              style={{
                fontSize: 12.5,
                fontWeight: 700,
                color: "#1d4ed8",
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                padding: "7px 12px",
                borderRadius: 8,
                textDecoration: "none",
              }}
            >
              🪞 CodePitfall
            </Link>
            <Link
              href="/otayori"
              style={{
                fontSize: 12.5,
                fontWeight: 700,
                color: "#c2410c",
                background: "#fff7ed",
                border: "1px solid #fed7aa",
                padding: "7px 12px",
                borderRadius: 8,
                textDecoration: "none",
              }}
            >
              🍊 おたよりバトン
            </Link>
            <Link
              href="/machieye"
              style={{
                fontSize: 12.5,
                fontWeight: 700,
                color: "#047857",
                background: "#ecfdf5",
                border: "1px solid #a7f3d0",
                padding: "7px 12px",
                borderRadius: 8,
                textDecoration: "none",
              }}
            >
              🛰️ MachiEye
            </Link>
            <Link
              href="/gitbridge"
              style={{
                fontSize: 12.5,
                fontWeight: 700,
                color: "#334155",
                background: "#f1f5f9",
                border: "1px solid #cbd5e1",
                padding: "7px 12px",
                borderRadius: 8,
                textDecoration: "none",
              }}
            >
              🌉 GitBridge
            </Link>
            <Link
              href="/whatif"
              style={{
                fontSize: 12.5,
                fontWeight: 700,
                color: "#6b21a8",
                background: "#faf5ff",
                border: "1px solid #e9d5ff",
                padding: "7px 12px",
                borderRadius: 8,
                textDecoration: "none",
              }}
            >
              🧪 Labs
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main
        style={{
          maxWidth: 1080,
          margin: "0 auto",
          padding: "36px 20px 64px",
          flex: 1,
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        {/* Minimalist Daylight Hero Section */}
        <section
          style={{
            textAlign: "center",
            maxWidth: 760,
            margin: "0 auto 36px",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "5px 14px",
              borderRadius: 999,
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              fontSize: 12,
              fontWeight: 700,
              color: "#334155",
              marginBottom: 14,
              boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
            }}
          >
            <span>🇯🇵 Google Gemini 3 Flash マルチモーダル × 非AI決定的ガード搭載</span>
            <span style={{ color: "#cbd5e1" }}>•</span>
            <span>完全無料・ローカルSSD保存対応</span>
          </div>

          <h1
            style={{
              fontSize: "clamp(1.65rem, 3vw, 2.25rem)",
              fontWeight: 800,
              color: "#0f172a",
              letterSpacing: "-0.02em",
              lineHeight: 1.35,
              margin: "0 0 12px 0",
            }}
          >
            迷わず使えて、ひとつの仕事を最高にうまくこなす。
          </h1>
          <p
            style={{
              fontSize: 14.5,
              color: "#475569",
              lineHeight: 1.7,
              margin: 0,
            }}
          >
            「はたらく・まなぶ」「暮らしと家族」「まちと地球の未来」の3部門それぞれで、
            日常の困りごとを<strong>1クリック・3秒</strong>で解決するフラッグシップAIアプリです。
          </p>
        </section>

        {/* 3 Flagship Masterpiece Cards */}
        <section
          aria-label="3部門フラッグシップアプリ一覧"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(310px, 1fr))",
            gap: 22,
            marginBottom: 28,
          }}
        >
          {FLAGSHIP_APPS.map((app) => (
            <div
              key={app.id}
              style={{
                background: "#ffffff",
                borderRadius: 18,
                border: "1px solid #cbd5e1",
                padding: "24px 22px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                boxShadow: "0 4px 20px rgba(15, 23, 42, 0.04)",
              }}
            >
              <div>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "4px 11px",
                    borderRadius: 999,
                    background: app.deptBg,
                    color: app.deptColor,
                    border: `1px solid ${app.deptBorder}`,
                    fontSize: 11.5,
                    fontWeight: 800,
                    marginBottom: 14,
                  }}
                >
                  {app.department}
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 10,
                  }}
                >
                  <span
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: app.deptBg,
                      border: `1px solid ${app.deptBorder}`,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 22,
                      flexShrink: 0,
                    }}
                  >
                    {app.icon}
                  </span>
                  <div>
                    <h2
                      style={{
                        fontSize: 19,
                        fontWeight: 800,
                        margin: 0,
                        color: "#0f172a",
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {app.title}
                    </h2>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: app.deptColor,
                        marginTop: 2,
                      }}
                    >
                      {app.tagline}
                    </div>
                  </div>
                </div>

                <p
                  style={{
                    fontSize: 13.5,
                    color: "#334155",
                    lineHeight: 1.65,
                    margin: "0 0 16px 0",
                  }}
                >
                  {app.oneLineDesc}
                </p>

                <div
                  style={{
                    borderTop: "1px solid #f1f5f9",
                    paddingTop: 14,
                    marginBottom: 20,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  {app.highlights.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        fontSize: 12.5,
                        color: "#475569",
                        lineHeight: 1.5,
                        fontWeight: 600,
                      }}
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <Link
                href={app.href}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "12px 18px",
                  borderRadius: 12,
                  background: app.accentColor,
                  color: "#ffffff",
                  fontSize: 14,
                  fontWeight: 800,
                  textDecoration: "none",
                  boxShadow: "0 2px 8px rgba(15, 23, 42, 0.12)",
                }}
              >
                {app.ctaLabel}
              </Link>
            </div>
          ))}
        </section>

        {/* Companion Banner: GitBridge (VS Code & GitHub Beginner Workflow Guide) */}
        <section
          aria-label="GitBridge 補助ツール"
          style={{
            background: "#ffffff",
            borderRadius: 16,
            border: "1px solid #cbd5e1",
            padding: "20px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: "#f1f5f9",
                border: "1px solid #cbd5e1",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
                flexShrink: 0,
              }}
            >
              🌉
            </span>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <h3
                  style={{
                    fontSize: 15.5,
                    fontWeight: 800,
                    margin: 0,
                    color: "#0f172a",
                  }}
                >
                  GitBridge Companion（VS Code × GitHub 連携ガイド）
                </h3>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: "#eff6ff",
                    color: "#1d4ed8",
                  }}
                >
                  CodePitfall Mirror 連携
                </span>
              </div>
              <p
                style={{
                  fontSize: 13,
                  color: "#475569",
                  margin: "4px 0 0 0",
                }}
              >
                初めての Git commit / push / PR 作成やコンフリクト解消で迷ったときに、安全なコマンド手順を1クリックでコピーできます。
              </p>
            </div>
          </div>

          <Link
            href="/gitbridge"
            style={{
              padding: "10px 16px",
              borderRadius: 10,
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              color: "#1d4ed8",
              fontSize: 13,
              fontWeight: 800,
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            🌉 GitHub の基本手順を見る →
          </Link>
        </section>

        {/* Experimental Labs Section: WhatIf Mirror */}
        <section
          aria-label="実験ツール・Labs"
          style={{
            marginTop: 18,
            background: "#ffffff",
            borderRadius: 16,
            border: "1px dashed #c084fc",
            padding: "18px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: "#f5f3ff",
                border: "1px solid #ddd6fe",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
                flexShrink: 0,
              }}
            >
              🧪
            </span>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <h3
                  style={{
                    fontSize: 15.5,
                    fontWeight: 800,
                    margin: 0,
                    color: "#0f172a",
                  }}
                >
                  🧪 Labs（実験ツール）：WhatIf Mirror
                </h3>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: "#f3e8ff",
                    color: "#7e22ce",
                  }}
                >
                  反実仮想 do(X) シミュレーター
                </span>
              </div>
              <p
                style={{
                  fontSize: 13,
                  color: "#475569",
                  margin: "4px 0 0 0",
                }}
              >
                「もし別の選択をしたら？」と見落としがちな隠れ要因（交絡因子）をブラウザ内0msリアルタイムSVG＋Gemini構造分析で可視化します。
              </p>
            </div>
          </div>

          <Link
            href="/whatif"
            style={{
              padding: "10px 16px",
              borderRadius: 10,
              background: "#f5f3ff",
              border: "1px solid #ddd6fe",
              color: "#7e22ce",
              fontSize: 13,
              fontWeight: 800,
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            🧪 反実仮想を試す →
          </Link>
        </section>

        {/* Minimalist Footer */}
        <footer
          style={{
            marginTop: 36,
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
            ログイン不要・データはお使いのブラウザとPC/スマホに保存 • Apache-2.0 Open Source
          </div>
          <a
            href="https://github.com/JY4844/codepitfall-apps/issues/new?title=%5BFlagship%5D+%E6%84%9F%E6%83%B3%E3%83%BB%E6%94%B9%E5%96%84%E8%A6%81%E6%9C%9B"
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
