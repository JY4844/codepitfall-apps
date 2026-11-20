import type { Metadata } from "next";
import ShowcaseApp from "@/components/ShowcaseApp";

export const metadata: Metadata = {
  title: "退職・転職・育休手続きロードマップ AI",
  description: "健康保険・年金・雇用保険・住民税の切替手順を時系列で整理する AI アプリ",
};

export default function TaishokuPage() {
  return <ShowcaseApp appId="taishoku" />;
}
