import type { Metadata } from "next";
import ShowcaseApp from "@/components/ShowcaseApp";

export const metadata: Metadata = {
  title: "洗濯・部屋干し生乾き＆天気急変レスキュー AI",
  description: "生乾き臭ゼロの干し方と家電配置を即提案する洗濯レスキュー AI アプリ",
};

export default function SentakuPage() {
  return <ShowcaseApp appId="sentaku" />;
}
