import type { Metadata } from "next";
import ShowcaseApp from "@/components/ShowcaseApp";

export const metadata: Metadata = {
  title: "地域の高齢者見守り・声かけサポート AI",
  description: "猛暑や寒波時に負担なく安否確認できる声かけガイドを作成する AI アプリ",
};

export default function MimamoriPage() {
  return <ShowcaseApp appId="mimamori" />;
}
