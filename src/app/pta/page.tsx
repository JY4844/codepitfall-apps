import type { Metadata } from "next";
import ShowcaseApp from "@/components/ShowcaseApp";

export const metadata: Metadata = {
  title: "PTA・町内会おしらせ回覧 AI — 柔らかい連絡文＆個人情報確認",
  description: "役員のメモから角の立たない回覧文・出欠催促・個人情報配慮チェックを一括生成する AI アプリ",
};

export default function PtaPage() {
  return <ShowcaseApp appId="pta" />;
}
