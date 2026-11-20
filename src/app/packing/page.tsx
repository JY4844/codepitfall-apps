import type { Metadata } from "next";
import ShowcaseApp from "@/components/ShowcaseApp";

export const metadata: Metadata = {
  title: "旅行パッキング・直前忘れ物ゼロ AI",
  description: "前日準備と当日朝の直前リストを分けて忘れ物を防ぐスマート荷造り AI アプリ",
};

export default function PackingPage() {
  return <ShowcaseApp appId="packing" />;
}
