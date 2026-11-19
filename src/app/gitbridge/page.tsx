import type { Metadata } from "next";
import GitBridge from "@/components/GitBridge";

export const metadata: Metadata = {
  title: "GitBridge — コード初心者の GitHub 学習＆安全公開ナビ",
  description:
    "GitHub リポジトリから読む順番・用語・クイズを自動生成し、API キー漏れを防ぎながら初めての GitHub 公開まで伴走する AI 学習ツール",
};

export default function GitBridgePage() {
  return <GitBridge />;
}
