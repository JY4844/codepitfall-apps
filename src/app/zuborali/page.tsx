import type { Metadata } from "next";
import ShowcaseApp from "@/components/ShowcaseApp";

export const metadata: Metadata = {
  title: "ずぼらメモ・1行投げ込み自動仕分け AI",
  description: "分類不要で思いついたメモを予定・買い物・1行日記に自動整理する AI アプリ",
};

export default function ZuboraliPage() {
  return <ShowcaseApp appId="zuborali" />;
}
