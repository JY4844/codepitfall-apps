import type { Metadata } from "next";
import ShowcaseApp from "@/components/ShowcaseApp";

export const metadata: Metadata = {
  title: "電気代・光熱費ムダ発見＆プラン見直し AI",
  description: "電気・ガス代急増の原因を特定し無理なく節電する省エネ家計ナビ AI アプリ",
};

export default function DenkiPage() {
  return <ShowcaseApp appId="denki" />;
}
