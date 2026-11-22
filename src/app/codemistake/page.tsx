import type { Metadata } from "next";
import CodePitfallUnified from "@/components/CodePitfallUnified";

export const metadata: Metadata = {
  title: "CodePitfall × GitBridge — エラー即解決＆はじめての GitHub 安全公開コンパニオン",
  description:
    "VS Code・GitHub のエラー即レス診断・やりがちミスDNA・AGENTS.md出力と、初心者向け GitHub 安全公開ガイドをひとつに統合したオープンソース開発補助アプリ",
};

export default function CodeMistakePage() {
  return <CodePitfallUnified initialTab="error" />;
}
