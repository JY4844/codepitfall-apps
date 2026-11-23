import { NextResponse } from "next/server";

export interface RepoAuditCheck {
  id: string;
  label: string;
  status: "pass" | "warn" | "fail";
  detail: string;
  points: number;
  maxPoints: number;
}

export interface RepoAuditResponse {
  owner: string;
  repo: string;
  htmlUrl: string;
  description: string;
  stars: number;
  defaultBranch: string;
  licenseName: string | null;
  score: number;
  grade: "S" | "A" | "B" | "C" | "D";
  checks: RepoAuditCheck[];
  checkedAt: string;
}

function parseGithubRepoUrl(raw: string): { owner: string; repo: string } | null {
  const trimmed = raw.trim();
  const full = trimmed.match(
    /(?:https?:\/\/)?github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)/i
  );
  if (full) {
    return {
      owner: full[1],
      repo: full[2].replace(/\.git$/i, ""),
    };
  }
  const short = trimmed.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/);
  if (short) {
    return { owner: short[1], repo: short[2].replace(/\.git$/i, "") };
  }
  return null;
}

interface GithubFetchResult<T = unknown> {
  ok: boolean;
  status: number;
  rateLimited: boolean;
  data: T | null;
}

const GITHUB_RATE_LIMIT_ERROR =
  "GitHub API の一時的な回数制限に達しました。数分後に再試行するか GITHUB_TOKEN を設定してください";

async function fetchGithubJson<T = Record<string, unknown>>(
  url: string
): Promise<GithubFetchResult<T>> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "CodePitfall-GitBridge-RepoAudit/1.0",
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  const res = await fetch(url, { headers, cache: "no-store" });
  const rateLimitRemaining = res.headers.get("x-ratelimit-remaining");
  const rateLimited =
    !res.ok &&
    (res.status === 403 || res.status === 429 || rateLimitRemaining === "0");

  if (!res.ok) {
    return { ok: false, status: res.status, rateLimited, data: null };
  }

  const data = (await res.json()) as T;
  return { ok: true, status: res.status, rateLimited: false, data };
}

