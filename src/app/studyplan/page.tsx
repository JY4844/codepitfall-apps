import type { Metadata } from "next";
import ShowcaseApp from "@/components/ShowcaseApp";

export const metadata: Metadata = {
  title: "テスト・資格逆算スキマ学習ナビ AI",
  description: "試験日とスキマ時間から計画倒れしない逆算学習プランを作る AI アプリ",
};

export default function StudyPlanPage() {
  return <ShowcaseApp appId="studyplan" />;
}
