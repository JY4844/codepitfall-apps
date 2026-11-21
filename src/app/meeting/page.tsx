import type { Metadata } from "next";
import ShowcaseApp from "@/components/ShowcaseApp";

export const metadata: Metadata = {
  title: "ダラダラ会議防止・アジェンダ設計コーチ AI",
  description: "短時間で結論が出るタイム配分と事前共有アジェンダを自動作成する AI アプリ",
};

export default function MeetingPage() {
  return <ShowcaseApp appId="meeting" />;
}
