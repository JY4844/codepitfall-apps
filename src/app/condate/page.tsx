import type { Metadata } from "next";
import ShowcaseApp from "@/components/ShowcaseApp";

export const metadata: Metadata = {
  title: "1週間まとめ買い＆使い切り献立プランナー AI",
  description: "食材ロスゼロの平日5日献立と売り場別買い物リストを自動生成する AI アプリ",
};

export default function CondatePage() {
  return <ShowcaseApp appId="condate" />;
}
