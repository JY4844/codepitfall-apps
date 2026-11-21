import { NextResponse } from "next/server";

export interface PersonalMistake {
  id: string;
  pattern: string;
  category: string;
  severity: "high" | "medium" | "low";
  hits: number;
}

export interface DiagnosticIssue {
  line: number;
  severity: "high" | "medium" | "low";
  title: string;
  reason: string;
  matchedPersonalHabit: string | null;
  fixSuggestion: string;
}

export interface AuditResponse {
  riskScore: number;
  summary: string;
  diagnostics: DiagnosticIssue[];
  fixedCode: string;
  preflightChecklist: Array<{
    id: string;
    title: string;
    why: string;
    personalMatch: boolean;
  }>;
  source: "gemini" | "local-analyzer";
}

function runDeterministicAudit(
  code: string,
  taskType: string,
  habits: PersonalMistake[]
): AuditResponse {
  const lines = code.split("\n");
  const diagnostics: DiagnosticIssue[] = [];
  const fixedLines = [...lines];

  lines.forEach((raw, idx) => {
    const lineNum = idx + 1;
    const trimmed = raw.trim();

    if (/=\s*fetch\s*\(/.test(raw) && !/await\s+fetch/.test(raw)) {
      diagnostics.push({
        line: lineNum,
        severity: "high",
        title: "fetch() に await が抜けています（Promise のまま参照）",
        reason:
          "非同期の fetch() に await を付け忘れると Response ではなく Promise オブジェクトが返り、後続の .json() で TypeError が発生します。",
        matchedPersonalHabit:
          habits.find((h) => /await|非同期|fetch/i.test(h.pattern))?.pattern ??
          "fetch / 非同期処理の await 忘れ",
        fixSuggestion: raw.replace(/=\s*fetch\s*\(/, "= await fetch("),
      });
      fixedLines[idx] = raw.replace(/=\s*fetch\s*\(/, "= await fetch(");
    }

    if (/\.json\s*\(\s*\)/.test(raw) && !/await\s+.*\.json/.test(raw)) {
      diagnostics.push({
        line: lineNum,
        severity: "high",
        title: "res.json() に await 抜け＆response.ok 未チェック",
        reason:
          "res.json() も Promise を返します。また HTTP 4xx/5xx エラー時にそのまま json() を呼ぶとクラッシュします。",
        matchedPersonalHabit:
          habits.find((h) => /ok|json|エラー/i.test(h.pattern))?.pattern ??
          "response.ok を確認せずに .json() してしまう",
        fixSuggestion: `if (!res.ok) throw new Error(\`HTTP \${res.status}\`);\n${raw.replace(/=\s*(\w+)\.json\(/, "= await $1.json(")}`,
      });
      fixedLines[idx] = `if (!res.ok) throw new Error(\`HTTP \${res.status}\`);\n${raw.replace(/=\s*(\w+)\.json\(/, "= await $1.json(")}`;
    }

    if (/for\s*\(.*<=\s*.*\.length/.test(raw)) {
      diagnostics.push({
        line: lineNum,
        severity: "high",
        title: "配列ループの境界値ミス（<= .length）",
        reason:
          "0 始まり配列で <= length と書くと最後の反復で undefined を参照し、実行時エラーや NaN の原因になります。",
        matchedPersonalHabit:
          habits.find((h) => /境界|length|<=|off-by-one/i.test(h.pattern))
            ?.pattern ?? "配列境界の <= / < 取り違え",
        fixSuggestion: raw.replace("<=", "<"),
      });
      fixedLines[idx] = raw.replace("<=", "<");
    }

    if (/process\.env\.[A-Z0-9_]+/.test(raw) && !/\?\?|\|\||if\s*\(/.test(raw)) {
      diagnostics.push({
        line: lineNum,
        severity: "medium",
        title: "環境変数の未設定ガードがありません",
        reason:
          "デプロイ環境や別PCで .env が欠けていると undefined が静かに混入し、原因特定に時間がかかります。",
        matchedPersonalHabit:
          habits.find((h) => /env|環境変数/i.test(h.pattern))?.pattern ??
          "環境変数の未設定チェック漏れ",
        fixSuggestion: `${trimmed} // ← 起動時に未設定チェックを追加`,
      });
    }

    if (/JSON\.parse\s*\(/.test(raw) && !/try\s*\{/.test(code)) {
      diagnostics.push({
        line: lineNum,
        severity: "medium",
        title: "JSON.parse() が try/catch で保護されていません",
        reason:
          "不正な文字列や空レスポンスを受け取った瞬間にアプリ全体がクラッシュします。",
        matchedPersonalHabit:
          habits.find((h) => /try|catch|例外|parse/i.test(h.pattern))?.pattern ??
          null,
        fixSuggestion: "try { ... } catch { return null; } で囲んでください",
      });
    }
  });

  if (diagnostics.length === 0) {
    diagnostics.push({
      line: 1,
      severity: "low",
      title: "重大な静的バグは未検出（あなたの過去クセと照合済み）",
      reason: `「${taskType}」の作業前に、下の事前防止テンプレートで境界値・エラー処理・環境変数を最終確認してください。`,
      matchedPersonalHabit: habits[0]?.pattern ?? null,
      fixSuggestion: "エラーハンドリングとユニットテストを 1 件追加すると万全です。",
    });
  }

  const checklistByTask: Record<
    string,
    Array<{ id: string; title: string; why: string; personalMatch: boolean }>
  > = {
    "Next.js API / フォーム送信": [
      {
        id: "t1",
        title: "fetch() と res.json() の両方に await を付けたか",
        why: "Promise のまま参照するバグは非同期実装で最も多い事故です。",
        personalMatch: habits.some((h) => /await|fetch/i.test(h.pattern)),
      },
      {
        id: "t2",
        title: "res.ok を確認し、4xx/5xx 時にユーザーへエラー表示するか",
        why: "サーバーエラー時に画面が無反応・クラッシュするのを防ぎます。",
        personalMatch: habits.some((h) => /ok|エラー/i.test(h.pattern)),
      },
      {
        id: "t3",
        title: "送信ボタンの二重クリック防止（disabled={loading}）を入れたか",
        why: "決済やDB登録の二重送信事故を防ぎます。",
        personalMatch: false,
      },
      {
        id: "t4",
        title: "process.env の必須キー未設定時に分かりやすいエラーを返すか",
        why: "本番デプロイ直後の 500 エラーを未然に防ぎます。",
        personalMatch: habits.some((h) => /env|環境変数/i.test(h.pattern)),
      },
    ],
    "Python データ処理 / ML パイプライン": [
      {
        id: "p1",
        title: "train / val 分割前にデータリーク（全体スケーリング等）が起きていないか",
        why: "検証スコアだけ高くなり本番で崩れる典型ミスです。",
        personalMatch: false,
      },
      {
        id: "p2",
        title: "Windows / Linux 間のパス区切り（pathlib.Path）と UTF-8 指定をしたか",
        why: "環境移行時の UnicodeDecodeError や FileNotFoundError を防ぎます。",
        personalMatch: habits.some((h) => /パス|Windows|UTF/i.test(h.pattern)),
      },
      {
        id: "p3",
        title: "空配列・NaN・欠損値が入ったときのゼロ除算ガードがあるか",
        why: "バッチ処理の途中クラッシュを防ぎます。",
        personalMatch: habits.some((h) => /境界|null|NaN/i.test(h.pattern)),
      },
    ],
    "DB スキーマ変更 / マイグレーション": [
      {
        id: "d1",
        title: "既存レコードがある状態で NOT NULL カラムをデフォルト値なし追加していないか",
        why: "本番マイグレーション失敗の定番原因です。",
        personalMatch: false,
      },
      {
        id: "d2",
        title: "ロールバック手順とバックアップ取得を確認したか",
        why: "想定外のロックやデータ破損から即復旧できます。",
        personalMatch: false,
      },
      {
        id: "d3",
        title: "検索条件に使う外部キー・日時カラムへインデックスを貼ったか",
        why: "データ増加後の急激なスロークエリを防ぎます。",
        personalMatch: false,
      },
    ],
  };

  const highCount = diagnostics.filter((d) => d.severity === "high").length;
  const medCount = diagnostics.filter((d) => d.severity === "medium").length;
  const riskScore = Math.min(98, Math.max(12, highCount * 35 + medCount * 18 + 14));

  return {
    riskScore,
    summary: `あなたの過去ミスパターン（${habits.length}件）と「${taskType}」テンプレートを照合し、${diagnostics.length}件の注目箇所を検出しました。`,
    diagnostics,
    fixedCode: fixedLines.join("\n"),
    preflightChecklist:
      checklistByTask[taskType] ?? checklistByTask["Next.js API / フォーム送信"],
    source: "local-analyzer",
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const code = String(body.code ?? "");
    const taskType = String(body.taskType ?? "Next.js API / フォーム送信");
    const habits: PersonalMistake[] = Array.isArray(body.habits) ? body.habits : [];

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && code.trim().length > 0) {
      try {
        const prompt = [
          "あなたは開発者の過去のミスクセを記憶してバグを未然に防ぐパーソナライズド・コードレビュアーです。",
          `今から行う作業: ${taskType}`,
          `この開発者の過去のやりがちミス一覧: ${JSON.stringify(habits.map((h) => h.pattern))}`,
          "以下のコードを行番号付きで解析し、必ず有効なJSONのみを返してください。",
          'スキーマ: {"riskScore":0-100,"summary":"要約","diagnostics":[{"line":1,"severity":"high|medium|low","title":"短いタイトル","reason":"理由","matchedPersonalHabit":"該当する過去クセまたはnull","fixSuggestion":"修正案"}],"fixedCode":"修正後のコード全体","preflightChecklist":[{"id":"c1","title":"作業前チェック項目","why":"理由","personalMatch":true}]}',
          "対象コード:",
          code
            .split("\n")
            .map((l, i) => `${i + 1}: ${l}`)
            .join("\n"),
        ].join("\n");

        const resp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.2,
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
            if (Array.isArray(parsed.diagnostics) && typeof parsed.fixedCode === "string") {
              return NextResponse.json({
                ...parsed,
                source: "gemini",
              });
            }
          }
        }
      } catch {
        // Fall back to deterministic analyzer
      }
    }

    return NextResponse.json(runDeterministicAudit(code, taskType, habits));
  } catch {
    return NextResponse.json(
      { error: "コード解析リクエストの処理に失敗しました。" },
      { status: 400 }
    );
  }
}
