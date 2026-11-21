import type { Metadata } from "next";
import ShowcaseApp from "@/components/ShowcaseApp";

export const metadata: Metadata = {
  title: "親の終活・デジタル遺品エンディング整理 AI",
  description: "聞きにくい親の契約・スマホ管理を角を立てずに整理する家族向け AI アプリ",
};

export default function SouzokuPage() {
  return <ShowcaseApp appId="souzoku" />;
}
