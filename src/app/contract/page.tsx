import type { Metadata } from "next";
import ShowcaseApp from "@/components/ShowcaseApp";

export const metadata: Metadata = {
  title: "規約・契約書イエローカード — 契約リスク診断＆確認メール作成 AI",
  description: "契約書や規約の不利な条項を3段階リスクで可視化し、丁寧な確認メール文面まで自動生成する AI ツール",
};

export default function ContractPage() {
  return <ShowcaseApp appId="contract" />;
}
