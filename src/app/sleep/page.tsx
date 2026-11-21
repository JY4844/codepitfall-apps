import type { Metadata } from "next";
import ShowcaseApp from "@/components/ShowcaseApp";

export const metadata: Metadata = {
  title: "睡眠リズム・寝不足リカバリーコーチ AI",
  description: "寝不足の日の乗り切り方と今夜の入眠ルーティンを整える AI アプリ",
};

export default function SleepPage() {
  return <ShowcaseApp appId="sleep" />;
}
