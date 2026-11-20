import type { Metadata } from "next";
import ShowcaseApp from "@/components/ShowcaseApp";

export const metadata: Metadata = {
  title: "名もなき家事みえる化＆感謝ログ — 家事分担サポート AI",
  description: "1日の家事メモから見えない負担を可視化し、無理のない分担と感謝メッセージを作る AI アプリ",
};

export default function KajiPage() {
  return <ShowcaseApp appId="kaji" />;
}
