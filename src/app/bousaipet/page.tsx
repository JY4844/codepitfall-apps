import type { Metadata } from "next";
import ShowcaseApp from "@/components/ShowcaseApp";

export const metadata: Metadata = {
  title: "ペット同行避難・防災カルテ整理 AI",
  description: "犬・猫など大切なペットとの同行避難・在宅避難準備を1分で整える AI アプリ",
};

export default function BousaiPetPage() {
  return <ShowcaseApp appId="bousaipet" />;
}
