import type { Metadata } from "next";
import ShowcaseApp from "@/components/ShowcaseApp";

export const metadata: Metadata = {
  title: "ネット通販・失敗＆サクラレビュー見抜き AI",
  description: "購入前にスペック・維持費・レビュー傾向の落とし穴を診断する買い物ガード AI アプリ",
};

export default function KaimonoPage() {
  return <ShowcaseApp appId="kaimono" />;
}
