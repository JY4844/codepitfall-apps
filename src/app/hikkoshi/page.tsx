import type { Metadata } from "next";
import ShowcaseApp from "@/components/ShowcaseApp";

export const metadata: Metadata = {
  title: "引っ越し手続きバトンナビ — 転居タスク時系列整理 AI",
  description: "引っ越し条件から役所・インフラ・銀行の手続きを時系列と家族分担つきで整理する AI アプリ",
};

export default function HikkoshiPage() {
  return <ShowcaseApp appId="hikkoshi" />;
}
