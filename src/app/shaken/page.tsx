import type { Metadata } from "next";
import ShowcaseApp from "@/components/ShowcaseApp";

export const metadata: Metadata = {
  title: "車検・自動車メンテ見積りチェック AI",
  description: "車検見積りの必須整備と任意項目を分かりやすく仕分けする AI アプリ",
};

export default function ShakenPage() {
  return <ShowcaseApp appId="shaken" />;
}
