import type { Metadata } from "next";
import ShowcaseApp from "@/components/ShowcaseApp";

export const metadata: Metadata = {
  title: "介護・通院バトンノート — 家族間の介護引き継ぎ自動化 AI",
  description: "デイサービス連絡帳や診察メモから体調変化と家族間の引き継ぎ事項を自動構造化する AI アプリ",
};

export default function KaigoPage() {
  return <ShowcaseApp appId="kaigo" />;
}
