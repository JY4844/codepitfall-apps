import type { Metadata } from "next";
import ShowcaseApp from "@/components/ShowcaseApp";

export const metadata: Metadata = {
  title: "わが家の防災バッグ診断 — 家族別備蓄チェック＆点検リマインド AI",
  description: "自宅の防災リュックや備蓄棚から家族構成に合わせた不足品と賞味期限を診断する AI アプリ",
};

export default function DisasterPage() {
  return <ShowcaseApp appId="disaster" />;
}
