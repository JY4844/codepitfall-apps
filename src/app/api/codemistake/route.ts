import { NextResponse } from "next/server";

export type MistakeCategory =
  | "Async"
  | "API"
  | "Logic"
  | "Config"
  | "Security"
  | "DB"
  | "Env"
  | "Hydration"
  | "Git"
  | "MCP";

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
  category: string;
  title: string;
  reason: string;
  matchedPersonalHabit: string | null;
  fixSuggestion: string;
}

export interface ChecklistItem {
  id: string;
  title: string;
  why: string;
  personalMatch: boolean;
}

export interface FixStep {
  stepNumber: number;
  where: string;
  instruction: string;
  codeOrCommand?: string;
}

export interface AuditResponse {
  // ① 3秒で分かる原因＆あなたの過去クセ一致アラート
  quickCause: string;
  whyItHappened: string;
  category: string;
  severity: "high" | "medium" | "low";
  matchedHabit: PersonalMistake | null;
  suggestedHabitPattern: string;

  // ② VS Code / ターミナルですぐ直す手順（1・2・3） + AI修正指示プロンプト + ターミナルコマンド
  fixSteps: FixStep[];
  aiFixPrompt: string;
  terminalCommand: string | null;

  // ③ 作業別チェックリスト & 補助フィールド
  riskScore: number;
  summary: string;
  diagnostics: DiagnosticIssue[];
  fixedCode: string;
  preflightChecklist: ChecklistItem[];
  source: "gemini" | "local-analyzer";
  taskType: string;
  errorLog: string;
}

const TASK_CHECKLIST_TEMPLATES: Record<
  string,
  Array<{ id: string; title: string; why: string; keywords: RegExp }>
