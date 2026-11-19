import type { Metadata } from "next";
import ShowcaseApp from "@/components/ShowcaseApp";

export const metadata: Metadata = {
  title: "アレルゲン安心レンズ — 食品パッケージ・外食アレルギー確認 AI",
  description: "食品の原材料表示やメニューから家族のアレルゲンと交差接触リスクを即警告する AI アプリ",
};

export default function AllergyPage() {
  return <ShowcaseApp appId="allergy" />;
}
