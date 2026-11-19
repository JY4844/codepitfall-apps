import type { Metadata } from "next";
import ShowcaseApp from "@/components/ShowcaseApp";

export const metadata: Metadata = {
  title: "ホワイトボード＆会議アクション化 — 決定事項・期限タスク抽出 AI",
  description: "会議後のホワイトボード写真やメモから決定事項と担当者別タスクを自動抽出する AI アプリ",
};

export default function MinutesPage() {
  return <ShowcaseApp appId="minutes" />;
}