> = {
  "Next.js API / フォーム送信": [
    {
      id: "next-1",
      title: "fetch() と res.json() の両方に await を付けたか",
      why: "Promise のまま参照して TypeError: res.json is not a function になる最多ミスを防ぎます。",
      keywords: /await|fetch|非同期|Promise|json/i,
    },
    {
      id: "next-2",
      title: "res.ok (HTTP 200-299) を確認してから .json() を呼んでいるか",
      why: "404/500 エラー時に HTML が返って SyntaxError で落ちる事故を防ぎます。",
      keywords: /ok|json|HTTP|ステータス|エラー/i,
    },
    {
      id: "next-3",
      title: "送信ボタンの二度押し防止（disabled={loading}）を入れたか",
      why: "通信中の連打による二重登録・重複送信を防ぎます。",
      keywords: /二重|連打|disabled|loading/i,
    },
    {
      id: "next-4",
      title: "環境変数（process.env）のスペルと NEXT_PUBLIC_ の有無を確認したか",
      why: "クライアント側で undefined になり通信先 URL が壊れるミスを防ぎます。",
      keywords: /env|環境変数|NEXT_PUBLIC/i,
    },
  ],
  "React / Next.js 画面・Hydration": [
    {
      id: "hyd-1",
      title: "useState / useEffect / onClick を使うファイルの先頭に 'use client' を書いたか",
      why: "Next.js App Router で Server Component 扱いになりビルド・実行エラーになるのを防ぎます。",
      keywords: /use client|useState|useEffect|Hydration|React/i,
    },
    {
      id: "hyd-2",
      title: "localStorage / window / Date.now() を初期レンダリング中に直接呼んでいないか",
      why: "サーバー描画とブラウザ描画の結果がズレる Hydration failed エラーを防ぎます。",
      keywords: /Hydration|localStorage|window|Date/i,
    },
    {
      id: "hyd-3",
      title: "リスト描画（.map）の直下要素に一意な key={item.id} を付けたか",
      why: "表示順序ズレや React コンソール警告を防ぎます。",
      keywords: /key|map|配列|React/i,
    },
    {
      id: "hyd-4",
      title: "<p> の中に <div> や <button> の中に <button> を入れ子にしていないか",
      why: "HTML 仕様違反による Hydration mismatch クラッシュを防ぎます。",
      keywords: /Hydration|タグ|HTML/i,
    },
  ],
  "Node.js / パッケージ・環境設定": [
    {
      id: "env-1",
      title: "import パスの大文字・小文字が実際のファイル名と完全一致しているか",
      why: "Module not found: Can't resolve エラーやデプロイ先（Linux）でのビルド失敗を防ぎます。",
      keywords: /パス|Module|import|Env|Windows|Linux/i,
    },
    {
      id: "env-2",
      title: "package.json 更新後に npm install を実行したか",
      why: "Cannot find module エラーを防ぎます。",
      keywords: /module|npm|install|パッケージ/i,
    },
    {
      id: "env-3",
      title: "EPERM ロックが出たら開発サーバー（npm run dev）を一度止めて再起動したか",
      why: "Windows で .next フォルダがロックされてビルドが止まる現象を即解消できます。",
      keywords: /EPERM|ロック|Windows|\.next/i,
    },
    {
      id: "env-4",
      title: ".env.local を編集したあと開発サーバーを再起動したか",
      why: "環境変数の変更が反映されず undefined のまま悩む時間をゼロにします。",
      keywords: /env|環境変数|Config/i,
    },
  ],
  "Git / GitHub Push・PR作成": [
    {
      id: "git-1",
      title: "作業開始前・push 前に git pull（最新取得）を実行したか",
      why: "non-fast-forward / push rejected エラーや大きなコンフリクトを防ぎます。",
      keywords: /git|pull|push|rejected|コンフリクト/i,
    },
    {
      id: "git-2",
      title: ".env や API キー・シークレットが git status に混ざっていないか",
      why: "GitHub への秘密鍵誤公開インシデントを未然に防ぎます。",
      keywords: /secret|env|セキュリティ|GitHub|漏洩/i,
    },
    {
      id: "git-3",
      title: "コンフリクト解消後に <<<<<<< HEAD マーカーが残っていないか",
      why: "マーカー残存による構文エラー（SyntaxError）を防ぎます。",
      keywords: /コンフリクト|CONFLICT|Git/i,
    },
    {
      id: "git-4",
      title: "コミット前に npx tsc --noEmit で型エラーがないか確認したか",
      why: "GitHub Actions / Vercel デプロイでのビルド失敗を防ぎます。",
      keywords: /tsc|型|ビルド/i,
    },
  ],
  "Python / データ処理・スクリプト": [
    {
      id: "py-1",
      title: "open() でファイルを読み書きするとき encoding='utf-8' を明示したか",
      why: "Windows (cp932) 環境での UnicodeDecodeError 文字化けクラッシュを防ぎます。",
      keywords: /UTF|encoding|Windows|Python|open/i,
    },
    {
      id: "py-2",
      title: "JavaScript の JSON.parse と Python の json.loads を混同していないか",
      why: "言語切り替え直後の NameError / AttributeError を防ぎます。",
      keywords: /JSON|Python|構文/i,
    },
    {
      id: "py-3",
      title: "割り算や平均計算の前に空リスト（len == 0）ガードを入れたか",
      why: "バッチ処理途中の ZeroDivisionError 停止を防ぎます。",
      keywords: /ゼロ除算|len|境界|空/i,
    },
    {
      id: "py-4",
      title: "仮想環境（venv）を有効化してから pip install / 実行しているか",
      why: "ModuleNotFoundError: No module named ... を防ぎます。",
      keywords: /ModuleNotFound|pip|パッケージ/i,
    },
  ],
  "DB / 認証・本番リリース前チェック": [
    {
      id: "rel-1",
      title: "デバッグ用の console.log（特に token / secret）を削除したか",
      why: "本番ログへの認証情報・個人情報の露出を防ぎます。",
      keywords: /console|token|secret|Security|ログ/i,
    },
    {
      id: "rel-2",
      title: "配列ループの境界条件が <= .length ではなく < .length になっているか",
      why: "最後の要素で undefined 参照（off-by-one）になるバグを防ぎます。",
      keywords: /length|<=|境界|off-by-one/i,
    },
    {
      id: "rel-3",
      title: "既存テーブルへのカラム追加で DEFAULT なしの NOT NULL にしていないか",
      why: "本番 DB マイグレーションの即死エラーを防ぎます。",
      keywords: /DB|NOT NULL|マイグレーション|SQL/i,
    },
    {
      id: "rel-4",
      title: "本番デプロイ先に必要な環境変数がすべて登録されているか",
      why: "リリース直後の 500 エラーや真っ白画面を防ぎます。",
      keywords: /env|環境変数|本番|Config/i,
    },
  ],
  "MCP / AIエージェント設定": [
    {
      id: "mcp-1",
      title: "MCP ツール定義（inputSchema / JSON Schema）の型と必須項目が実装と一致しているか",
      why: "AIエージェント呼び出し時の Schema validation failed / Invalid tool arguments エラーを防ぎます。",
      keywords: /MCP|Schema|inputSchema|tool|Agent/i,
    },
    {
      id: "mcp-2",
      title: "MCP stdio サーバー内で console.log() ではなく console.error() を使っているか",
      why: "標準出力（stdout）にログが混ざって JSON-RPC 通信が壊れる 2026 最多トラブルを防ぎます。",
      keywords: /MCP|stdio|console|JSON-RPC|transport/i,
    },
    {
      id: "mcp-3",
      title: "Agent SDK / MCP 通信で HTTP 429 / 503 ステータス消失時のリトライ・ログを出しているか",
      why: "SDK がステータスコードを削ぎ落として原因不明の Transport Error になる現象を防ぎます。",
      keywords: /429|503|MCP|SDK|rate limit|timeout/i,
    },
    {
      id: "mcp-4",
      title: "外部リポジトリの AGENTS.md / setup.js / postinstall に不審な curl | sh や環境変数送信がないか確認したか",
      why: "AIエージェントの自動実行を悪用するプロンプトインジェクション・サプライチェーン攻撃を防ぎます。",
      keywords: /AGENTS\.md|Security|curl|postinstall|env|サプライチェーン/i,
    },
  ],
};

function buildChecklistForTask(
  taskType: string,
  habits: PersonalMistake[]
): ChecklistItem[] {
  const template =
    TASK_CHECKLIST_TEMPLATES[taskType] ??
    TASK_CHECKLIST_TEMPLATES["Next.js API / フォーム送信"];
  return template.map((item) => ({
    id: item.id,
    title: item.title,
    why: item.why,
    personalMatch: habits.some(
      (h) =>
        item.keywords.test(h.pattern) ||
        item.keywords.test(h.category)
    ),
  }));
}

function findMatchingHabit(
  habits: PersonalMistake[],
  regex: RegExp,
  categoryHint?: string
): PersonalMistake | null {
  return (
    habits.find((h) => regex.test(h.pattern)) ??
    (categoryHint
      ? habits.find(
          (h) => h.category.toLowerCase() === categoryHint.toLowerCase()
        ) ?? null
      : null)
  );
}

