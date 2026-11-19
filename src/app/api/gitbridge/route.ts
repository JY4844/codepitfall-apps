import { NextRequest, NextResponse } from "next/server";

const GEMINI_MODEL = "gemini-3.8-flash";
const GEMINI_TIMEOUT_MS = 35_000;

const LEARN_SCHEMA = {
  type: "OBJECT",
  properties: {
    title: { type: "STRING" },
    repo_summary: { type: "STRING" },
    reading_order: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          file_path: { type: "STRING" },
          role: { type: "STRING" },
          beginner_tip: { type: "STRING" },
        },
        required: ["file_path", "role", "beginner_tip"],
      },
    },
    key_concepts: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          term: { type: "STRING" },
          plain_explanation: { type: "STRING" },
        },
        required: ["term", "plain_explanation"],
      },
    },
    quiz: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          question: { type: "STRING" },
          choices: { type: "ARRAY", items: { type: "STRING" } },
          correct_index: { type: "INTEGER" },
          explanation: { type: "STRING" },
        },
        required: ["question", "choices", "correct_index", "explanation"],
      },
    },
    suggested_tasks: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING" },
          priority: { type: "STRING", enum: ["high", "medium", "low"] },
          memo: { type: "STRING" },
        },
        required: ["title", "priority", "memo"],
      },
    },
  },
  required: [
    "title",
    "repo_summary",
    "reading_order",
    "key_concepts",
    "quiz",
    "suggested_tasks",
  ],
};

const PUBLISH_SCHEMA = {
  type: "OBJECT",
  properties: {
    title: { type: "STRING" },
    summary: { type: "STRING" },
    safety_checks: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          item: { type: "STRING" },
          why_important: { type: "STRING" },
          how_to_fix: { type: "STRING" },
        },
        required: ["item", "why_important", "how_to_fix"],
      },
    },
    publish_steps: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          step_title: { type: "STRING" },
          command: { type: "STRING" },
          meaning: { type: "STRING" },
        },
        required: ["step_title", "command", "meaning"],
      },
    },
    common_errors: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          error_pattern: { type: "STRING" },
          recovery: { type: "STRING" },
        },
        required: ["error_pattern", "recovery"],
      },
    },
    suggested_tasks: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING" },
          priority: { type: "STRING", enum: ["high", "medium", "low"] },
          memo: { type: "STRING" },
        },
        required: ["title", "priority", "memo"],
      },
    },
  },
  required: [
    "title",
    "summary",
    "safety_checks",
    "publish_steps",
    "common_errors",
    "suggested_tasks",
  ],
};

function parseGithubUrl(input: string): { owner: string; repo: string } | null {
  const m = input.trim().match(/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)/i);
  if (!m) return null;
  return { owner: m[1], repo: m[2].replace(/\.git$/i, "") };
}

