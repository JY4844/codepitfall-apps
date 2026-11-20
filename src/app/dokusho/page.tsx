import type { Metadata } from "next";
import ShowcaseApp from "@/components/ShowcaseApp";

export const metadata: Metadata = {
  title: "読書メモ「行動アクション」変換 AI — 学び定着コーチ",
  description: "本や記事の読書メモを今週試す3つの行動と復習予定へ変換する AI アプリ",
};

export default function DokushoPage() {
  return <ShowcaseApp appId="dokusho" />;
}
