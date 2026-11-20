import type { Metadata } from "next";
import ShowcaseApp from "@/components/ShowcaseApp";

export const metadata: Metadata = {
  title: "クレーム・お断りメール角なし変換 AI",
  description: "言いにくい断りや催促の本音を相手別の丁寧なビジネス文面へ変換する AI アシスタント",
};

export default function SoftmailPage() {
  return <ShowcaseApp appId="softmail" />;
}
