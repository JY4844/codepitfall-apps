import type { Metadata } from "next";
import ShowcaseApp from "@/components/ShowcaseApp";

export const metadata: Metadata = {
  title: "ごみ分別カメラ — 迷うごみの分別判定＆収集日カレンダー連携 AI",
  description: "写真と自治体情報から正確な分別区分と火災防止手順を判定し、収集日を Google カレンダー登録するエコ AI",
};

export default function GomiPage() {
  return <ShowcaseApp appId="gomi" />;
}
