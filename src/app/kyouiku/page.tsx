import type { Metadata } from "next";
import ShowcaseApp from "@/components/ShowcaseApp";

export const metadata: Metadata = {
  title: "子どものスマホ・ゲーム約束円満合意 AI",
  description: "親子で納得できるデジタルルール表とケンカしない声かけ例を作る AI アプリ",
};

export default function KyouikuPage() {
  return <ShowcaseApp appId="kyouiku" />;
}
