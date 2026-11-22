import type { Metadata } from "next";
import WhatIfMirror from "@/components/WhatIfMirror";

export const metadata: Metadata = {
  title: "WhatIf Mirror — 反実仮想 do(X) シミュレーター",
  description:
    "事実の要約ではなく「もし別の選択をしたら？」の分岐と見落としがちな隠れ要因（交絡因子）を0ms SVGグラフ＋Gemini 3 Flashで可視化する無料オープンソースツール。",
};

export default function WhatIfPage() {
  return <WhatIfMirror />;
}
