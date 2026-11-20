import type { Metadata } from "next";
import ShowcaseApp from "@/components/ShowcaseApp";

export const metadata: Metadata = {
  title: "ご近所・マンション相談クッション AI — 地域調和サポート",
  description: "近隣のモヤモヤを角の立たない管理会社・自治会相談メモへ変換する AI アプリ",
};

export default function GokinjoPage() {
  return <ShowcaseApp appId="gokinjo" />;
}
