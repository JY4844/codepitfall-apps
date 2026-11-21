import type { Metadata } from "next";
import ShowcaseApp from "@/components/ShowcaseApp";

export const metadata: Metadata = {
  title: "手土産・お祝いギフト失敗ゼロ相談 AI",
  description: "相手の好み・予算・マナーに合わせて外さないギフト案とのし・挨拶文を提案する AI アプリ",
};

export default function GiftPage() {
  return <ShowcaseApp appId="gift" />;
}
