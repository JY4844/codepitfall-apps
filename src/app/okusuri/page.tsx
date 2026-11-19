import type { Metadata } from "next";
import ShowcaseApp from "@/components/ShowcaseApp";

export const metadata: Metadata = {
  title: "おくすりミマモリ — 服薬・飲み合わせ見守り AI",
  description: "処方箋・お薬手帳・市販薬を撮るだけで服薬管理と飲み合わせ注意を家族へ共有する AI アプリ",
};

export default function OkusuriPage() {
  return <ShowcaseApp appId="okusuri" />;
}
