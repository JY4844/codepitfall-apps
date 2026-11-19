import type { Metadata } from "next";
import ShowcaseApp from "@/components/ShowcaseApp";

export const metadata: Metadata = {
  title: "まちのフードドライブ支援 — 余剰食品仕分け＆寄付リスト作成 AI",
  description: "余剰食品の写真からフードバンク受入可否を判定し寄付リストを作成する食品ロス削減 AI",
};

export default function FoodlossPage() {
  return <ShowcaseApp appId="foodloss" />;
}
