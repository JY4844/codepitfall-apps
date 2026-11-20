import type { Metadata } from "next";
import ShowcaseApp from "@/components/ShowcaseApp";

export const metadata: Metadata = {
  title: "あやしい SMS・SNS 詐欺チェッカー — 家族防犯 AI",
  description: "親に届いた怪しい SMS や SNS 広告から詐欺手口と安全行動・相談メモを即診断する AI アプリ",
};

export default function SagiPage() {
  return <ShowcaseApp appId="sagi" />;
}
