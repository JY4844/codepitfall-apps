import type { Metadata } from "next";
import ShowcaseApp from "@/components/ShowcaseApp";

export const metadata: Metadata = {
  title: "控除・医療費スッキリナビ — 年末調整＆確定申告書類整理 AI",
  description: "控除証明書や病院領収書から年末調整・確定申告の記入先と必要書類を整理する AI アプリ",
};

export default function NenmatsuPage() {
  return <ShowcaseApp appId="nenmatsu" />;
}
