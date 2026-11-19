import type { Metadata } from "next";
import ShowcaseApp from "@/components/ShowcaseApp";

export const metadata: Metadata = {
  title: "レシート家計コーチ — 自動家計簿＆3日分節約献立 AI",
  description: "スーパーのレシートから支出・栄養バランス・節約献立を自動生成する AI 家計コーチ",
};

export default function ReceiptPage() {
  return <ShowcaseApp appId="receipt" />;
}
