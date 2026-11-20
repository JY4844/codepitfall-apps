import type { Metadata } from "next";
import ShowcaseApp from "@/components/ShowcaseApp";

export const metadata: Metadata = {
  title: "サブスク解約忘れガード — 固定費見直し＆期限通知 AI",
  description: "明細や契約メモから隠れ固定費と自動課金リスクを抽出しカレンダーへ自動通知する AI アプリ",
};

export default function SubscPage() {
  return <ShowcaseApp appId="subsc" />;
}
