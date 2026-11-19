import type { Metadata } from "next";
import ShowcaseApp from "@/components/ShowcaseApp";

export const metadata: Metadata = {
  title: "バリアフリー街歩きマップ — 段差・スロープ通行難易度共有 AI",
  description: "車いす・ベビーカー目線の現場写真から通行難易度と迂回ルートを構造化し、地域マップを構築する共創 AI",
};

export default function BarrierFreePage() {
  return <ShowcaseApp appId="barrierfree" />;
}
