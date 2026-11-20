import type { Metadata } from "next";
import ShowcaseApp from "@/components/ShowcaseApp";

export const metadata: Metadata = {
  title: "空き家・地域資源マッチング診断 — まちづくり AI",
  description: "地域の空き家や遊休施設から活用プラン・安全確認・自治体相談メモを立案する AI アプリ",
};

export default function AkiyaPage() {
  return <ShowcaseApp appId="akiya" />;
}
