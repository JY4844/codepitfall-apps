import type { Metadata } from "next";
import ShowcaseApp from "@/components/ShowcaseApp";

export const metadata: Metadata = {
  title: "自転車ルール・安全点検＆保険確認ナビ AI",
  description: "通勤・送迎自転車の交通ルール注意点と安全点検・保険確認をまとめる AI アプリ",
};

export default function BicyclePage() {
  return <ShowcaseApp appId="bicycle" />;
}
