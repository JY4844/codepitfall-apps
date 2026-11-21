import type { Metadata } from "next";
import ShowcaseApp from "@/components/ShowcaseApp";

export const metadata: Metadata = {
  title: "ガクチカ・自己PR 400字ES構成コーチ AI",
  description: "学生の経験メモを結論ファーストの400字ESドラフトへ構造化する AI アプリ",
};

export default function GakuchikaPage() {
  return <ShowcaseApp appId="gakuchika" />;
}
