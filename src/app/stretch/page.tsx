import type { Metadata } from "next";
import ShowcaseApp from "@/components/ShowcaseApp";

export const metadata: Metadata = {
  title: "デスクワーク肩こり・眼精疲労 3分リセット AI",
  description: "座ったまま3分で首・肩・目の疲れをほぐすボディリセット AI アプリ",
};

export default function StretchPage() {
  return <ShowcaseApp appId="stretch" />;
}
