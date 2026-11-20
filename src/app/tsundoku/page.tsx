import type { Metadata } from "next";
import ShowcaseApp from "@/components/ShowcaseApp";

export const metadata: Metadata = {
  title: "積読・プロンプト資産化ダイジェスト AI",
  description: "溜まった積読メモや毎回打ち直すAI指示文を3行要約＋再利用テンプレートに変換する AI アプリ",
};

export default function TsundokuPage() {
  return <ShowcaseApp appId="tsundoku" />;
}