async function fetchRawFile(owner: string, repo: string, branch: string, filePath: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = parseGithubRepoUrl(String(body.repoUrl ?? ""));
    if (!parsed) {
      return NextResponse.json(
        { error: "有効な GitHub リポジトリURL（例: https://github.com/owner/repo）を入力してください。" },
        { status: 400 }
      );
    }

    const { owner, repo } = parsed;
    const repoRes = await fetchGithubJson<{
      name?: string;
      default_branch?: string;
      license?: { spdx_id?: string; name?: string } | null;
      html_url?: string;
      description?: string;
      stargazers_count?: number;
    }>(`https://api.github.com/repos/${owner}/${repo}`);

    if (repoRes.rateLimited) {
      return NextResponse.json(
        { error: GITHUB_RATE_LIMIT_ERROR },
        { status: 429 }
      );
    }

    if (repoRes.status === 404) {
      return NextResponse.json(
        {
          error:
            "公開リポジトリが見つかりませんでした（404 Not Found: URLの間違い、または Private リポジトリの可能性があります）。",
        },
        { status: 404 }
      );
    }

    const repoMeta = repoRes.data;
    if (!repoRes.ok || !repoMeta || typeof repoMeta.name !== "string") {
      return NextResponse.json(
        {
          error: `GitHub API からリポジトリ情報を取得できませんでした（HTTP ${repoRes.status}）。`,
        },
        {
          status:
            repoRes.status >= 400 && repoRes.status < 600
              ? repoRes.status
              : 502,
        }
      );
    }

    const defaultBranch = String(repoMeta.default_branch || "main");
    const contentsRes = await fetchGithubJson<Array<{ name?: string }>>(
      `https://api.github.com/repos/${owner}/${repo}/contents`
    );
    if (contentsRes.rateLimited) {
      return NextResponse.json(
        { error: GITHUB_RATE_LIMIT_ERROR },
        { status: 429 }
      );
    }
    const rootContents = contentsRes.data;
    const rootFiles: string[] = Array.isArray(rootContents)
      ? rootContents.map((item: { name?: string }) => String(item.name || ""))
      : [];
    const lowerSet = new Set(rootFiles.map((f) => f.toLowerCase()));

    const checks: RepoAuditCheck[] = [];

    // 1. Committed .env secret exposure check (Critical, 25 pts)
    const committedEnv = rootFiles.find(
      (f) =>
        /^\.env($|\.)/i.test(f) &&
        !/^\.env\.(example|sample|template)$/i.test(f)
    );
    checks.push(
      committedEnv
        ? {
            id: "env-leak",
            label: "秘密ファイル (.env) 非公開チェック",
            status: "fail",
            detail: `危険: リポジトリ直下に "${committedEnv}" がコミットされています！即座に削除しキーをローテーションしてください。`,
            points: 0,
            maxPoints: 25,
          }
        : {
            id: "env-leak",
            label: "秘密ファイル (.env) 非公開チェック",
            status: "pass",
            detail: "ルート直下に生の .env ファイルは検出されませんでした。",
            points: 25,
            maxPoints: 25,
          }
    );

    // 2. .gitignore check (20 pts)
    const hasGitignore = lowerSet.has(".gitignore");
    let gitignoreContent: string | null = null;
    if (hasGitignore) {
      gitignoreContent = await fetchRawFile(owner, repo, defaultBranch, ".gitignore");
    }
    const ignoresEnv = Boolean(gitignoreContent && /\.env/i.test(gitignoreContent));
    checks.push(
      hasGitignore && ignoresEnv
        ? {
            id: "gitignore",
            label: ".gitignore & .env 除外設定",
            status: "pass",
            detail: ".gitignore が存在し、.env パターンの除外設定が確認できました。",
            points: 20,
            maxPoints: 20,
          }
        : hasGitignore
        ? {
            id: "gitignore",
            label: ".gitignore & .env 除外設定",
            status: "warn",
            detail: ".gitignore はありますが、.env の除外指定が見つかりませんでした。追記を推奨します。",
            points: 10,
            maxPoints: 20,
          }
        : {
            id: "gitignore",
            label: ".gitignore & .env 除外設定",
            status: "fail",
            detail: ".gitignore がありません。node_modules や .env の誤コミットリスクが高い状態です。",
            points: 0,
            maxPoints: 20,
          }
    );

    // 3. LICENSE & README check (20 pts)
    const licenseName: string | null = repoMeta.license?.spdx_id || repoMeta.license?.name || null;
    const hasReadme = rootFiles.some((f) => /^readme/i.test(f));
    checks.push(
      licenseName && hasReadme
        ? {
            id: "oss-docs",
            label: "OSS ライセンス & README 整備",
            status: "pass",
            detail: `README とライセンス（${licenseName}）が揃っており、第三者が安心して利用・コントリビュートできます。`,
            points: 20,
            maxPoints: 20,
          }
        : {
            id: "oss-docs",
            label: "OSS ライセンス & README 整備",
            status: "warn",
            detail: `${!hasReadme ? "README.md が未作成です。" : ""}${!licenseName ? "LICENSE ファイル（MIT / Apache-2.0等）を追加するとOSS信頼度が上がります。" : ""}`,
            points: hasReadme || licenseName ? 10 : 0,
            maxPoints: 20,
          }
    );

    // 4. package.json supply-chain postinstall audit (20 pts)
    const hasPkg = lowerSet.has("package.json");
    if (hasPkg) {
      const pkgText = await fetchRawFile(owner, repo, defaultBranch, "package.json");
      let suspiciousHook = "";
      if (pkgText) {
        try {
          const pkgJson = JSON.parse(pkgText);
          const scripts = pkgJson?.scripts || {};
          for (const key of ["preinstall", "install", "postinstall"]) {
            if (typeof scripts[key] === "string") {
              if (/curl|wget|powershell|eval|base64|http/i.test(scripts[key])) {
                suspiciousHook = `${key}: ${scripts[key].slice(0, 60)}`;
              }
            }
          }
        } catch {
          // Ignore malformed package.json
        }
      }
      checks.push(
        suspiciousHook
          ? {
              id: "supply-chain",
              label: "package.json サプライチェーン監査",
              status: "fail",
              detail: `要警戒: インストール時自動実行スクリプトに外部通信・危険パターン検出 (${suspiciousHook})`,
              points: 0,
              maxPoints: 20,
            }
          : {
              id: "supply-chain",
              label: "package.json サプライチェーン監査",
              status: "pass",
              detail: "package.json に不審な preinstall / postinstall 外部実行フックは見つかりませんでした。",
              points: 20,
              maxPoints: 20,
            }
      );
    } else {
      checks.push({
        id: "supply-chain",
        label: "package.json サプライチェーン監査",
        status: "pass",
        detail: "ルート直下に package.json はありません（非Nodeプロジェクトまたはモノレポ構成）。",
        points: 20,
        maxPoints: 20,
      });
    }

    // 5. 2026 AI Agent Readiness: AGENTS.md / CLAUDE.md linter check (15 pts)
    const agentFile = rootFiles.find((f) => /^(agents|claude|gemini)\.md$/i.test(f));
    if (agentFile) {
      const content = await fetchRawFile(owner, repo, defaultBranch, agentFile);
      const lines = content ? content.split("\n").length : 0;
      const hasInjection = Boolean(content && /curl\s+.*\|\s*sh|ignore previous instructions/i.test(content));
      checks.push(
        hasInjection
          ? {
              id: "agents-lint",
              label: "2026 AIエージェント適性 (AGENTS.md Lint)",
              status: "fail",
              detail: `${agentFile} 内に不審な命令（curl | sh 等）を検出しました！`,
              points: 0,
              maxPoints: 15,
            }
          : lines > 220
          ? {
              id: "agents-lint",
              label: "2026 AIエージェント適性 (AGENTS.md Lint)",
              status: "warn",
              detail: `${agentFile} は存在しますが ${lines}行 と長めです（コンテキスト節約のため150行以内推奨）。`,
              points: 10,
              maxPoints: 15,
            }
          : {
              id: "agents-lint",
              label: "2026 AIエージェント適性 (AGENTS.md Lint)",
              status: "pass",
              detail: `${agentFile}（${lines}行）が適切に整備され、安全・軽量なAIエージェント対応リポジトリです！`,
              points: 15,
              maxPoints: 15,
            }
      );
    } else {
      checks.push({
        id: "agents-lint",
        label: "2026 AIエージェント適性 (AGENTS.md Lint)",
        status: "warn",
        detail: "AGENTS.md が未配置です。本ツールの「🤖 AGENTS.md 1クリック書き出し」で生成して配置するとAI開発効率が上がります。",
        points: 5,
        maxPoints: 15,
      });
    }

    const score = checks.reduce((sum, c) => sum + c.points, 0);
    const grade: RepoAuditResponse["grade"] =
      score >= 90 ? "S" : score >= 80 ? "A" : score >= 65 ? "B" : score >= 45 ? "C" : "D";

    return NextResponse.json({
      owner,
      repo,
      htmlUrl: String(repoMeta.html_url || `https://github.com/${owner}/${repo}`),
      description: String(repoMeta.description || ""),
      stars: Number(repoMeta.stargazers_count || 0),
      defaultBranch,
      licenseName,
      score,
      grade,
      checks,
      checkedAt: new Date().toLocaleTimeString("ja-JP"),
    } satisfies RepoAuditResponse);
  } catch {
    return NextResponse.json(
      { error: "リポジトリ監査中に通信エラーが発生しました。" },
      { status: 500 }
    );
  }
}
