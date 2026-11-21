import type { Metadata } from "next";
import ShowcaseApp from "@/components/ShowcaseApp";

export const metadata: Metadata = {
  title: "電話苦手さん用・30秒通話台本メーカー AI",
  description: "役所やサポートセンターへ電話する前の緊張をなくす会話台本を作成する AI アプリ",
};

export default function DenwaPage() {
  return <ShowcaseApp appId="denwa" />;
}