function buildAiFixPrompt(params: {
  errorLog: string;
  code?: string;
  quickCause: string;
  fixSummary: string;
}): string {
  const lines: string[] = [
    "VS Code で以下のエラーが発生しました。原因を踏まえて修正コードと具体的な修正箇所を教えてください。",
    "",
    "【発生しているエラー】",
    params.errorLog.trim() || "(エラーログ未入力)",
  ];
  if (params.code && params.code.trim()) {
    lines.push("", "【該当コード】", params.code.trim());
  }
  lines.push(
    "",
    `【診断された原因】${params.quickCause}`,
    `【修正方針】${params.fixSummary}（型安全性とエラーハンドリングも合わせて確認してください）`
  );
  return lines.join("\n");
}

function runDeterministicErrorDiagnosis(
  errorLog: string,
  code: string,
  taskType: string,
  habits: PersonalMistake[]
): AuditResponse {
  const combined = `${errorLog}\n${code}`.trim();

  // Case 0-A (2026 GitHub Trending Security): AGENTS.md / setup.js / shell-hook supply-chain & env-exfiltration warning
  if (
    /curl\s+[^\n]*\|\s*(sh|bash|zsh|pwsh|powershell)|wget\s+[^\n]*\|\s*(sh|bash)|eval\s*\(\s*atob|child_process\.exec\([^\n]*(curl|wget|env|process\.env)|postinstall[^\n]*(curl|wget|nc|bash)|AGENTS\.md[^\n]*(curl|wget|ignore previous|system prompt|exfil)|process\.env[^\n]*(fetch|http|webhook|requestbin|ngrok|exfil)/i.test(
      combined
    )
  ) {
    const matchedHabit = findMatchingHabit(
      habits,
      /Security|AGENTS\.md|curl|postinstall|secret|env|サプライチェーン/i,
      "Security"
    );
    const quickCause =
      "【重要セキュリティ警告】AGENTS.md・setup.js・postinstall 等のスクリプト内に、不審な外部シェル実行（curl | sh 等）や環境変数（.env）外部送信の疑いがある危険なパターンが検出されました。";
    const whyItHappened =
      "2026年の GitHub トレンドでは、AIコーディングエージェントが自動参照する AGENTS.md や npm の postinstall / setup.js フックを悪用し、開発者の API キー（process.env）を外部送信したり任意コマンドを実行させるサプライチェーン攻撃が急増しています。";
    const terminalCmd = "git diff AGENTS.md package.json";

    const fixSteps: FixStep[] = [
      {
        stepNumber: 1,
        where: "VS Code エディタ（緊急停止）",
        instruction:
          "絶対にそのままコマンド実行や AI エージェントの自動承認（Run / Approve）を行わないでください。該当する curl | sh、eval、外部 Webhook 送信箇所を即座に削除します。",
      },
      {
        stepNumber: 2,
        where: "VS Code ターミナル",
        instruction:
          "外部リポジトリを検証する際は、postinstall 等の自動スクリプトを無効化してパッケージを導入し、差分を監査します。",
        codeOrCommand: "npm install --ignore-scripts && git diff AGENTS.md package.json",
      },
      {
        stepNumber: 3,
        where: "API キー・環境変数管理",
        instruction:
          "万が一すでに実行してしまった場合は、.env / .env.local に含まれる API キーや GitHub トークンを直ちに失効（Revoke）して再発行してください。",
      },
    ];

    return {
      quickCause,
      whyItHappened,
      category: "Security",
      severity: "high",
      matchedHabit,
      suggestedHabitPattern:
        "外部リポジトリの AGENTS.md / postinstall 自動実行スクリプトの安全性監査",
      fixSteps,
      aiFixPrompt: buildAiFixPrompt({
        errorLog,
        code,
        quickCause,
        fixSummary:
          "コードおよび設定ファイル内の不審な外部通信（curl/wget/fetch）・シェル実行・process.env 漏洩リスクをすべて洗い出し、安全な実装に無害化してください",
      }),
      terminalCommand: terminalCmd,
      riskScore: 96,
      summary: quickCause,
      diagnostics: [
        {
          line: 1,
          severity: "high",
          category: "Security",
          title: "AGENTS.md / シェルフック・サプライチェーン攻撃リスク検出",
          reason: whyItHappened,
          matchedPersonalHabit:
            matchedHabit?.pattern ??
            "外部リポジトリの AGENTS.md / postinstall 自動実行スクリプトの安全性監査",
          fixSuggestion:
            "不審な curl | sh / eval / 外部環境変数送信を削除し、npm install --ignore-scripts を使用",
        },
      ],
      fixedCode: code,
      preflightChecklist: buildChecklistForTask(
        "MCP / AIエージェント設定",
        habits
      ),
      source: "local-analyzer",
      taskType,
      errorLog,
    };
  }

  // Case 0-B (2026 GitHub Trending AI Dev): MCP / Agent SDK errors (stripped HTTP 429/503 status codes, schema mismatch, transport timeout)
  if (
    /MCP|Model Context Protocol|McpError|JSON-RPC|-32600|-32601|-32602|-32603|Transport closed|stdio transport|SSE transport|inputSchema|Invalid tool arguments|Schema validation failed|Agent SDK|429 Too Many Requests|503 Service Unavailable|status code stripped|rate_limit_exceeded/i.test(
      combined
    )
  ) {
    const matchedHabit = findMatchingHabit(
      habits,
      /MCP|Agent|Schema|429|503|stdio|JSON-RPC|API/i,
      "MCP"
    );
    const quickCause =
      "MCP サーバーまたは Agent SDK 通信で、HTTP 429/503 ステータスコード消失（レート制限）・inputSchema の型不一致・または stdio 標準出力への console.log 混入によるトランスポート切断が起きています。";
    const whyItHappened =
      "2026年の AI エージェント / MCP 開発で頻発する3大原因です：① Agent SDK が上流の HTTP 429/503 エラーのステータスコードを削ぎ落として汎用 Transport Error に変換してしまう、② stdio 通信中に console.log() を使って JSON-RPC が壊れる、③ ツール定義の inputSchema と引数の型がズレているケースです。";

    const fixSteps: FixStep[] = [
      {
        stepNumber: 1,
        where: "VS Code エディタ (MCP Server / SDK)",
        instruction:
          "stdio 型の MCP サーバー内で console.log() を使っている箇所をすべて console.error() に変更し、JSON-RPC パイプの破損を防ぎます。",
        codeOrCommand: `// NG: stdout に混ざり JSON-RPC がクラッシュします\n// console.log("Tool called");\n// OK: stderr に出力します\nconsole.error("[MCP Server] Tool called safely");`,
      },
      {
        stepNumber: 2,
        where: "VS Code エディタ (429/503 ハンドリング)",
        instruction:
          "Agent SDK が HTTP 429 / 503 のステータスコードを握り潰さないよう、err.cause / status / Retry-After ヘッダーを保持して指数バックオフ（待機リトライ）を入れます。",
        codeOrCommand: `if (err?.status === 429 || err?.status === 503 || /429|503|rate/i.test(String(err?.cause ?? err))) {\n  console.error("[Agent SDK] Rate limit or 503 overload detected. Backing off...");\n}`,
      },
      {
        stepNumber: 3,
        where: "VS Code エディタ (inputSchema 検証)",
        instruction:
          "MCP ツールの inputSchema (JSON Schema / Zod) の required 配列とプロパティ型が実装と一致しているか型チェックで確認します。",
        codeOrCommand: "npx tsc --noEmit",
      },
    ];

    return {
      quickCause,
      whyItHappened,
      category: "MCP",
      severity: "high",
      matchedHabit,
      suggestedHabitPattern:
        "MCP stdio の console.log 混入と Agent SDK の HTTP 429/503 ステータス消失対策",
      fixSteps,
      aiFixPrompt: buildAiFixPrompt({
        errorLog,
        code,
        quickCause,
        fixSummary:
          "MCP サーバーの stdout 汚染（console.log → console.error）修正、inputSchema の型整合性修正、および HTTP 429/503 ステータス保持とリトライ処理を追加してください",
      }),
      terminalCommand: "npx tsc --noEmit",
      riskScore: 82,
      summary: quickCause,
      diagnostics: [
        {
          line: 1,
          severity: "high",
          category: "MCP",
          title: "MCP / Agent SDK トランスポート・Schema・HTTP 429/503 診断",
          reason: whyItHappened,
          matchedPersonalHabit:
            matchedHabit?.pattern ??
            "MCP stdio の console.log 混入と Agent SDK の HTTP 429/503 ステータス消失対策",
          fixSuggestion:
            "console.error への切り替え、inputSchema 整合性確認、429/503 バックオフの追加",
        },
      ],
      fixedCode: code
        ? code.replace(/console\.log\s*\(/g, "console.error(")
        : "",
      preflightChecklist: buildChecklistForTask(
        "MCP / AIエージェント設定",
        habits
      ),
      source: "local-analyzer",
      taskType,
      errorLog,
    };
  }

  // Case 1: TypeError / res.json is not a function / await forgotten / Promise
  if (
    /is not a function|res\.json|Promise|await|Cannot read properties of undefined/i.test(
      combined
    ) &&
    !/Hydration|use client/i.test(errorLog)
  ) {
    const matchedHabit = findMatchingHabit(
      habits,
      /await|fetch|非同期|Promise|json/i,
      "Async"
    );
    const quickCause =
      "fetch() または非同期処理の前に「await」を付け忘れているため、完了前の Promise や undefined に対してメソッドを呼んでいます。";
    const whyItHappened =
      "JavaScript / TypeScript の fetch() や res.json() は非同期（Promise）です。await を書かないとデータ本体ではなく「通信待ちの箱（Promise）」が入るため、res.json is not a function や undefined 参照エラーが発生します。";
    const fixSteps: FixStep[] = [
      {
        stepNumber: 1,
        where: "VS Code エディタ",
        instruction:
          "エラー行（fetch や API 呼び出しをしている箇所）を開き、関数の先頭に async が付いているか確認します。",
      },
      {
        stepNumber: 2,
        where: "VS Code エディタ",
        instruction:
          "fetch() と res.json() の両方の前に await を追加し、res.ok チェックを1行挟みます。",
        codeOrCommand: `const res = await fetch(url, options);\nif (!res.ok) throw new Error(\`HTTP Error: \${res.status}\`);\nconst data = await res.json();`,
      },
      {
        stepNumber: 3,
        where: "VS Code ターミナル",
        instruction:
          "保存後、型チェックを実行して他の await 漏れがないか確認します。",
        codeOrCommand: "npx tsc --noEmit",
      },
    ];

    return {
      quickCause,
      whyItHappened,
      category: "Async",
      severity: "high",
      matchedHabit,
      suggestedHabitPattern: "fetch / 非同期処理の await 忘れ",
      fixSteps,
      aiFixPrompt: buildAiFixPrompt({
        errorLog,
        code,
        quickCause,
        fixSummary:
          "fetch() と res.json() に await を追加し、res.ok のステータス確認と undefined ガードを入れて修正してください",
      }),
      terminalCommand: "npx tsc --noEmit",
      riskScore: 84,
      summary: quickCause,
      diagnostics: [
        {
          line: 1,
          severity: "high",
          category: "Async",
          title: "非同期処理の await 抜け（Promise のまま参照）",
          reason: whyItHappened,
          matchedPersonalHabit:
            matchedHabit?.pattern ?? "fetch / 非同期処理の await 忘れ",
          fixSuggestion:
            "const res = await fetch(...); const data = await res.json();",
        },
      ],
      fixedCode: code
        ? code
            .replace(/=\s*fetch\s*\(/g, "= await fetch(")
            .replace(/=\s*(\w+)\.json\s*\(/g, "= await $1.json(")
        : "",
      preflightChecklist: buildChecklistForTask(taskType, habits),
      source: "local-analyzer",
      taskType,
      errorLog,
    };
  }

  // Case 2: EPERM / Module not found / Can't resolve / ENOENT
  if (
    /EPERM|ENOENT|Module not found|Can't resolve|Cannot find module|FileNotFoundError|No module named/i.test(
      combined
    )
  ) {
    const matchedHabit = findMatchingHabit(
      habits,
      /パス|Module|import|EPERM|Windows|Env/i,
      "Env"
    );
    const isEperm = /EPERM|operation not permitted/i.test(combined);
    const quickCause = isEperm
      ? "Windows で開発サーバーが .next やファイルを掴んでロックしている（EPERM）か、import パスの大文字・小文字ズレが起きています。"
      : "import 先のファイルパス（大文字・小文字・階層）が違っているか、パッケージがまだ npm install されていません。";
    const whyItHappened =
      "VS Code でファイル名を変更した直後やパッケージ追加直後によく起きます。また Windows 環境では複数の npm run dev が同時に動いていると .next フォルダへの書き込みが EPERM で拒否されることがあります。";
    const terminalCmd = isEperm
      ? "Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue; npm run dev"
      : "npm install && npx tsc --noEmit";

    const fixSteps: FixStep[] = [
      {
        stepNumber: 1,
        where: "VS Code エディタ",
        instruction:
          "エラーに出ている import 文を Ctrl + クリックし、ファイル名の大文字・小文字（例: OrderCard と ordercard）が実際のファイルと完全一致しているか確認します。",
      },
      {
        stepNumber: 2,
        where: "VS Code ターミナル",
        instruction: isEperm
          ? "実行中のターミナルで Ctrl + C を押してサーバーを止め、.next キャッシュをクリアして再起動します。"
          : "不足しているパッケージをインストールし、型チェックでパス解決を確認します。",
        codeOrCommand: terminalCmd,
      },
      {
        stepNumber: 3,
        where: "VS Code コマンドパレット",
        instruction:
          "赤波線が消えない場合は Ctrl+Shift+P →「TypeScript: Restart TS Server」を実行します。",
      },
    ];

    return {
      quickCause,
      whyItHappened,
      category: "Env",
      severity: "high",
      matchedHabit,
      suggestedHabitPattern:
        "import パス大文字小文字ミス・パッケージ未導入・EPERMロック",
      fixSteps,
      aiFixPrompt: buildAiFixPrompt({
        errorLog,
        code,
        quickCause,
        fixSummary:
          "import パスの大文字・小文字・エイリアス（@/）のズレを修正し、必要なパッケージまたは EPERM 回避手順を提示してください",
      }),
      terminalCommand: terminalCmd,
      riskScore: 76,
      summary: quickCause,
      diagnostics: [
        {
          line: 1,
          severity: "high",
          category: "Env",
          title: "モジュール未検出 / EPERM ファイルロック",
          reason: whyItHappened,
          matchedPersonalHabit: matchedHabit?.pattern ?? null,
          fixSuggestion: terminalCmd,
        },
      ],
      fixedCode: code,
      preflightChecklist: buildChecklistForTask(taskType, habits),
      source: "local-analyzer",
      taskType,
      errorLog,
    };
  }

  // Case 3: Next.js Hydration / "use client" error
  if (
    /Hydration failed|server rendered HTML|use client|Client Component|useState|useEffect|window is not defined|localStorage is not defined/i.test(
      combined
    )
  ) {
    const matchedHabit = findMatchingHabit(
      habits,
      /use client|Hydration|Next|React|localStorage|window/i,
      "Hydration"
    );
    const quickCause =
      "ファイルの1行目に `\"use client\";` を書き忘れているか、サーバー描画とブラウザ描画で異なる値（Date.now / localStorage / 乱数）を直接表示しています。";
    const whyItHappened =
      "Next.js (App Router) ではすべてのコンポーネントが標準でサーバー側で実行されます。useState / useEffect / onClick を使う場合は先頭に \"use client\" が必要で、ブラウザ専用の値はマウント後（useEffect内）で読み込む必要があります。";

    const fixSteps: FixStep[] = [
      {
        stepNumber: 1,
        where: "VS Code エディタ",
        instruction:
          "エラーが発生しているコンポーネントの1行目（すべての import より上）に \"use client\"; を追加します。",
        codeOrCommand: `"use client";\n\nimport React, { useState, useEffect } from "react";`,
      },
      {
        stepNumber: 2,
        where: "VS Code エディタ",
        instruction:
          "Date.now()、Math.random()、localStorage、window を JSX 内で直接使っている箇所があれば、useEffect の中で state にセットするよう移動します。",
      },
      {
        stepNumber: 3,
        where: "ブラウザ / VS Code",
        instruction:
          "ファイルを保存（Ctrl + S）し、ブラウザをリロードして赤画面（Hydration Error）が消えることを確認します。",
      },
    ];

    return {
      quickCause,
      whyItHappened,
      category: "Hydration",
      severity: "high",
      matchedHabit,
      suggestedHabitPattern:
        "Next.js の 'use client' 宣言忘れ＆初期描画 Hydration ズレ",
      fixSteps,
      aiFixPrompt: buildAiFixPrompt({
        errorLog,
        code,
        quickCause,
        fixSummary:
          "ファイル先頭への \"use client\" 追加と、Hydration mismatch の原因になっている動的値（Date/localStorage/ネストタグ）を useEffect または安全な構造に修正してください",
      }),
      terminalCommand: "npx tsc --noEmit",
      riskScore: 78,
      summary: quickCause,
      diagnostics: [
        {
          line: 1,
          severity: "high",
          category: "Hydration",
          title: "Next.js Client Component 宣言または Hydration 不一致",
          reason: whyItHappened,
          matchedPersonalHabit: matchedHabit?.pattern ?? null,
          fixSuggestion: 'ファイル最上部に "use client"; を追加',
        },
      ],
      fixedCode: code ? `"use client";\n${code}` : "",
      preflightChecklist: buildChecklistForTask(
        "React / Next.js 画面・Hydration",
        habits
      ),
      source: "local-analyzer",
      taskType,
      errorLog,
    };
  }

  // Case 4: Git / GitHub push rejected / Merge conflict
  if (
    /rejected|non-fast-forward|failed to push|fetch first|CONFLICT|Merge conflict|<<<<<<<|divergent branches/i.test(
      combined
    )
  ) {
    const matchedHabit = findMatchingHabit(
      habits,
      /git|pull|push|rejected|コンフリクト/i,
      "Git"
    );
    const quickCause =
      "GitHub（リモート）側にまだ手元の PC に取り込んでいない最新コミットがあるため、上書き防止として git push がブロックされています。";
    const whyItHappened =
      "他のメンバー（または別環境・GitHub Web画面）で追加された変更がリモートにあります。先に git pull で手元に合流させてから再度 push すれば安全に解決します。";
    const terminalCmd = "git pull --rebase origin main";

    const fixSteps: FixStep[] = [
      {
        stepNumber: 1,
        where: "VS Code ターミナル",
        instruction:
          "まず GitHub 側の最新変更を手元のブランチに取り込みます（下のコマンドをコピーして実行）。",
        codeOrCommand: terminalCmd,
      },
      {
        stepNumber: 2,
        where: "VS Code ソース管理（コンフリクト時のみ）",
        instruction:
          "もし CONFLICT と表示されたら、VS Code で該当ファイルを開き「現在の変更を取り込む」または「両方の変更を取り込む」をクリックして保存します。",
      },
      {
        stepNumber: 3,
        where: "VS Code ターミナル",
        instruction:
          "取り込み完了後、もう一度 GitHub へ push します。",
        codeOrCommand: "git push origin main",
      },
    ];

    return {
      quickCause,
      whyItHappened,
      category: "Git",
      severity: "medium",
      matchedHabit,
      suggestedHabitPattern:
        "作業前・push前の git pull 忘れによる push rejected",
      fixSteps,
      aiFixPrompt: buildAiFixPrompt({
        errorLog,
        code,
        quickCause,
        fixSummary:
          "現在の Git エラーを安全に解消し、作業中の変更を失わずに GitHub に push するまでの正確なコマンド手順を案内してください",
      }),
      terminalCommand: terminalCmd,
      riskScore: 68,
      summary: quickCause,
      diagnostics: [
        {
          line: 1,
          severity: "medium",
          category: "Git",
          title: "GitHub リモート差分による push rejected / 競合",
          reason: whyItHappened,
          matchedPersonalHabit: matchedHabit?.pattern ?? null,
          fixSuggestion: terminalCmd,
        },
      ],
      fixedCode: code,
      preflightChecklist: buildChecklistForTask(
        "Git / GitHub Push・PR作成",
        habits
      ),
      source: "local-analyzer",
      taskType,
      errorLog,
    };
  }

  // Case 5: SyntaxError / Unexpected token '<' (HTML returned instead of JSON)
  if (
    /SyntaxError|Unexpected token|Unexpected end of JSON|<!DOCTYPE|JSON\.parse/i.test(
      combined
    )
  ) {
    const matchedHabit = findMatchingHabit(
      habits,
      /ok|json|SyntaxError|API|エラー/i,
      "API"
    );
    const quickCause =
      "API から JSON ではなくエラー画面（HTML の <!DOCTYPE...）や空データが返っているのに、res.ok を確認せず .json() でパースしています。";
    const whyItHappened =
      "API の URL パス違い（404 Not Found）やサーバー側クラッシュ（500）のとき、ブラウザは HTML エラーページを受け取ります。それを JSON として読もうとすると 1文字目の `<` で SyntaxError になります。";

    const fixSteps: FixStep[] = [
      {
        stepNumber: 1,
        where: "VS Code エディタ",
        instruction:
          "res.json() の直前に if (!res.ok) チェックを追加し、エラー時のステータスと中身を確認できるようにします。",
        codeOrCommand: `if (!res.ok) {\n  const errText = await res.text();\n  throw new Error(\`API Error (\${res.status}): \${errText.slice(0, 120)}\`);\n}`,
      },
      {
        stepNumber: 2,
        where: "VS Code エディタ",
        instruction:
          "fetch('/api/...') の URL スペルと、対象の route.ts ファイルの場所・メソッド名（export async function POST など）が一致しているか確認します。",
      },
      {
        stepNumber: 3,
        where: "ブラウザ DevTools",
        instruction:
          "F12 → Network タブで赤いリクエストをクリックし、実際の HTTP ステータス（404 / 500）を確認します。",
      },
    ];

    return {
      quickCause,
      whyItHappened,
      category: "API",
      severity: "high",
      matchedHabit,
      suggestedHabitPattern: "response.ok を確認せずに .json() してしまう",
      fixSteps,
      aiFixPrompt: buildAiFixPrompt({
        errorLog,
        code,
        quickCause,
        fixSummary:
          "res.ok の事前チェックと try/catch を追加し、HTML エラー応答や空レスポンスでもクラッシュしないように修正してください",
      }),
      terminalCommand: "npx tsc --noEmit",
      riskScore: 80,
      summary: quickCause,
      diagnostics: [
        {
          line: 1,
          severity: "high",
          category: "API",
          title: "HTTP エラー応答時の JSON パース失敗（res.ok 未確認）",
          reason: whyItHappened,
          matchedPersonalHabit:
            matchedHabit?.pattern ??
            "response.ok を確認せずに .json() してしまう",
          fixSuggestion: "if (!res.ok) throw new Error(...)",
        },
      ],
      fixedCode: code,
      preflightChecklist: buildChecklistForTask(taskType, habits),
      source: "local-analyzer",
      taskType,
      errorLog,
    };
  }

  // Case 6: Default / General Error or TypeScript / Env / Logic issue
  const matchedHabit =
    findMatchingHabit(
      habits,
      /env|境界|length|型|undefined|null|Logic|Config/i
    ) ??
    habits[0] ??
    null;

  const quickCause = errorLog.trim()
    ? `エラーログ「${errorLog.trim().split("\n")[0].slice(0, 70)}」は、未定義値（undefined）参照・型不一致・または環境設定の抜けが原因です。`
    : "作業前の落とし穴チェック完了：あなたの過去クセDNAと照合し、注意すべきポイントを整理しました。";

  const whyItHappened =
    "VS Code 上で期待しているデータの型や環境変数（process.env）、または配列の境界条件が実行時の値と食い違っている可能性があります。以下の3ステップで安全に切り分けられます。";

  const fixSteps: FixStep[] = [
    {
      stepNumber: 1,
      where: "VS Code エディタ",
      instruction:
        "エラーメッセージ末尾の「ファイル名:行番号」を Ctrl + クリックして該当行へジャンプし、変数が undefined になるケースに ?. と ??（初期値）を付けます。",
    },
    {
      stepNumber: 2,
      where: "VS Code ターミナル",
      instruction:
        "TypeScript の一括型チェックを実行して、関連する型ズレ箇所を洗い出します。",
      codeOrCommand: "npx tsc --noEmit",
    },
    {
      stepNumber: 3,
      where: "VS Code / AI チャット",
      instruction:
        "下の「🤖 VS Code / AI にそのまま貼る修正指示をコピー」ボタンを押して、VS Code の AI チャットに貼り付けると即座に修正コードが得られます。",
    },
  ];

  return {
    quickCause,
    whyItHappened,
    category: "Logic",
    severity: "medium",
    matchedHabit,
    suggestedHabitPattern:
      errorLog.trim().split("\n")[0].slice(0, 48) ||
      "undefined ガード（?. / ??）と型チェック漏れ",
    fixSteps,
    aiFixPrompt: buildAiFixPrompt({
      errorLog,
      code,
      quickCause,
      fixSummary:
        "エラーの原因箇所を特定し、undefined/null ガードと型整合性を保った修正コードを提示してください",
    }),
    terminalCommand: "npx tsc --noEmit",
    riskScore: 62,
    summary: quickCause,
    diagnostics: [
      {
        line: 1,
        severity: "medium",
        category: "Logic",
        title: "エラーログ＆過去クセDNA照合診断",
        reason: whyItHappened,
        matchedPersonalHabit: matchedHabit?.pattern ?? null,
        fixSuggestion: "npx tsc --noEmit で型と未定義参照を確認",
      },
    ],
    fixedCode: code,
    preflightChecklist: buildChecklistForTask(taskType, habits),
    source: "local-analyzer",
    taskType,
    errorLog,
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const errorLog = String(body.errorLog ?? "");
    const code = String(body.code ?? "");
    const taskType = String(body.taskType ?? "Next.js API / フォーム送信");
    const imageDataUrl =
      typeof body.imageDataUrl === "string" ? body.imageDataUrl : "";
    const habits: PersonalMistake[] = Array.isArray(body.habits)
      ? body.habits
      : [];

    const hasImage = /^data:image\/(png|jpeg|jpg|webp);base64,/i.test(
      imageDataUrl
    );
    const githubUrlMatch = errorLog.match(
      /https?:\/\/github\.com\/([\w.-]+)\/([\w.-]+)/i
    );

    const fallback = runDeterministicErrorDiagnosis(
      errorLog ||
        (hasImage
          ? "スクリーンショット画像からエラー画面を読み取り中（VS Code / ターミナル / GitHub画面）"
          : ""),
      code,
      githubUrlMatch ? "Git / GitHub Push・PR作成" : taskType,
      habits
    );

    if (githubUrlMatch && !errorLog.includes("rejected")) {
      const repoLabel = `${githubUrlMatch[1]}/${githubUrlMatch[2]}`;
      fallback.quickCause = `GitHub リポジトリ（${repoLabel}）の公開前・利用前セキュリティ＆構成チェックを実行しました。`;
      fallback.whyItHappened =
        "外部リポジトリのクローンや自作リポジトリの公開前には、秘密鍵（.env）混入・package.json の不審な postinstall スクリプト・AGENTS.md のプロンプトインジェクションを確認するのが 2026 年の標準安全手順です。";
      fallback.category = "Security";
      fallback.severity = "medium";
      fallback.fixSteps = [
        {
          stepNumber: 1,
          where: "VS Code ターミナル",
          instruction: `${repoLabel} に秘密鍵や .env が含まれていないか、追跡ファイル一覧を確認します。`,
          codeOrCommand: "git ls-files | findstr /I \".env secret key\"",
        },
        {
          stepNumber: 2,
          where: "VS Code エディタ",
          instruction:
            "package.json の scripts（特に preinstall / postinstall）や AGENTS.md に不審な外部送信・curl | sh が含まれていないか目視確認します。",
        },
        {
          stepNumber: 3,
          where: "VS Code ターミナル",
          instruction:
            "依存関係の既知脆弱性と TypeScript 型エラーを公開前に一括チェックします。",
          codeOrCommand: "npm audit --omit=dev && npx tsc --noEmit",
        },
      ];
      fallback.terminalCommand = "npm audit --omit=dev && npx tsc --noEmit";
    } else if (hasImage && !errorLog.trim()) {
      fallback.quickCause =
        "添付されたエラー画面スクリーンショットを受け付けました。Gemini Vision API キーが設定されている環境では画像内のエラー行を自動OCR解析します。";
      fallback.whyItHappened =
        "現在はローカルフォールバック診断モードで動作しています。画面の赤いエラー1行目を上の欄にコピー＆ペーストするか、Vercel / .env.local に GEMINI_API_KEY を設定すると、スクショからファイル名・行番号・直し方を完全自動抽出できます。";
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (
      apiKey &&
      (errorLog.trim().length > 0 || code.trim().length > 0 || hasImage)
    ) {
      try {
        const prompt = [
          "あなたはVS CodeやGitHubで開発中のユーザーを助ける「エラー即解決サイドキックAI（マルチモーダルVision対応）」です。",
          "ユーザーが貼り付けたエラーログ・スクリーンショット画像（VS Codeの赤い波線・ターミナル・GitHub Actions等）・任意のコード断片と、ユーザーの過去のミスクセDNAを照合し、初心者にも3秒で分かる原因とVS Code/ターミナルでの具体的な直し方をJSONで返してください。",
          hasImage
            ? "【重要】添付されたスクリーンショット画像内のエラーメッセージ・ファイル名・行番号・スタックトレースを正確に読み取って診断してください。"
            : "",
          githubUrlMatch
            ? `【GitHub URL 検出】${githubUrlMatch[0]} に関する構成・公開前チェック・セキュリティ観点（.env漏洩・postinstall・AGENTS.md安全確認）も踏まえて回答してください。`
            : "",
          `現在の作業種類: ${taskType}`,
          `ユーザーの過去クセDNA一覧: ${JSON.stringify(
            habits.map((h) => ({
              id: h.id,
              pattern: h.pattern,
              category: h.category,
              hits: h.hits,
            }))
          )}`,
          `貼り付けられたエラーログ:\n${errorLog || "(なし・スクリーンショット画像を参照)"}`,
          code.trim() ? `添えられた該当コード:\n${code}` : "",
          '必ず以下のJSONスキーマのみを返してください: {"quickCause":"1文で3秒で分かる原因の結論","whyItHappened":"初心者にも優しい理由説明","category":"Async|API|Logic|Config|Security|DB|Env|Hydration|Git|MCP","severity":"high|medium|low","matchedHabitPattern":"一致した過去クセのpattern文字列またはnull","suggestedHabitPattern":"今後再発防止としてクセDNAに記憶すべき短い名前","fixSteps":[{"stepNumber":1,"where":"VS Code エディタ または VS Code ターミナル","instruction":"具体的な手順","codeOrCommand":"修正コードやコマンド（任意）"}],"aiFixPrompt":"VS CodeのAI（Copilot/Antigravity/Cursor/Claude Code等）にそのまま貼れる丁寧な修正指示プロンプト","terminalCommand":"ターミナルで実行すべきコマンド1行またはnull"}',
        ]
          .filter(Boolean)
          .join("\n\n");

        const parts: Array<
          | { text: string }
          | { inlineData: { mimeType: string; data: string } }
        > = [{ text: prompt }];

        if (hasImage) {
          const match = imageDataUrl.match(
            /^data:(image\/(?:png|jpeg|jpg|webp));base64,(.+)$/i
          );
          if (match) {
            parts.push({
              inlineData: {
                mimeType:
                  match[1].toLowerCase() === "image/jpg"
                    ? "image/jpeg"
                    : match[1].toLowerCase(),
                data: match[2],
              },
            });
          }
        }

        const resp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts }],
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
            if (
              typeof parsed.quickCause === "string" &&
              Array.isArray(parsed.fixSteps)
            ) {
              const matchedHabit =
                (parsed.matchedHabitPattern &&
                  habits.find(
                    (h) =>
                      h.pattern.toLowerCase() ===
                      String(parsed.matchedHabitPattern).toLowerCase()
                  )) ||
                fallback.matchedHabit;

              return NextResponse.json({
                ...fallback,
                quickCause: parsed.quickCause,
                whyItHappened:
                  parsed.whyItHappened || fallback.whyItHappened,
                category: parsed.category || fallback.category,
                severity: parsed.severity || fallback.severity,
                matchedHabit,
                suggestedHabitPattern:
                  parsed.suggestedHabitPattern ||
                  fallback.suggestedHabitPattern,
                fixSteps:
                  parsed.fixSteps.length > 0
                    ? parsed.fixSteps
                    : fallback.fixSteps,
                aiFixPrompt: parsed.aiFixPrompt || fallback.aiFixPrompt,
                terminalCommand:
                  parsed.terminalCommand !== undefined
                    ? parsed.terminalCommand
                    : fallback.terminalCommand,
                summary: parsed.quickCause,
                source: "gemini",
              } satisfies AuditResponse);
            }
          }
        }
      } catch {
        // Fall back to deterministic error analyzer
      }
    }

    return NextResponse.json(fallback);
  } catch {
    return NextResponse.json(
      { error: "エラー診断リクエストの処理に失敗しました。" },
      { status: 400 }
    );
  }
}
