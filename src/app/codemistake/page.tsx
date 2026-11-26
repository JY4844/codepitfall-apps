import type { Metadata } from "next";
import CodePitfallUnified from "@/components/CodePitfallUnified";

export const metadata: Metadata = {
  title: "CodePitfallMirror Pro — エラー即解決・ミスクセDNA＆AGENTS.md自動生成",
  description:
    "VS Code・GitHub のエラー画面やログを Gemini 3 Vision + Decisions API で即診断し、やりがちミスDNAと AGENTS.md へ蓄積する開発補助アプリ",
};

export default function CodeMistakePage() {
  return <CodePitfallUnified initialTab="error" />;
}
