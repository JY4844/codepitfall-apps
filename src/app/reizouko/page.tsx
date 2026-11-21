import type { Metadata } from "next";
import ShowcaseApp from "@/components/ShowcaseApp";

export const metadata: Metadata = {
  title: "冷凍保存＆賞味期限レスキューガイド AI",
  description: "余りそうな食材をおいしく長持ちさせる冷凍手順と時短調理法を提案する AI アプリ",
};

export default function ReizoukoPage() {
  return <ShowcaseApp appId="reizouko" />;
}
