import type { Metadata } from "next";
import ShowcaseApp from "@/components/ShowcaseApp";

export const metadata: Metadata = {
  title: "補助金・公的手続き期限ナビ AI",
  description: "窓口ごとにバラバラな公的手続き・補助金申請の期限と必要書類を整理する AI アプリ",
};

export default function ShinseiPage() {
  return <ShowcaseApp appId="shinsei" />;
}
