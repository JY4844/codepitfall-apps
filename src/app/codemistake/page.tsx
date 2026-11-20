import type { Metadata } from "next";
import ShowcaseApp from "@/components/ShowcaseApp";

export const metadata: Metadata = {
  title: "パーソナル・コードミス＆作業落とし穴チェッカー AI",
  description: "自分のやりがちミス履歴と作業別よくある間違いテンプレートでバグを未然に防ぐ AI アプリ",
};

export default function CodeMistakePage() {
  return <ShowcaseApp appId="codemistake" />;
}
