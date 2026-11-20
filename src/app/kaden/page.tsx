import type { Metadata } from "next";
import ShowcaseApp from "@/components/ShowcaseApp";

export const metadata: Metadata = {
  title: "家電・保証書トラブルレスキュー — 故障切り分け＆修理連絡 AI",
  description: "家電の型番やエラー表示から保証確認・応急処置・メーカー修理依頼メモを生成する AI アプリ",
};

export default function KadenPage() {
  return <ShowcaseApp appId="kaden" />;
}
