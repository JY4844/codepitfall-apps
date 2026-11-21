import type { Metadata } from "next";
import MachiEyeLive from "@/components/MachiEyeLive";

export const metadata: Metadata = {
  title: "MachiEye Live — 街のハザード＆バリアフリーAI検診・地域安全レーダーマップ",
  description:
    "街の段差・点字ブロック破損・側溝詰まり・通学路の死角を写真1枚でAI検診。地域コミュニティ安全ピンマップと自治体通報・改善要望レポートを1クリック生成するシビックテックAI。",
};

export default function MachiEyePage() {
  return <MachiEyeLive />;
}
