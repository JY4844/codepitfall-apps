import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://neon-task-manager.vercel.app"
  ),
  title: "GapTutor — 数式・専門書 AI 学習ハブ",
  description:
    "つまずきの前提知識を Gemini が特定し、段階演習と Neon 復習タスク・Google Workspace 連携へ変換する AI 学習ハブ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
