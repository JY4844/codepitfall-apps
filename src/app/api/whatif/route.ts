import { NextResponse } from "next/server";

export interface WhatIfScenarioBranch {
  label: string;
  intervention: string;
  outcomeSummary: string;
  riskScore: number; // 0-100 (lower is safer)
  benefitScore: number; // 0-100 (higher is better)
  hiddenConfounder: string;
  firstAction: string;
}

export interface WhatIfResponse {
  situationSummary: string;
  factualBaseline: {
    outcome: string;
    riskScore: number;
    benefitScore: number;
  };
  branches: WhatIfScenarioBranch[];
  hiddenConfounders: string[];
  regretPreventionChecklist: string[];
  source: "gemini" | "local-causal";
}

function buildLocalFallback(
  situation: string,
  interventionA: string,
  interventionB: string,
  intensity: number
): WhatIfResponse {
  const s = situation.trim() || "現在の選択・計画";
  const a = interventionA.trim() || "早めに動く・条件を見直す（介入A）";
  const b = interventionB.trim() || "現状維持のまま様子を見る（介入B）";
  const baseRisk = Math.min(88, Math.max(35, 55 + Math.round((intensity - 50) * 0.35)));
  const riskA = Math.max(12, baseRisk - Math.round(intensity * 0.38));
  const riskB = Math.min(95, baseRisk + Math.round((100 - intensity) * 0.2));

  return {
    situationSummary: `「${s.slice(0, 60)}${s.length > 60 ? "…" : ""}」について、事実のまま進んだ場合と、2つの反実仮想介入 do(X) を行った場合の分岐を比較しました。`,
    factualBaseline: {
      outcome:
        "このまま現状維持で進めると、目先の変更コストはゼロですが、隠れたボトルネック（時間・費用・天候・締切）が重なった瞬間に手戻りが発生しやすい状態です。",
      riskScore: baseRisk,
      benefitScore: 52,
    },
    branches: [
      {
        label: "反実仮想ルート A（積極介入）",
        intervention: `do(X) = ${a}`,
        outcomeSummary: `介入強度 ${intensity}% で「${a}」を先に実行した場合、初期の手間は増えますが最悪ケースの損失リスクを約 ${baseRisk - riskA}pt 圧縮し、選択肢の自由度を高く維持できます。`,
        riskScore: riskA,
        benefitScore: Math.min(96, 68 + Math.round(intensity * 0.25)),
        hiddenConfounder:
          "初期コストや心理的ハードルを過大評価して先延ばしにするバイアス（現状維持バイアス）。",
        firstAction: `今日中に15分だけ「${a}」の最小テスト（見積・試算・下見）を実行する。`,
      },
      {
        label: "反実仮想ルート B（慎重・代替介入）",
        intervention: `do(X) = ${b}`,
        outcomeSummary: `「${b}」を選んだ場合、短期的には安定しますが、外部環境が急変した際の切り替えコストが後から跳ね上がる点に注意が必要です。`,
        riskScore: riskB,
        benefitScore: Math.max(35, 64 - Math.round((100 - intensity) * 0.15)),
        hiddenConfounder:
          "「今は問題が起きていない＝今後も安全」と誤認する観測バイアス。",
        firstAction: `「これを超えたら即ルートAへ切り替える」撤退ライン（数値・期限）を1行メモしておく。`,
      },
    ],
    hiddenConfounders: [
      "事実データだけを見ると「うまくいった平均ケース」に引きずられ、同時多発トラブル（交絡因子）を見落としやすい。",
      "時間・お金だけでなく「やり直しが効くか（可逆性）」を軸にすると、後悔する選択を避けやすい。",
    ],
    regretPreventionChecklist: [
      "この選択は後からやり直せるか（可逆／不可逆）を確認する",
      "最悪ケースが起きたときの損失上限（お金・時間）を事前に紙へ書き出す",
      "介入Aを「小さく1回だけ試す」方法がないか検討する",
    ],
    source: "local-causal",
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const situation = String(body.situation ?? "").trim();
    const interventionA = String(body.interventionA ?? "").trim();
    const interventionB = String(body.interventionB ?? "").trim();
    const intensity = Math.min(100, Math.max(0, Number(body.intensity ?? 70)));

    if (!situation) {
      return NextResponse.json(
        { error: "いま迷っている状況や計画を入力してください。" },
        { status: 400 }
      );
    }

    const fallback = buildLocalFallback(
      situation,
      interventionA,
      interventionB,
      intensity
    );

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (apiKey && apiKey !== "your_gemini_api_key_here") {
      try {
        const prompt = [
          "あなたは構造的因果推論と反実仮想（Counterfactual do(X)）の専門家AIです。",
          "単なる事実の要約ではなく、「もし別の介入 do(X) をしたら、見落としがちな隠れ要因（交絡因子）を含めて未来がどう分岐するか」を一般の人にも分かりやすく具体的に分析し、JSONのみで返してください。",
          `現在の状況・計画:\n${situation}`,
          `反実仮想の介入A (強度 ${intensity}%): ${interventionA || "早めに手を打つ・条件を変える"}`,
          `反実仮想の介入B: ${interventionB || "別の選択肢・慎重ルートをとる"}`,
          '必ず以下のJSONスキーマのみを返してください: {"situationSummary":"1文の要約","factualBaseline":{"outcome":"現状維持のまま進んだ場合の現実的な結末","riskScore":0から100,"benefitScore":0から100},"branches":[{"label":"ルートAの名前","intervention":"介入内容","outcomeSummary":"介入Aの結果予測","riskScore":0から100,"benefitScore":0から100,"hiddenConfounder":"このルートで見落としがちな隠れ要因","firstAction":"今日できる具体的な最初の一歩"},{"label":"ルートBの名前","intervention":"介入内容","outcomeSummary":"介入Bの結果予測","riskScore":0から100,"benefitScore":0から100,"hiddenConfounder":"このルートで見落としがちな隠れ要因","firstAction":"今日できる具体的な最初の一歩"}],"hiddenConfounders":["現状の事実だけ見ると騙されやすい交絡因子1","交絡因子2"],"regretPreventionChecklist":["後悔しないための確認1","確認2","確認3"]}',
        ].join("\n\n");

        const resp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.3,
                responseMimeType: "application/json",
              },
            }),
          }
        );

        if (resp.ok) {
          const data = await resp.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            const parsed = JSON.parse(text);
            if (
              typeof parsed.situationSummary === "string" &&
              Array.isArray(parsed.branches) &&
              parsed.branches.length > 0
            ) {
              return NextResponse.json({
                ...fallback,
                ...parsed,
                source: "gemini",
              } satisfies WhatIfResponse);
            }
          }
        }
      } catch {
        // Fallback to deterministic local causal model
      }
    }

    return NextResponse.json(fallback);
  } catch {
    return NextResponse.json(
      { error: "反実仮想シミュレーションの処理に失敗しました。" },
      { status: 400 }
    );
  }
}
