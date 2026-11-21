import type { Metadata } from "next";
import CodePitfallMirror from "@/components/CodePitfallMirror";

export const metadata: Metadata = {
  title: "CodePitfall Mirror — VS Code / GitHub エラー即解決＆過去クセDNA補助ツール",
  description:
    "VS Code や GitHub でエラーが出た瞬間に貼り付けるだけ。3秒で分かる原因・過去クセDNA一致アラート・VS Code/AI用ワンクリック修正指示コピーを備えた開発サイドキック",
};

export default function CodeMistakePage() {
  return <CodePitfallMirror />;
}
