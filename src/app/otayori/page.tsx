import type { Metadata } from "next";
import OtayoriBaton from "@/components/OtayoriBaton";

export const metadata: Metadata = {
  title: "おたよりバトン — 暮らしと家族の AI お知らせハブ",
  description:
    "学校のおたより・自治体通知・お薬手帳を撮るだけ。Gemini 2.5 Flash が予定・持ち物・担当を抽出し、3世代の家族と Google Workspace へ届けます。",
};

export default function OtayoriPage() {
  return <OtayoriBaton />;
}
