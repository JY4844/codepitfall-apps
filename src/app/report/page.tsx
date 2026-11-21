import type { Metadata } from "next";
import ShowcaseApp from "@/components/ShowcaseApp";

export const metadata: Metadata = {
  title: "日報・週報・進捗報告 30秒スッキリ整理 AI",
  description: "箇条書き作業メモを結論ファーストの綺麗な日報・週報へ変換する AI アプリ",
};

export default function ReportPage() {
  return <ShowcaseApp appId="report" />;
}
