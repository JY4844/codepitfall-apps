import type { Metadata } from "next";
import ShowcaseApp from "@/components/ShowcaseApp";

export const metadata: Metadata = {
  title: "遅延・子連れ迂回レスキュー — 移動トラブル＆遅刻連絡 AI",
  description: "電車遅延やベビーカー・大荷物移動時の迂回判断と遅刻連絡文を整理する AI アプリ",
};

export default function NorikaePage() {
  return <ShowcaseApp appId="norikae" />;
}
