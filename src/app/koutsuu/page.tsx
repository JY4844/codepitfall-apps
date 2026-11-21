import type { Metadata } from "next";
import ShowcaseApp from "@/components/ShowcaseApp";

export const metadata: Metadata = {
  title: "悪天候・台風・交通マヒ初動ナビ AI",
  description: "台風や大雪時の安全な移動判断と職場・取引先連絡文を整える AI アプリ",
};

export default function KoutsuuPage() {
  return <ShowcaseApp appId="koutsuu" />;
}
