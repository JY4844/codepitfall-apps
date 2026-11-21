import type { Metadata } from "next";
import ShowcaseApp from "@/components/ShowcaseApp";

export const metadata: Metadata = {
  title: "ふるさと納税・年末駆け込み失敗防止ナビ AI",
  description: "ワンストップ特例の落とし穴と冷凍庫パンクを防ぐふるさと納税ナビ AI アプリ",
};

export default function FurusatoPage() {
  return <ShowcaseApp appId="furusato" />;
}
