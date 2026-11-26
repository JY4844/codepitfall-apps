import { NextRequest, NextResponse } from "next/server";
import { scanAndRedactLocally } from "@/lib/deterministicGuard";
import { enforceRateLimit } from "@/lib/rateLimit";
import type { LearnResult, PublishResult } from "@/types/gitbridge";

const GEMINI_MODEL = "gemini-3-flash-preview";
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

async function fetchGithubContext(
  owner: string,
  repo: string
): Promise<{ context: string; available: boolean }> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "GitBridge-Learning-App",
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  let metaText = `Repository: ${owner}/${repo}`;
  let filesText = "";
  let readmeText = "";
  let available = false;

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
      available = true;
      const meta = await metaRes.json().catch(() => null);
      if (meta) {
        metaText = `Repository: ${meta.full_name}\nDescription: ${meta.description || ""}\nPrimary Language: ${meta.language || "Unknown"}`;
      }
    }
    if (contentsRes.ok) {
      available = true;
      const items = await contentsRes.json().catch(() => null);
      if (Array.isArray(items)) {
        filesText = items
          .slice(0, 30)
          .map((i: { type?: string; path?: string }) => `- [${i.type}] ${i.path}`)
          .join("\n");
      }
    }
    if (readmeRes.ok) {
      available = true;
      const readme = await readmeRes.json().catch(() => null);
      if (typeof readme?.content === "string") {
        readmeText = Buffer.from(readme.content, "base64").toString("utf-8").slice(0, 3500);
      }
    }
  } catch {
    // GitHub API が取得できない場合もリポジトリ名のみで続行
  }

  const context = [
    metaText,
    filesText ? `\n【トップレベルファイル一覧】\n${filesText}` : "",
    readmeText ? `\n【README 抜粋】\n${readmeText}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return { context, available };
}

function deterministicLearnGuide(repoLabel: string, ghContext: string): LearnResult {
  const name = repoLabel || "指定リポジトリ";
  const topFiles = ghContext
    .split("\n")
    .filter((l) => l.startsWith("- ["))
    .slice(0, 4)
    .map((l) => l.replace(/^- \[\w+\]\s*/, "").trim());
  const files = topFiles.length > 0 ? topFiles : ["README.md", "package.json", "src/"];
  return {
    title: `${name} はじめてのコード読解ガイド（ローカル安全解析）`,
    repo_summary: `${name} の構成をもとに、初心者が迷わず全体像をつかむための読解ステップを整理しました。まず README と設定ファイルで役割を確認し、次にエントリポイントから処理の流れを追うのが最短ルートです。`,
    reading_order: files.map((fp, idx) => ({
      file_path: fp,
      role:
        idx === 0
          ? "プロジェクト全体の目的とセットアップ手順の入口"
          : idx === 1
          ? "依存ライブラリ・起動コマンド・構成の定義"
          : "主要ロジックおよび画面・API の実装エリア",
      beginner_tip:
        "最初から全行を暗記せず、入力（ユーザー操作やAPI）と出力（画面表示やレスポンス）の対応だけをメモしながら読むと理解が速くなります。",
    })),
    key_concepts: [
      {
        term: "エントリポイント",
        plain_explanation: "アプリやスクリプトが一番最初に動き出す出発点ファイルのことです。",
      },
      {
        term: "依存関係（Dependencies）",
        plain_explanation: "このプロジェクトが外部から借りて使っている便利ライブラリの一覧です。",
      },
      {
        term: "環境変数（.env）",
        plain_explanation: "APIキーなどの秘密情報をコード本体から切り離して安全に管理する仕組みです。",
      },
    ],
    quiz: [
      {
        question: "初めて読むリポジトリで最初に確認すべきファイルはどれですか？",
        choices: [
          "README.md と package.json / pyproject.toml",
          "node_modules の中にある全ファイル",
          "git の古いコミット履歴すべて",
          "自動生成された lockfile の末尾",
        ],
        correct_index: 0,
        explanation: "README と設定ファイルを見れば、目的・起動方法・主要ライブラリが数分で分かります。",
      },
      {
        question: "外部リポジトリを手元で動かす前に確認すべき安全ポイントは何ですか？",
        choices: [
          "そのまま管理者権限で実行する",
          "scripts やインストールフックに不審なコマンドがないか確認する",
          ".env に自分の本番APIキーを直書きしてコミットする",
          "テストをすべて削除する",
        ],
        correct_index: 1,
        explanation: "実行前に package.json の scripts や設定ファイルを確認することで安全に学習できます。",
      },
    ],
    suggested_tasks: [
      {
        title: `${name} の README と設定ファイルを読む`,
        priority: "high" as const,
        memo: "起動コマンドと主要ディレクトリ構造を3行でメモする",
      },
      {
        title: "最小の機能を1つだけ動かして動作確認する",
        priority: "medium" as const,
        memo: "画面またはテスト1件が通る状態を作る",
      },
    ],
  };
}

function deterministicPublishGuide(): PublishResult {
  return {
    title: "安全に GitHub へ初公開するためのステップガイド（ローカル安全解析）",
    summary:
      "秘密情報（.env や API キー）を絶対に漏らさずに、最小手順で GitHub へ公開するためのチェックリストとコマンド集です。",
    safety_checks: [
      {
        item: ".env と API キーの除外",
        why_important: "一度公開リポジトリに push すると、数秒でボットに検知され不正利用される恐れがあります。",
        how_to_fix: ".gitignore に .env / .env.local を追記し、git status で追跡対象外であることを確認します。",
      },
      {
        item: "node_modules / ビルド生成物の除外",
        why_important: "数万ファイルの不要な履歴が混ざり、リポジトリが極端に重くなります。",
        how_to_fix: ".gitignore に node_modules/ と .next/ や dist/ を含めます。",
      },
      {
        item: "README にセットアップ手順を記載",
        why_important: "他の開発者や審査員が迷わずアプリの概要と動かし方を理解できます。",
        how_to_fix: "概要・起動コマンド・必要な環境変数名（値は空）を .env.example にまとめます。",
      },
    ],
    publish_steps: [
      {
        step_title: "1. Git 初期化と追跡ファイルの確認",
        command: "git init && git status",
        meaning: "リポジトリを初期化し、コミット予定のファイルに秘密情報が含まれていないか確認します。",
      },
      {
        step_title: "2. ステージングと初回コミット",
        command: 'git add . && git commit -m "Initial commit"',
        meaning: "安全確認済みのファイルを初回バージョンとして記録します。",
      },
      {
        step_title: "3. GitHub リモート登録とプッシュ",
        command: "git branch -M main && git remote add origin <YOUR_REPO_URL> && git push -u origin main",
        meaning: "作成した GitHub リポジトリへ安全にアップロードします。",
      },
    ],
    common_errors: [
      {
        error_pattern: "remote: Repository not found / Permission denied",
        recovery: "GitHub 側のリポジトリ URL とログイン認証（HTTPS トークンまたは SSH 鍵）を再確認します。",
      },
      {
        error_pattern: "failed to push some refs (non-fast-forward)",
        recovery: "GitHub 側で README を自動生成した場合は git pull --rebase origin main の後に再度 push します。",
      },
    ],
    suggested_tasks: [
      {
        title: ".gitignore と .env.example を整備する",
        priority: "high" as const,
        memo: "秘密キーが git ls-files に含まれないことを確認",
      },
      {
        title: "GitHub 上で README 表示を確認する",
        priority: "medium" as const,
        memo: "公開後に別環境からの閲覧性をチェック",
      },
    ],
  };
}

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, "gitbridge");
  if (limited) return limited;
  try {
    const body = await request.json().catch(() => ({}));
    const mode = body?.mode === "publish_guide" ? "publish_guide" : "learn_repo";
    const repoUrl = typeof body?.repoUrl === "string" ? body.repoUrl.trim().slice(0, 500) : "";
    const rawProjectNote =
      typeof body?.projectNote === "string" ? body.projectNote.trim().slice(0, 8_000) : "";
    const projectNote = rawProjectNote
      ? scanAndRedactLocally(rawProjectNote).redactedText
      : "";

    let prompt = "";
    let schema: Record<string, unknown> = LEARN_SCHEMA;
    let ghContext = "";
    let ghContextAvailable = false;
    let repoLabel = "";

    if (mode === "learn_repo") {
      if (!repoUrl && !projectNote) {
        return NextResponse.json(
          { error: "GitHub リポジトリ URL またはコードメモを入力してください。", code: "MISSING_INPUT" },
          { status: 400 }
        );
      }
      const parsed = parseGithubUrl(repoUrl);
      if (parsed) {
        repoLabel = `${parsed.owner}/${parsed.repo}`;
        const gh = await fetchGithubContext(parsed.owner, parsed.repo);
        ghContext = gh.context;
        ghContextAvailable = gh.available;
      }
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

    const fallbackPayload = () =>
      NextResponse.json({
        mode,
        result:
          mode === "learn_repo"
            ? deterministicLearnGuide(repoLabel, ghContext)
            : deterministicPublishGuide(),
        isFallback: true,
        usedModel: "local-fallback",
        ghContextAvailable,
      });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return fallbackPayload();
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

    let res: Response;
    try {
      res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: schema,
          },
        }),
      });
    } catch {
      return fallbackPayload();
    }

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return fallbackPayload();
    }

    const finishReason = data?.candidates?.[0]?.finishReason;
    if (finishReason === "MAX_TOKENS") {
      return fallbackPayload();
    }
    const candidateParts = data?.candidates?.[0]?.content?.parts as
      | Array<{ text?: string; thought?: boolean }>
      | undefined;
    const text = Array.isArray(candidateParts)
      ? candidateParts
          .filter((p) => typeof p?.text === "string" && !p?.thought)
          .map((p) => p.text)
          .join("")
      : "";
    if (!text) {
      return fallbackPayload();
    }

    let parsedResult: unknown;
    try {
      parsedResult = JSON.parse(text);
    } catch {
      return fallbackPayload();
    }

    return NextResponse.json({
      mode,
      result: parsedResult,
      usedModel: GEMINI_MODEL,
      ghContextAvailable,
    });
  } catch (err) {
    console.error("API /api/gitbridge error:", err);
    return NextResponse.json(
      { error: "解析中にエラーが発生しました。", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
