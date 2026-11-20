import type { Metadata } from "next";
import ShowcaseApp from "@/components/ShowcaseApp";

export const metadata: Metadata = {
  title: "副業インボイス・経費仕分けコーチ — 事務効率化 AI",
  description: "副業の領収書や案件メモから経費区分・インボイス確認・請求メールを一括作成する AI アプリ",
};

export default function InvoicePage() {
  return <ShowcaseApp appId="invoice" />;
}
