import type { Metadata } from "next";
import Link from "next/link";
import GitBridge from "@/components/GitBridge";

export const metadata: Metadata = {
  title: "GitBridge — コード初心者の GitHub 学習＆安全公開ナビ",
  description:
    "GitHub リポジトリから読む順番・用語・クイズを自動生成し、API キー漏れを防ぎながら初めての GitHub 公開まで伴走する AI 学習ツール",
};

export default function GitBridgePage() {
  return (
    <div>
      <div
        style={{
          background: "linear-gradient(90deg, #1e1b4b 0%, #0f172a 100%)",
          borderBottom: "1px solid rgba(99, 102, 241, 0.35)",
          padding: "10px 16px",
        }}
      >
        <div
          style={{
            maxWidth: 980,
            margin: "0 auto",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <span
            style={{
              fontSize: "0.84rem",
              color: "#e2e8f0",
              fontWeight: 600,
            }}
          >
            💡 GitHub へ push・PR する前に、自分のクセや「うっかりミス」を3秒で事前チェックできます
          </span>
          <Link
            href="/codemistake"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "linear-gradient(135deg, #4f46e5, #0284c7)",
              color: "#ffffff",
              padding: "7px 14px",
              borderRadius: 999,
              fontSize: "0.82rem",
              fontWeight: 800,
              textDecoration: "none",
              boxShadow: "0 4px 12px rgba(79, 70, 229, 0.35)",
            }}
          >
            🔍 コミット前にやりがちミスをチェック（CodePitfall Mirror へ）
          </Link>
        </div>
      </div>
      <GitBridge />
    </div>
  );
}
