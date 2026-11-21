import type { Metadata } from "next";
import OtayoriUltra from "@/components/OtayoriUltra";

export const metadata: Metadata = {
  title: "おたよりバトン Ultra — 暮らしと家族の AI お知らせ＆家族バトンハブ",
  description:
    "学校・保育園のおたより・小児科予防接種・自治体検診通知を撮影またはワンクリック選択。Gemini 2.5 Flash が予定・持ち物・4役バトン（ママ・パパ・子ども・祖父母）を抽出し、Googleカレンダー登録・.ics一括出力・LINE共有・音声読み上げまで完結します。",
};

export default function OtayoriPage() {
  return <OtayoriUltra />;
}