async function fetchGithubContext(owner: string, repo: string): Promise<string> {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "GitBridge-Learning-App",
  };

  let metaText = `Repository: ${owner}/${repo}`;
  let filesText = "";
  let readmeText = "";

  try {
    const [metaRes, contentsRes, readmeRes] = await Promise.all([
      fetch(`https://api.github.com/repos/${owner}/${repo}`, {
        headers,
        signal: AbortSignal.timeout(8000),
      }),
      fetch(`https://api.github.com/repos/${owner}/${repo}/contents`, {
        headers,
        signal: AbortSignal.timeout(8000),
      }),
      fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, {
        headers,
        signal: AbortSignal.timeout(8000),
      }),
    ]);

    if (metaRes.ok) {
      const meta = await metaRes.json();
      metaText = `Repository: ${meta.full_name}\nDescription: ${meta.description || ""}\nPrimary Language: ${meta.language || "Unknown"}`;
    }
    if (contentsRes.ok) {
      const items = await contentsRes.json();
      if (Array.isArray(items)) {
        filesText = items
          .slice(0, 30)
          .map((i: { type?: string; path?: string }) => `- [${i.type}] ${i.path}`)
          .join("\n");
      }
    }
    if (readmeRes.ok) {
      const readme = await readmeRes.json();
      if (typeof readme?.content === "string") {
        readmeText = Buffer.from(readme.content, "base64").toString("utf-8").slice(0, 3500);
      }
    }
  } catch {
    // GitHub API が取得できない場合もリポジトリ名のみで続行
  }

  return [
    metaText,
    filesText ? `\n【トップレベルファイル一覧】\n${filesText}` : "",
    readmeText ? `\n【README 抜粋】\n${readmeText}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY が設定されていません。", code: "MISSING_API_KEY" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const mode = body?.mode === "publish_guide" ? "publish_guide" : "learn_repo";
    const repoUrl = typeof body?.repoUrl === "string" ? body.repoUrl.trim() : "";
    const projectNote = typeof body?.projectNote === "string" ? body.projectNote.trim() : "";

    let prompt = "";
    let schema: Record<string, unknown> = LEARN_SCHEMA;

    if (mode === "learn_repo") {
      if (!repoUrl && !projectNote) {
        return NextResponse.json(
          { error: "GitHub リポジトリ URL またはコードメモを入力してください。", code: "MISSING_INPUT" },
          { status: 400 }
        );
      }
      const parsed = parseGithubUrl(repoUrl);
      const ghContext = parsed ? await fetchGithubContext(parsed.owner, parsed.repo) : "";
      prompt = [
        "あなたはプログラミング初心者に寄り添う優しいシニアエンジニア講師です。",
        "以下の GitHub リポジトリ情報をもとに、初心者が迷わずコードを読み解ける学習ガイドを日本語で生成してください。",
        "- title: 学習ガイドのわかりやすいタイトル",
        "- repo_summary: このリポジトリが何をするアプリか初心者向けに2〜3文で説明",
        "- reading_order: 初心者が読むべきファイル順（3〜4個）。それぞれの役割と注目ポイント",
        "- key_concepts: このコードから学べる重要キーワード（3個）。専門用語をかみ砕いて説明",
        "- quiz: 理解度チェック4択クイズ（2問）。correct_index は 0〜3",
        "- suggested_tasks: 初心者が次に試すべき実践ステップ（2〜3個）",
        "",
        ghContext ? `【GitHub から取得したリポジトリ情報】\n${ghContext}` : "",
        projectNote ? `【ユーザーからの補足・知りたいこと】\n${projectNote}` : "",
      ]
        .filter(Boolean)
        .join("\n");
      schema = LEARN_SCHEMA;
    } else {
      if (!projectNote) {
        return NextResponse.json(
          { error: "アップしたいプロジェクトの内容や不安な点を入力してください。", code: "MISSING_INPUT" },
          { status: 400 }
        );
      }
      prompt = [
        "あなたは Git / GitHub に初めて挑戦する初心者をサポートする優しいメンターです。",
        "以下のプロジェクト状況をもとに、安全に GitHub へ公開するまでのステップガイドを日本語で作成してください。",
        "- title: 公開ガイドのタイトル",
        "- summary: 全体像のやさしい説明（2文）",
        "- safety_checks: 公開前に絶対確認すべきセキュリティ項目（3個：.env・APIキー除外、.gitignore、不要ファイル確認など）",
        "- publish_steps: git init から GitHub プッシュまでの具体的な手順（4〜5個）。コピペできるコマンドと「なぜこれを打つのか」の意味をセットで記載",
        "- common_errors: 初心者がよく遭遇するエラーと解決策（2〜3個）",
        "- suggested_tasks: 公開後にやると良い復習・改善タスク（2個）",
        "",
        `【ユーザーのプロジェクト状況・悩み】\n${projectNote}`,
      ].join("\n");
      schema = PUBLISH_SCHEMA;
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(
      apiKey
    )}`;

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          responseMimeType: "application/json",
          responseSchema: schema,
        },
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { error: data?.error?.message || "Gemini API 呼び出しに失敗しました。", code: "UPSTREAM_ERROR" },
        { status: res.status === 429 ? 429 : 502 }
      );
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return NextResponse.json(
        { error: "Gemini API から応答が得られませんでした。", code: "INVALID_AI_OUTPUT" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      mode,
      result: JSON.parse(text),
      usedModel: GEMINI_MODEL,
    });
  } catch (err) {
    console.error("API /api/gitbridge error:", err);
    return NextResponse.json(
      { error: "解析中にエラーが発生しました。", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
