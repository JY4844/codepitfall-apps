import type { Metadata } from "next";
import ShowcaseApp from "@/components/ShowcaseApp";

export const metadata: Metadata = {
  title: "保証書・家電修理サポート一発整理 AI",
  description: "家電の故障時に保証確認と修理フォーム用説明文を最短整理する AI アプリ",
};

export default function HoshoshoPage() {
  return <ShowcaseApp appId="hoshosho" />;
}
