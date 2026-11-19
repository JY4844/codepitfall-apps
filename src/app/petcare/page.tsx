import type { Metadata } from "next";
import ShowcaseApp from "@/components/ShowcaseApp";

export const metadata: Metadata = {
  title: "ペット症状メモ＆受診ガイド — 獣医師向け問診票作成 AI",
  description: "犬・猫の気になる症状メモから獣医師へ伝える時系列問診票と緊急度目安を整理する AI アプリ",
};

export default function PetcarePage() {
  return <ShowcaseApp appId="petcare" />;
}
