import type { Metadata } from "next";
import ShowcaseApp from "@/components/ShowcaseApp";

export const metadata: Metadata = {
  title: "コンビニ・外食バランス栄養ちょい足し AI",
  description: "忙しい日のコンビニ飯にあと1品足すだけで栄養バランスを整える AI アプリ",
};

export default function EiyouPage() {
  return <ShowcaseApp appId="eiyou" />;
}
