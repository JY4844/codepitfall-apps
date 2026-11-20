import type { Metadata } from "next";
import ShowcaseApp from "@/components/ShowcaseApp";

export const metadata: Metadata = {
  title: "子どもの「なぜなぜ」図鑑メーカー — 親子探究 AI",
  description: "子どもの素朴な疑問をやさしい例え話・5分実験・お話し台本に変換する AI アプリ",
};

export default function NazenazePage() {
  return <ShowcaseApp appId="nazenaze" />;
}
