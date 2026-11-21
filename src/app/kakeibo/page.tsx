import type { Metadata } from "next";
import ShowcaseApp from "@/components/ShowcaseApp";

export const metadata: Metadata = {
  title: "固定費・カード明細スッキリ見直し AI",
  description: "カード明細の固定費を棚卸しして月数千円〜の削減順を提案する AI アプリ",
};

export default function KakeiboPage() {
  return <ShowcaseApp appId="kakeibo" />;
}
