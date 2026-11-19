import type { Metadata } from "next";
import ShowcaseApp from "@/components/ShowcaseApp";

export const metadata: Metadata = {
  title: "まちの多言語あんしん案内メーカー — やさしい日本語＆英中韓生成 AI",
  description: "商店街POPや避難所チラシを撮るだけでやさしい日本語と英中韓の多言語案内を生成する共生 AI",
};

export default function InboundPage() {
  return <ShowcaseApp appId="inbound" />;
}
