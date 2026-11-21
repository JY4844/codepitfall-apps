import type { Metadata } from "next";
import ShowcaseApp from "@/components/ShowcaseApp";

export const metadata: Metadata = {
  title: "週末15分ズボラ片付け＆大掃除順番ナビ AI",
  description: "散らかった部屋から達成感が出る最短片付け手順を指示する AI アプリ",
};

export default function SoujiPage() {
  return <ShowcaseApp appId="souji" />;
}
