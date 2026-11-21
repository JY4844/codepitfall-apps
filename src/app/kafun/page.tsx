import type { Metadata } from "next";
import ShowcaseApp from "@/components/ShowcaseApp";

export const metadata: Metadata = {
  title: "花粉・気象病コンディション予報コーチ AI",
  description: "低気圧頭痛や花粉・寒暖差の不調を先回りケアする AI アプリ",
};

export default function KafunPage() {
  return <ShowcaseApp appId="kafun" />;
}
