import type { Metadata } from "next";
import ShowcaseApp from "@/components/ShowcaseApp";

export const metadata: Metadata = {
  title: "診察室・症状メモ＆質問整理 AI",
  description: "診察室での伝え忘れを防ぐ医師向け症状サマリー＆質問リスト作成 AI アプリ",
};

export default function ByoinMemoPage() {
  return <ShowcaseApp appId="byoinmemo" />;
}
