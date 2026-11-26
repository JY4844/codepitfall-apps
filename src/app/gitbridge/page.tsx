import type { Metadata } from "next";
import CodePitfallUnified from "@/components/CodePitfallUnified";

export const metadata: Metadata = {
  title: "GitBridge — はじめての GitHub 読解＆秘密漏洩ゼロ安全公開ガイド",
  description:
    "外部 GitHub リポジトリの読解ガイド生成から .env 秘密情報自動マスキング付き安全公開手順まで、初心者を導く Gemini 3 開発コンパニオン",
};

export default function GitBridgePage() {
  return <CodePitfallUnified initialTab="github" />;
}
