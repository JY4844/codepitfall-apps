import type { Metadata } from "next";
import CodePitfallMirror from "@/components/CodePitfallMirror";

export const metadata: Metadata = {
  title: "CodePitfall Mirror Ultra — パーソナル・コードミスDNA＆作業落とし穴チェッカー",
  description:
    "開発者個人のやりがちミスDNAを記憶・可視化し、GitHub URL直接監査・並列Diffビューア・音声作業宣言・6種の作業別落とし穴テンプレートで事故を未然に防ぐ次世代AI IDEチェッカー",
};

export default function CodeMistakePage() {
  return <CodePitfallMirror />;
}
