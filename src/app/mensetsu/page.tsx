import type { Metadata } from "next";
import ShowcaseApp from "@/components/ShowcaseApp";

export const metadata: Metadata = {
  title: "転職・就活・面接想定問答コーチ AI",
  description: "志望先と経歴から深掘り質問と1分回答スクリプトを作成する AI アプリ",
};

export default function MensetsuPage() {
  return <ShowcaseApp appId="mensetsu" />;
}
