import type { Metadata } from "next";
import ShowcaseApp from "@/components/ShowcaseApp";

export const metadata: Metadata = {
  title: "冷蔵庫スッキリ献立 AI — 残り物救済＆時短レシピ",
  description: "冷蔵庫の残り物から買い足しゼロの時短レシピと食材使い切り順を提案する AI アプリ",
};

export default function FridgePage() {
  return <ShowcaseApp appId="fridge" />;
}
