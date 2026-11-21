import type { Metadata } from "next";
import ShowcaseApp from "@/components/ShowcaseApp";

export const metadata: Metadata = {
  title: "子連れ・三世代バリアフリーお出かけナビ AI",
  description: "ベビーカー・シニア・休憩・雨天代替まで配慮した三世代お出かけプランナー AI アプリ",
};

export default function KankouPage() {
  return <ShowcaseApp appId="kankou" />;
}
