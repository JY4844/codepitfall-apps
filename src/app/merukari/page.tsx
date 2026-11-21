import type { Metadata } from "next";
import ShowcaseApp from "@/components/ShowcaseApp";

export const metadata: Metadata = {
  title: "フリマ出品・説明文＆梱包トラブル防止 AI",
  description: "売れやすいフリマ出品文と最安発送・梱包チェックを自動作成する AI アプリ",
};

export default function MerukariPage() {
  return <ShowcaseApp appId="merukari" />;
}
