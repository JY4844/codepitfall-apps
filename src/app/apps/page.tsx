import Link from "next/link";
import type { Metadata } from "next";
import { SHOWCASE_APPS } from "@/lib/showcaseConfigs";

export const metadata: Metadata = {
  title: "Google AI Challenge 2026 — 全 37 作品ポータル一覧",
  description: "3部門（はたらく・まなぶ / 暮らしと家族 / まちと地球の未来）の全 37 Gemini AI アプリ一覧",
};

interface AppCard {
  name: string;
  href: string;
  category: string;
  tagline: string;
  accent: string;
}

const CORE_APPS: AppCard[] = [
  {
    name: "GapTutor",
    href: "/",
    category: "はたらく・まなぶ部門",
    tagline: "数式・論文・専門書の「つまずきの前提」を特定し、知識依存マップと適応型演習を生成",
    accent: "#2563eb",
  },
  {
    name: "おたよりバトン",
    href: "/otayori",
    category: "暮らしと家族の部門",
    tagline: "学校プリントや自治体通知を撮るだけで母・父・祖母の3世代へ予定とやさしい要約を共有",
    accent: "#ea580c",
  },
  {
    name: "MachiEye",
    href: "/machieye",
    category: "まちと地球の未来部門",
    tagline: "街の危険箇所をプライバシー保護つきで緊急度判定・自治体通報票・地域マップ化",
    accent: "#0d9488",
  },
  {
    name: "GitBridge",
    href: "/gitbridge",
    category: "はたらく・まなぶ部門",
    tagline: "GitHub コードの読む順番・クイズ生成と API キー漏れ防止の安全公開ガイド",
    accent: "#4f46e5",
  },
];

const CATEGORIES = [
  "はたらく・まなぶ部門",
  "暮らしと家族の部門",
  "まちと地球の未来部門",
] as const;

export default function AppsPortalPage() {
  const showcaseCards: AppCard[] = Object.values(SHOWCASE_APPS).map((app) => ({
    name: app.name,
    href: `/${app.id}`,
    category: app.category,
    tagline: app.tagline,
    accent: app.accentColor,
  }));

  const allApps = [...CORE_APPS, ...showcaseCards];

  return (
    <main style={{ maxWidth: 1080, margin: "0 auto", padding: "32px 16px 64px" }}>
      <header style={{ marginBottom: 28 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 8,
          }}
        >
          <span
            style={{
              fontSize: "0.78rem",
              fontWeight: 700,
              padding: "4px 12px",
              borderRadius: 999,
              background: "#dbeafe",
              color: "#1d4ed8",
            }}
          >
            Google AI Challenge 2026 — 37 Apps Showcase
          </span>
          <a
            href="https://github.com/kotae-lab/google-ai-challenge-2026"
            target="_blank"
            rel="noreferrer"
            style={{
              fontSize: "0.85rem",
              fontWeight: 700,
              color: "#0f172a",
              textDecoration: "none",
              padding: "6px 14px",
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              background: "#fff",
            }}
          >
            GitHub リポジトリを見る ↗
          </a>
        </div>
        <h1 style={{ margin: "6px 0", fontSize: "1.85rem", fontWeight: 800 }}>
          全 {allApps.length} 作品 AI アプリポータル
        </h1>
        <p style={{ margin: 0, color: "#475569", fontSize: "0.95rem" }}>
          Gemini 3.8 Flash（マルチモーダル＋JSON Schema）× Next.js × Google Apps Script / Neon で構築した全作品へすぐアクセスできます。
        </p>
      </header>

      {CATEGORIES.map((cat) => {
        const items = allApps.filter((a) => a.category === cat);
        return (
          <section key={cat} style={{ marginBottom: 34 }}>
            <h2
              style={{
                fontSize: "1.15rem",
                fontWeight: 800,
                marginBottom: 14,
                paddingBottom: 6,
                borderBottom: "2px solid #e2e8f0",
              }}
            >
              {cat}（{items.length} 作品）
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                gap: 14,
              }}
            >
              {items.map((app) => (
                <Link
                  key={app.href}
                  href={app.href}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    padding: 16,
                    borderRadius: 12,
                    border: "1px solid #e2e8f0",
                    background: "#fff",
                    textDecoration: "none",
                    color: "#0f172a",
                    boxShadow: "0 1px 4px rgba(15,23,42,0.04)",
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 6,
                      }}
                    >
                      <strong style={{ fontSize: "1rem" }}>{app.name}</strong>
                      <span
                        style={{
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          color: "#fff",
                          background: app.accent,
                          padding: "2px 8px",
                          borderRadius: 999,
                        }}
                      >
                        {app.href}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: "0.85rem", color: "#475569", lineHeight: 1.5 }}>
                      {app.tagline}
                    </p>
                  </div>
                  <div
                    style={{
                      marginTop: 12,
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      color: app.accent,
                    }}
                  >
                    アプリを開く →
                  </div>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </main>
  );
}
