import type { Metadata } from "next";
import ShowcaseApp from "@/components/ShowcaseApp";

export const metadata: Metadata = {
  title: "園・学校連絡帳＆欠席連絡クッション AI",
  description: "忙しい朝の保育園・小学校連絡文を10秒で丁寧に整える AI アプリ",
};

export default function RenrakuchoPage() {
  return <ShowcaseApp appId="renrakucho" />;
}
