import type { Metadata } from "next";
import ShowcaseApp from "@/components/ShowcaseApp";

export const metadata: Metadata = {
  title: "添付ファイル＆メール送付前ミス防止 AI",
  description: "メール本文と添付ファイル名のズレや添付忘れを防ぎ分かりやすいファイル名を提案する AI アプリ",
};

export default function TenpuPage() {
  return <ShowcaseApp appId="tenpu" />;
}
