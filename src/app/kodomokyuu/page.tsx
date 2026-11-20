import type { Metadata } from "next";
import ShowcaseApp from "@/components/ShowcaseApp";

export const metadata: Metadata = {
  title: "こども夜間安心トリアージメモ — #8000 相談＆観察整理 AI",
  description: "夜間・休日の子どもの急な発熱やケガの経過から観察ポイントと #8000 相談用メモを整理する AI アプリ",
};

export default function KodomokyuuPage() {
  return <ShowcaseApp appId="kodomokyuu" />;
}
