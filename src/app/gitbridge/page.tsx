import type { Metadata } from "next";
import CodePitfallUnified from "@/components/CodePitfallUnified";

export const metadata: Metadata = {
  title: "CodePitfall × GitBridge — はじめての GitHub 安全公開＆エラー即解決コンパニオン",
  description:
    "初心者向け GitHub 安全公開ガイド（GitBridge）とエラー即レス診断（CodePitfall Mirror）をひとつに統合した開発補助アプリ",
};

export default function GitBridgePage() {
  return <CodePitfallUnified initialTab="github" />;
}
