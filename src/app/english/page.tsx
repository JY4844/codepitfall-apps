import type { Metadata } from "next";
import ShowcaseApp from "@/components/ShowcaseApp";

export const metadata: Metadata = {
  title: "専門英語・論文スキャナー — 英語論文＆技術文書リーディング AI",
  description: "英語論文や海外エラー画面から背景前提・3行要約・英語質問文まで一括生成する AI ツール",
};

export default function EnglishPage() {
  return <ShowcaseApp appId="english" />;
}
