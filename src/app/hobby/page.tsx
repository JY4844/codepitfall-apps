import type { Metadata } from "next";
import ShowcaseApp from "@/components/ShowcaseApp";

export const metadata: Metadata = {
  title: "三日坊主防止・1日5分習慣化コーチ AI",
  description: "続けたい習慣を意志力ゼロで回る超低ハードル設計に分解する AI アプリ",
};

export default function HobbyPage() {
  return <ShowcaseApp appId="hobby" />;
}
