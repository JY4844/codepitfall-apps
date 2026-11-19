import type { Metadata } from "next";
import MachiEye from "@/components/MachiEye";

export const metadata: Metadata = {
  title: "MachiEye — 街のヒヤリ・防災エコマップ AI",
  description:
    "街の側溝詰まりや道路陥没・不法投棄を撮るだけで、Gemini が緊急度判定・担当課振分・プライバシー検知・自治体通報文を構造化し、Google シートとマップへ連携するシビックテック AI。",
};

export default function MachiEyePage() {
  return <MachiEye />;
}
