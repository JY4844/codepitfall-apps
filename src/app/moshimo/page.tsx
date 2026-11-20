import type { Metadata } from "next";
import ShowcaseApp from "@/components/ShowcaseApp";

export const metadata: Metadata = {
  title: "もしもの家族手続きコンシェルジュ — 入院・介護・相続整理 AI",
  description: "親の入院や緊急時の銀行・保険・年金・高額療養費手続きを時系列と家族分担で整理する AI アプリ",
};

export default function MoshimoPage() {
  return <ShowcaseApp appId="moshimo" />;
}
