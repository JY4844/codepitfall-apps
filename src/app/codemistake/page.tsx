import type { Metadata } from "next";
import CodePitfallMirror from "@/components/CodePitfallMirror";

export const metadata: Metadata = {
  title: "CodePitfall Mirror Pro — パーソナル・コードミス＆作業落とし穴チェッカー",
  description:
    "自分のやりがちミスDNAを記憶し、行単位バグ検出と作業別よくある間違いテンプレートで事故を防ぐ専用IDEチェッカー",
};

export default function CodeMistakePage() {
  return <CodePitfallMirror />;
}
