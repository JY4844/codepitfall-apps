import type { Metadata } from "next";
import ShowcaseApp from "@/components/ShowcaseApp";

export const metadata: Metadata = {
  title: "業務引き継ぎ＆README 3分自動整理 AI",
  description: "属人化した業務メモを初見でも迷わない引き継ぎ書へ構造化する AI アプリ",
};

export default function HikitsugiPage() {
  return <ShowcaseApp appId="hikitsugi" />;
}
