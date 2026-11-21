import type { Metadata } from "next";
import ShowcaseApp from "@/components/ShowcaseApp";

export const metadata: Metadata = {
  title: "雨の日・休日のお出かけ即決プランナー AI",
  description: "天候・年齢・予算に合わせて休日のお出かけ先を10秒で即決する AI アプリ",
};

export default function KyujitsuPage() {
  return <ShowcaseApp appId="kyujitsu" />;
}
