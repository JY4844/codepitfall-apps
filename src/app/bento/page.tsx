import type { Metadata } from "next";
import ShowcaseApp from "@/components/ShowcaseApp";

export const metadata: Metadata = {
  title: "15分時短お弁当＆作り置き段取り AI",
  description: "残り物と朝15分で3品を同時進行で作る時短お弁当段取り AI アプリ",
};

export default function BentoPage() {
  return <ShowcaseApp appId="bento" />;
}
