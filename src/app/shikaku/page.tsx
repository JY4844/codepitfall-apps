import type { Metadata } from "next";
import ShowcaseApp from "@/components/ShowcaseApp";

export const metadata: Metadata = {
  title: "資格・試験「苦手つぶし」問題集メーカー",
  description: "間違えた問題や苦手単元から失点パターン分析・類題・暗記ポイントを自動生成する AI コーチ",
};

export default function ShikakuPage() {
  return <ShowcaseApp appId="shikaku" />;
}
