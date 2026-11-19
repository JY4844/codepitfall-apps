import type { Metadata } from "next";
import ShowcaseApp from "@/components/ShowcaseApp";

export const metadata: Metadata = {
  title: "地域の熱中症・みまもり予報 — 対象別危険度＆予防アクション AI",
  description: "気象と屋外イベント情報から子ども・高齢者別の熱中症危険度と予防行動を生成する地域防災 AI",
};

export default function HeatstrokePage() {
  return <ShowcaseApp appId="heatstroke" />;
}
