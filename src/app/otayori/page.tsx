import type { Metadata } from "next";
import OtayoriUltra from "@/components/OtayoriUltra";

export const metadata: Metadata = {
  title: "おたよりバトン Ultra — 暮らしと家族の AI お知らせ＆家族バトンハブ",
  description:
    "学校・保育園のおたより・小児科予防接種・自治体検診通知を撮影またはテキスト入力。Gemini 3 Flash が予定・持ち物・よくある注意点・家族バトンを抽出し、Googleカレンダー登録・.ics一括出力・原本アーカイブ・音声読み上げまで完結します。",
};

export default function OtayoriPage() {
  return <OtayoriUltra />;
}
