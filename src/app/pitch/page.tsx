import type { Metadata } from "next";
import ShowcaseApp from "@/components/ShowcaseApp";

export const metadata: Metadata = {
  title: "90秒ピッチ・面接リハーサルコーチ — 想定質問＆改善原稿 AI",
  description: "発表原稿やESから審査員・面接官の鋭い想定質問と説得力を高める改善案を生成する AI コーチ",
};

export default function PitchPage() {
  return <ShowcaseApp appId="pitch" />;
}
