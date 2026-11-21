import type { Metadata } from "next";
import ShowcaseApp from "@/components/ShowcaseApp";

export const metadata: Metadata = {
  title: "断水・停電・水害ローカル備蓄チェッカー AI",
  description: "世帯構成と階数から本当に不足している防災備蓄を診断する AI アプリ",
};

export default function WaterPage() {
  return <ShowcaseApp appId="water" />;
}
