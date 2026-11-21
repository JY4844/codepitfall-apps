import type { Metadata } from "next";
import ShowcaseApp from "@/components/ShowcaseApp";

export const metadata: Metadata = {
  title: "冠婚葬祭・ご祝儀＆マナー即確認ナビ AI",
  description: "急な結婚式やお通夜での相場・表書き・服装・NGマナーを10秒確認できる AI アプリ",
};

export default function KankonPage() {
  return <ShowcaseApp appId="kankon" />;
}
