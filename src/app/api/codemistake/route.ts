import { NextResponse } from "next/server";

export type MistakeCategory =
  | "Async"
  | "API"
  | "Logic"
  | "Config"
  | "Security"
  | "DB"
  | "Env";

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

export interface AuditResponse {
  riskScore: number;
  summary: string;
  diagnostics: DiagnosticIssue[];
  fixedCode: string;
  preflightChecklist: ChecklistItem[];
  source: "gemini" | "local-analyzer";
  taskType: string;
  taskDeclaration?: string;
}

function convertGitHubUrlToRaw(inputUrl: string): {
  rawUrl: string;
  fileName: string;
  isValidGitHub: boolean;
} {
  const trimmed = inputUrl.trim();
  try {
    const parsed = new URL(trimmed);
    if (parsed.hostname === "raw.githubusercontent.com") {
      const parts = parsed.pathname.split("/").filter(Boolean);
      const fileName = parts[parts.length - 1] || "remote-file.ts";
      return { rawUrl: trimmed, fileName, isValidGitHub: true };
    }
    if (parsed.hostname === "github.com" || parsed.hostname === "www.github.com") {
      // Expected: /{owner}/{repo}/blob/{branch}/{...path}
      const parts = parsed.pathname.split("/").filter(Boolean);
      if (parts.length >= 5 && (parts[2] === "blob" || parts[2] === "raw")) {
        const owner = parts[0];
        const repo = parts[1];
        const branch = parts[3];
        const filePath = parts.slice(4).join("/");
        const fileName = parts[parts.length - 1] || "github-file.ts";
        const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
        return { rawUrl, fileName, isValidGitHub: true };
      }
    }
    if (parsed.hostname === "gist.githubusercontent.com") {
      const parts = parsed.pathname.split("/").filter(Boolean);
      const fileName = parts[parts.length - 1] || "gist-file.ts";
      return { rawUrl: trimmed, fileName, isValidGitHub: true };
    }
  } catch {
    // Invalid URL format
  }
  return { rawUrl: trimmed, fileName: "unknown", isValidGitHub: false };
}

const TASK_CHECKLIST_TEMPLATES: Record<
  string,
  Array<{ id: string; title: string; why: string; keywords: RegExp }>
> = {
  "Next.js API / フォーム送信": [
    {
      id: "next-1",
      title: "fetch() と res.json() の両方に await を付けたか",
      why: "Promise のまま参照して TypeError になる非同期実装で最多の事故を防ぎます。",
      keywords: /await|fetch|非同期|Promise/i,
    },
    {
      id: "next-2",
      title: "res.ok (HTTP 200-299) を確認してから .json() をパースしているか",
      why: "4xx/5xx エラー時に HTML エラーページを JSON パースしてクラッシュする事故を防ぎます。",
      keywords: /ok|json|HTTP|ステータス|エラー/i,
    },
    {
      id: "next-3",
      title: "送信ボタンの二重クリック防止（disabled={loading} / AbortController）を入れたか",
      why: "通信遅延時の連打による二重注文・DB重複レコード登録を防ぎます。",
      keywords: /二重|連打|disabled|loading/i,
    },
    {
      id: "next-4",
      title: "NEXT_PUBLIC_ とサーバー専用環境変数（秘密鍵）を取り違えていないか",
      why: "クライアントバンドルへの API シークレット漏洩と undefined 参照を防ぎます。",
      keywords: /env|環境変数|NEXT_PUBLIC|secret/i,
    },
    {
      id: "next-5",
      title: "リクエスト Body のスキーマ検証（空文字・型不正ガード）を行ったか",
      why: "不正ペイロードによる API Route の 500 クラッシュを防ぎます。",
      keywords: /バリデーション|検証|null|undefined|境界/i,
    },
  ],
  "Python ML / データ処理": [
    {
      id: "py-1",
      title: "train / test 分割前に全体へ fit_transform（データリーク）していないか",
      why: "検証スコアだけ異常に高く、本番推論で精度が崩壊する典型ミスを防ぎます。",
      keywords: /リーク|leak|fit_transform|split|ML/i,
    },
    {
      id: "py-2",
      title: "Windows / Linux パス区切り（pathlib.Path）と encoding='utf-8' を明示したか",
      why: "OS移行時の FileNotFoundError や cp932 UnicodeDecodeError を防ぎます。",
      keywords: /パス|Windows|Linux|UTF|encoding/i,
    },
    {
      id: "py-3",
      title: "空リスト・欠損値（NaN/None）混入時のゼロ除算ガードを入れたか",
      why: "バッチ推論や集計パイプラインの途中停止（ZeroDivisionError）を防ぎます。",
      keywords: /ゼロ除算|空|NaN|None|length|境界/i,
    },
    {
      id: "py-4",
      title: "JavaScript の構文（JSON.parse / .length）と Python（json.loads / len()）を混同していないか",
      why: "フルスタック開発者が言語切り替え直後に起こす AttributeError を防ぎます。",
      keywords: /JSON\.parse|json\.loads|構文|言語/i,
    },
    {
      id: "py-5",
      title: "乱数シード（random_state / seed）と推論時の eval() モード固定を確認したか",
      why: "実験の再現性欠如や Dropout 有効のまま本番推論する事故を防ぎます。",
      keywords: /seed|再現性|eval/i,
    },
  ],
  "DB マイグレーション": [
    {
      id: "db-1",
      title: "既存データがあるテーブルに DEFAULT なしの NOT NULL カラムを追加していないか",
      why: "本番デプロイ時のマイグレーション即死・テーブルロック事故を防ぎます。",
      keywords: /NOT NULL|DEFAULT|マイグレーション|カラム/i,
    },
    {
      id: "db-2",
      title: "SQL 文字列結合ではなくプレースホルダ（パラメータバインド）を使っているか",
      why: "SQL インジェクション脆弱性と特殊文字による構文エラーを根絶します。",
      keywords: /SQL|インジェクション|プレースホルダ|結合/i,
    },
    {
      id: "db-3",
      title: "複数テーブル更新をトランザクション（BEGIN / COMMIT / ROLLBACK）で囲んだか",
      why: "途中失敗時のデータ不整合（片方だけ更新される事故）を防ぎます。",
      keywords: /トランザクション|ロールバック|transaction|整合/i,
    },
    {
      id: "db-4",
      title: "WHERE 句や JOIN で頻繁に使う外部キー・日時カラムに INDEX を貼ったか",
      why: "レコード増加後のフルテーブルスキャンと DB CPU 100% 張り付きを防ぎます。",
      keywords: /INDEX|インデックス|スロークエリ|パフォーマンス/i,
    },
    {
      id: "db-5",
      title: "ロールバック用 Down スクリプトと事前スナップショット取得を確認したか",
      why: "万一の스키マ障害時に数分以内で安全に切り戻せます。",
      keywords: /バックアップ|ロールバック|復旧/i,
    },
  ],
  "認証・セキュリティ実装": [
    {
      id: "sec-1",
      title: "API キー・JWT シークレットをハードコードせず環境変数から読み込んでいるか",
      why: "GitHub 公開リポジトリへのクレデンシャル漏洩事故を防ぎます。",
      keywords: /secret|APIキー|ハードコード|env|トークン/i,
    },
    {
      id: "sec-2",
      title: "認証トークンやパスワード平文を console.log に出力していないか",
      why: "サーバーログ監視ツールからの個人情報・セッションハイジャック漏洩を防ぎます。",
      keywords: /ログ|console\.log|password|token|漏洩/i,
    },
    {
      id: "sec-3",
      title: "セッション Cookie に HttpOnly / Secure / SameSite 属性を設定したか",
      why: "XSS によるトークン窃取や CSRF 攻撃を防ぎます。",
      keywords: /Cookie|HttpOnly|XSS|CSRF|認証/i,
    },
    {
      id: "sec-4",
      title: "認可チェック（ログインユーザー自身のデータか）を API 側で検証しているか",
      why: "ID を書き換えるだけで他人のデータを閲覧・更新できる IDOR 脆弱性を防ぎます。",
      keywords: /認可|IDOR|権限|userId|認証/i,
    },
    {
      id: "sec-5",
      title: "タイミング攻撃を防ぐ定数時間比較（crypto.timingSafeEqual）やレート制限を入れたか",
      why: "ブルートフォース攻撃や署名検証の推測攻撃を防ぎます。",
      keywords: /timingSafeEqual|比較|ブルートフォース|署名/i,
    },
  ],
  "決済・外部Webhook": [
    {
      id: "pay-1",
      title: "Webhook 受信時に署名ヘッダー（stripe-signature 等）を生ボディで検証しているか",
      why: "第三者からの偽装決済完了リクエストによるタダ乗り被害を防ぎます。",
      keywords: /署名|Webhook|signature|検証|セキュリティ/i,
    },
    {
      id: "pay-2",
      title: "べき等キー（Idempotency Key / イベントID重複チェック）を実装したか",
      why: "Webhook の再送（リトライ）による二重課金・二重ポイント付与を防ぎます。",
      keywords: /べき等|idempotency|二重|リトライ/i,
    },
    {
      id: "pay-3",
      title: "金額計算で浮動小数点誤差（amount * 1.1）を放置せず整数（Math.round）で扱っているか",
      why: "1円単位の端数ズレや決済 API の整数バリデーションエラーを防ぎます。",
      keywords: /金額|小数|float|Math\.round|誤差|境界/i,
    },
    {
      id: "pay-4",
      title: "外部決済 API 呼び出しにタイムアウトとエラー時のステータス記録を入れたか",
      why: "通信切断時に決済成功・DB未反映となる宙吊り状態を防ぎます。",
      keywords: /タイムアウト|await|エラー|トランザクション/i,
    },
    {
      id: "pay-5",
      title: "テスト用キー（sk_test_）と本番キー（sk_live_）の環境分離を確認したか",
      why: "ステージング環境で実カード決済が走る重大インシデントを防ぎます。",
      keywords: /env|環境変数|本番|テスト/i,
    },
  ],
  "本番リリース前チェック": [
    {
      id: "rel-1",
      title: "デバッグ用の console.log / debugger / TODO コメントが残っていないか",
      why: "本番コンソールへの内部状態露出やブレークポイント停止を防ぎます。",
      keywords: /console\.log|debugger|TODO|ログ/i,
    },
    {
      id: "rel-2",
      title: "本番環境の必須環境変数（process.env）がすべてデプロイ先に登録済みか",
      why: "リリース直後の画面真っ白・500 Internal Server Error を防ぎます。",
      keywords: /env|環境変数|Config|未設定/i,
    },
    {
      id: "rel-3",
      title: "非同期エラー（try/catch 漏れ・Error Boundary 未設置）で画面全体が落ちないか",
      why: "一部の API 失敗でアプリ全体が操作不能になるのを防ぎます。",
      keywords: /try|catch|例外|await|非同期/i,
    },
    {
      id: "rel-4",
      title: "外部 API レート制限・タイムアウト時のフォールバック表示が機能するか",
      why: "アクセス集中時でもユーザーに適切な案内を表示できます。",
      keywords: /フォールバック|タイムアウト|API|ok/i,
    },
    {
      id: "rel-5",
      title: "型チェック（tsc --noEmit）と本番ビルド検証をクリアしたか",
      why: "型不整合や未定義参照によるランタイム障害をゼロにします。",
      keywords: /型|TypeScript|ビルド|境界/i,
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

function runDeterministicAudit(
  code: string,
  taskType: string,
  habits: PersonalMistake[],
  taskDeclaration?: string
): AuditResponse {
  const lines = code.split("\n");
  const diagnostics: DiagnosticIssue[] = [];
  const fixedLines = [...lines];

  lines.forEach((raw, idx) => {
    const lineNum = idx + 1;
    const trimmed = raw.trim();
    const indent = raw.match(/^\s*/)?.[0] ?? "";

    // 1. fetch() without await
    if (/=\s*fetch\s*\(/.test(raw) && !/await\s+fetch/.test(raw)) {
      const fixed = raw.replace(/=\s*fetch\s*\(/, "= await fetch(");
      diagnostics.push({
        line: lineNum,
        severity: "high",
        category: "Async",
        title: "fetch() に await が抜けています（Promise のまま参照）",
        reason:
          "非同期の fetch() に await を付け忘れると Response ではなく Promise オブジェクトが返り、後続のステータス確認や .json() で実行時エラーが発生します。",
        matchedPersonalHabit:
          habits.find((h) => /await|非同期|fetch/i.test(h.pattern))?.pattern ??
          "fetch / 非同期処理の await 忘れ",
        fixSuggestion: fixed.trim(),
      });
      fixedLines[idx] = fixed;
    }

    // 2. .json() without await or res.ok check
    if (/\.json\s*\(\s*\)/.test(raw) && !/await\s+.*\.json/.test(raw)) {
      const varMatch = raw.match(/=\s*(\w+)\.json\s*\(/);
      const resVar = varMatch?.[1] ?? "res";
      const awaitedLine = raw.replace(
        /=\s*(\w+)\.json\s*\(/,
        "= await $1.json("
      );
      const fixedBlock = `${indent}if (!${resVar}.ok) throw new Error(\`HTTP Error \${${resVar}.status}\`);\n${awaitedLine}`;
      diagnostics.push({
        line: lineNum,
        severity: "high",
        category: "API",
        title: `${resVar}.json() の await 抜け＆ ${resVar}.ok ステータス未検証`,
        reason:
          "res.json() は Promise を返します。さらに HTTP 4xx/5xx 時に res.ok を確認せず .json() を呼ぶと、エラー応答でアプリがクラッシュします。",
        matchedPersonalHabit:
          habits.find((h) => /ok|json|エラー/i.test(h.pattern))?.pattern ??
          "response.ok を確認せずに .json() してしまう",
        fixSuggestion: fixedBlock.trim(),
      });
      fixedLines[idx] = fixedBlock;
    }

    // 3. Off-by-one <= .length
    if (/for\s*\(.*<=\s*[\w.]+\.length/.test(raw)) {
      const fixed = raw.replace("<=", "<");
      diagnostics.push({
        line: lineNum,
        severity: "high",
        category: "Logic",
        title: "配列ループの境界値ミス（<= .length による範囲外アクセス）",
        reason:
          "0 始まり配列で <= .length まで反復すると、末尾の次の要素（undefined）を参照して TypeError または NaN 計算バグを引き起こします。",
        matchedPersonalHabit:
          habits.find((h) => /境界|length|<=|off-by-one/i.test(h.pattern))
            ?.pattern ?? "配列境界の <= .length（off-by-one）ミス",
        fixSuggestion: fixed.trim(),
      });
      fixedLines[idx] = fixed;
    }

    // 4. process.env without fallback or validation
    if (
      /process\.env\.([A-Z0-9_]+)/.test(raw) &&
      !/\?\?|\|\||if\s*\(|!process\.env/.test(raw)
    ) {
      const envMatch = raw.match(/process\.env\.([A-Z0-9_]+)/);
      const envName = envMatch?.[1] ?? "ENV_KEY";
      const fixed = `${raw}\n${indent}if (!process.env.${envName}) throw new Error("Missing required env: ${envName}");`;
      diagnostics.push({
        line: lineNum,
        severity: "medium",
        category: "Config",
        title: `環境変数 process.env.${envName} の未設定ガードがありません`,
        reason:
          "本番環境や別開発者のマシンで環境変数が未設定のとき undefined が静かに連結され、原因特定が困難な通信障害を起こします。",
        matchedPersonalHabit:
          habits.find((h) => /env|環境変数/i.test(h.pattern))?.pattern ??
          "環境変数 (process.env) の未設定チェック漏れ",
        fixSuggestion: fixed.trim(),
      });
      fixedLines[idx] = fixed;
    }

    // 5. Python / JS confusion: JSON.parse in Python or unprotected JSON.parse in JS
    if (/JSON\.parse\s*\(/.test(raw)) {
      if (/def\s+|import\s+json/.test(code)) {
        const fixed = raw.replace(/JSON\.parse\s*\(/, "json.loads(");
        diagnostics.push({
          line: lineNum,
          severity: "high",
          category: "Logic",
          title: "Python コード内で JavaScript の JSON.parse() が使われています",
          reason:
            "Python の標準 json モジュールでは json.loads() を使用します。JSON.parse() は NameError で即クラッシュします。",
          matchedPersonalHabit:
            habits.find((h) => /JSON|Python|構文/i.test(h.pattern))?.pattern ??
            null,
          fixSuggestion: fixed.trim(),
        });
        fixedLines[idx] = fixed;
      } else if (!/try\s*\{/.test(code)) {
        const fixed = `${indent}  // try/catch で不正JSONを保護\n${raw}`;
        diagnostics.push({
          line: lineNum,
          severity: "medium",
          category: "API",
          title: "JSON.parse() が try/catch で保護されていません",
          reason:
            "破損した JSON 文字列や空文字を受け取った瞬間に SyntaxError で処理全体が停止します。",
          matchedPersonalHabit:
            habits.find((h) => /try|catch|parse|例外/i.test(h.pattern))
              ?.pattern ?? null,
          fixSuggestion: "try { JSON.parse(...) } catch { ... }",
        });
        fixedLines[idx] = fixed;
      }
    }

    // 6. Python division by len() without empty check
    if (/\/\s*len\s*\(\s*(\w+)\s*\)/.test(raw) && !/if\s+len|if\s+not/.test(raw)) {
      const listVar = raw.match(/\/\s*len\s*\(\s*(\w+)\s*\)/)?.[1] ?? "items";
      const fixed = raw.replace(
        /\/\s*len\s*\(\s*(\w+)\s*\)/,
        `/ max(len(${listVar}), 1)`
      );
      diagnostics.push({
        line: lineNum,
        severity: "high",
        category: "Logic",
        title: `len(${listVar}) が 0 のときに ZeroDivisionError が発生します`,
        reason:
          "空リストが渡された場合にゼロ除算でバッチ処理がクラッシュします。空配列ガードまたは max(len(...), 1) が必要です。",
        matchedPersonalHabit:
          habits.find((h) => /境界|ゼロ|空|length/i.test(h.pattern))?.pattern ??
          null,
        fixSuggestion: fixed.trim(),
      });
      fixedLines[idx] = fixed;
    }

    // 7. Python open() without encoding="utf-8" or hardcoded backslash path
    if (/open\s*\([^)]+\)/.test(raw) && !/encoding\s*=/.test(raw)) {
      const fixed = raw.replace(/\)\s*:/, ', encoding="utf-8"):').replace(/\)$/, ', encoding="utf-8")');
      diagnostics.push({
        line: lineNum,
        severity: "medium",
        category: "Env",
        title: "open() に encoding=\"utf-8\" が指定されていません",
        reason:
          "Windows 環境では既定エンコーディングが cp932 になるため、日本語や絵文字を含むファイル読み込みで UnicodeDecodeError が発生します。",
        matchedPersonalHabit:
          habits.find((h) => /Windows|Linux|UTF|エンコード|パス/i.test(h.pattern))
            ?.pattern ?? "Windows / Linux パス区切り・UTF-8 エンコード漏れ",
        fixSuggestion: fixed.trim(),
      });
      fixedLines[idx] = fixed;
    }

    // 8. SQL Injection / Raw string interpolation in SQL or NOT NULL without DEFAULT
    if (
      /(SELECT|INSERT|UPDATE|DELETE|ALTER\s+TABLE).*\$\{/i.test(raw) ||
      /(SELECT|INSERT|UPDATE|DELETE).*['"]\s*\+\s*\w+/i.test(raw)
    ) {
      const fixed = `${indent}// [修正] プレースホルダ ($1) を使用して SQL インジェクションを防止\n${raw.replace(/\$\{([^}]+)\}/g, "$1_PARAM")}`;
      diagnostics.push({
        line: lineNum,
        severity: "high",
        category: "DB",
        title: "SQL クエリへの直接文字列展開（SQL インジェクション脆弱性）",
        reason:
          "ユーザー入力を SQL 文字列に直接結合すると、任意の DB 操作やデータ漏洩を許す重大な脆弱性になります。必ずプリペアドステートメントを使用してください。",
        matchedPersonalHabit:
          habits.find((h) => /SQL|DB|インジェクション|セキュリティ/i.test(h.pattern))
            ?.pattern ?? null,
        fixSuggestion: "db.query('SELECT * FROM users WHERE id = $1', [userId])",
      });
      fixedLines[idx] = fixed;
    }

    if (/ADD\s+COLUMN.*NOT\s+NULL/i.test(raw) && !/DEFAULT/i.test(raw)) {
      const fixed = raw.replace(/NOT\s+NULL/i, "NOT NULL DEFAULT ''");
      diagnostics.push({
        line: lineNum,
        severity: "high",
        category: "DB",
        title: "既存テーブルへの DEFAULT なし NOT NULL カラム追加",
        reason:
          "本番テーブルに既存レコードが 1 件でもある場合、DEFAULT 値なしの NOT NULL カラム追加はマイグレーションエラーで失敗します。",
        matchedPersonalHabit:
          habits.find((h) => /DB|マイグレーション|NOT NULL/i.test(h.pattern))
            ?.pattern ?? null,
        fixSuggestion: fixed.trim(),
      });
      fixedLines[idx] = fixed;
    }

    // 9. Hardcoded secret / API key or insecure token comparison
    if (
      /(secret|apiKey|api_key|password|jwtSecret)\s*[:=]\s*["'][A-Za-z0-9_\-]{8,}["']/i.test(
        raw
      )
    ) {
      const fixed = raw.replace(
        /[:=]\s*["'][A-Za-z0-9_\-]{8,}["']/,
        "= process.env.APP_SECRET_KEY ?? ''"
      );
      diagnostics.push({
        line: lineNum,
        severity: "high",
        category: "Security",
        title: "シークレットキーまたは認証情報のハードコード検出",
        reason:
          "ソースコード内に秘密鍵やトークンを直接記述すると、Git 履歴から永久に漏洩します。環境変数へ移動してください。",
        matchedPersonalHabit:
          habits.find((h) => /env|環境変数|secret|セキュリティ/i.test(h.pattern))
            ?.pattern ?? "環境変数 (process.env) の未設定チェック漏れ",
        fixSuggestion: fixed.trim(),
      });
      fixedLines[idx] = fixed;
    }

    // 10. Floating point currency calculation without Math.round
    if (/\*\s*(1\.08|1\.1|1\.10|0\.1)\b/.test(raw) && !/Math\.round|Math\.floor/.test(raw)) {
      const fixed = raw.replace(
        /(\w+\s*\*\s*(?:1\.08|1\.1|1\.10|0\.1))/,
        "Math.round($1)"
      );
      diagnostics.push({
        line: lineNum,
        severity: "medium",
        category: "Logic",
        title: "金額・税率計算での浮動小数点端数誤差（Math.round 未適用）",
        reason:
          "JavaScript の浮動小数点演算（例: 100 * 1.1 = 110.00000000000001）をそのまま決済 API に渡すと整数型エラーや 1 円ズレの原因になります。",
        matchedPersonalHabit:
          habits.find((h) => /金額|小数|境界|Logic/i.test(h.pattern))?.pattern ??
          null,
        fixSuggestion: fixed.trim(),
      });
      fixedLines[idx] = fixed;
    }

    // 11. Sensitive console.log in production
    if (/console\.log\s*\(.*(?:password|token|secret|card|key)/i.test(raw)) {
      const fixed = `${indent}// [セキュリティ修正] 機密情報のログ出力を削除`;
      diagnostics.push({
        line: lineNum,
        severity: "high",
        category: "Security",
        title: "機密情報（token / password / secret）の console.log 出力",
        reason:
          "本番ログ収集基盤に平文の認証トークンやパスワードが記録され、内部漏洩やコンプライアンス違反につながります。",
        matchedPersonalHabit:
          habits.find((h) => /ログ|console|セキュリティ/i.test(h.pattern))
            ?.pattern ?? null,
        fixSuggestion: fixed.trim(),
      });
      fixedLines[idx] = fixed;
    }
  });

  if (diagnostics.length === 0) {
    diagnostics.push({
      line: 1,
      severity: "low",
      category: "Config",
      title: "重大な静的バグは未検出（あなたの過去クセ DNA と照合済み）",
      reason: `「${taskType}」の作業前に、右側の落とし穴チェックリストで境界値・エラー処理・環境変数を最終確認してください。`,
      matchedPersonalHabit: habits[0]?.pattern ?? null,
      fixSuggestion: "異常系（ネットワーク切断・空データ）のテストを 1 件追加すると万全です。",
    });
  }

  const highCount = diagnostics.filter((d) => d.severity === "high").length;
  const medCount = diagnostics.filter((d) => d.severity === "medium").length;
  const riskScore = Math.min(98, Math.max(12, highCount * 32 + medCount * 16 + 14));

  const declNote = taskDeclaration
    ? `（作業宣言:「${taskDeclaration}」）`
    : "";

  return {
    riskScore,
    summary: `あなたの過去ミスDNA（${habits.length}件）と「${taskType}」${declNote}を照合し、${diagnostics.length}件の危険箇所と修正パッチを生成しました。`,
    diagnostics,
    fixedCode: fixedLines.join("\n"),
    preflightChecklist: buildChecklistForTask(taskType, habits),
    source: "local-analyzer",
    taskType,
    taskDeclaration,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const githubUrl = searchParams.get("githubUrl");
  if (!githubUrl) {
    return NextResponse.json(
      { error: "githubUrl パラメータを指定してください。" },
      { status: 400 }
    );
  }
  const converted = convertGitHubUrlToRaw(githubUrl);
  if (!converted.isValidGitHub) {
    return NextResponse.json(
      {
        error:
          "有効な GitHub ファイル URL（https://github.com/owner/repo/blob/... または raw.githubusercontent.com/...）を入力してください。",
      },
      { status: 400 }
    );
  }

  try {
    const resp = await fetch(converted.rawUrl, {
      headers: { Accept: "text/plain" },
      signal: AbortSignal.timeout(7000),
    });
    if (!resp.ok) {
      return NextResponse.json(
        {
          error: `GitHub Raw ファイルの取得に失敗しました (HTTP ${resp.status})。公開リポジトリのファイル URL か確認してください。`,
          rawUrl: converted.rawUrl,
        },
        { status: resp.status }
      );
    }
    const text = await resp.text();
    const truncated = text.split("\n").slice(0, 160).join("\n");
    return NextResponse.json({
      code: truncated,
      rawUrl: converted.rawUrl,
      fileName: converted.fileName,
      lineCount: truncated.split("\n").length,
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "GitHub への通信に失敗しました（オフラインまたはネットワーク制限）。内蔵プリセットまたは直接コード貼り付けをご利用ください。",
        rawUrl: converted.rawUrl,
      },
      { status: 502 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Handle GitHub Raw URL fetch action if requested via POST
    if (body.action === "fetch-github" && typeof body.githubUrl === "string") {
      const converted = convertGitHubUrlToRaw(body.githubUrl);
      if (!converted.isValidGitHub) {
        return NextResponse.json(
          {
            error:
              "有効な GitHub ファイル URL（github.com/.../blob/... または raw.githubusercontent.com/...）を入力してください。",
          },
          { status: 400 }
        );
      }
      try {
        const resp = await fetch(converted.rawUrl, {
          headers: { Accept: "text/plain" },
          signal: AbortSignal.timeout(7000),
        });
        if (!resp.ok) {
          return NextResponse.json(
            {
              error: `GitHub ファイルを取得できませんでした (HTTP ${resp.status})`,
              rawUrl: converted.rawUrl,
            },
            { status: resp.status }
          );
        }
        const text = await resp.text();
        const truncated = text.split("\n").slice(0, 160).join("\n");
        return NextResponse.json({
          code: truncated,
          rawUrl: converted.rawUrl,
          fileName: converted.fileName,
          lineCount: truncated.split("\n").length,
        });
      } catch {
        return NextResponse.json(
          {
            error:
              "ネットワーク制限により GitHub Raw URL へ接続できませんでした。プリセットまたは直接入力をご利用ください。",
            rawUrl: converted.rawUrl,
          },
          { status: 502 }
        );
      }
    }

    const code = String(body.code ?? "");
    const taskType = String(body.taskType ?? "Next.js API / フォーム送信");
    const taskDeclaration = body.taskDeclaration
      ? String(body.taskDeclaration)
      : undefined;
    const habits: PersonalMistake[] = Array.isArray(body.habits)
      ? body.habits
      : [];

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && code.trim().length > 0) {
      try {
        const prompt = [
          "あなたは開発者の過去のミスクセDNAを記憶してバグを未然に防ぐパーソナライズド・コード監査AIです。",
          `選択された作業カテゴリ: ${taskType}`,
          taskDeclaration ? `開発者の作業宣言: ${taskDeclaration}` : "",
          `この開発者の過去のやりがちミスDNA一覧: ${JSON.stringify(
            habits.map((h) => ({ pattern: h.pattern, category: h.category }))
          )}`,
          "以下のコードを行番号付きで解析し、必ず有効なJSONのみを返してください。",
          'スキーマ: {"riskScore":0-100,"summary":"要約","diagnostics":[{"line":1,"severity":"high|medium|low","category":"Async|API|Logic|Config|Security|DB|Env","title":"短いタイトル","reason":"理由","matchedPersonalHabit":"該当する過去クセまたはnull","fixSuggestion":"修正案"}],"fixedCode":"修正後のコード全体","preflightChecklist":[{"id":"c1","title":"作業前チェック項目","why":"理由","personalMatch":true}]}',
          "対象コード:",
          code
            .split("\n")
            .map((l, i) => `${i + 1}: ${l}`)
            .join("\n"),
        ]
          .filter(Boolean)
          .join("\n");

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
            if (
              Array.isArray(parsed.diagnostics) &&
              typeof parsed.fixedCode === "string"
            ) {
              return NextResponse.json({
                ...parsed,
                diagnostics: parsed.diagnostics.map((d: DiagnosticIssue) => ({
                  ...d,
                  category: d.category || "Logic",
                })),
                preflightChecklist:
                  Array.isArray(parsed.preflightChecklist) &&
                  parsed.preflightChecklist.length > 0
                    ? parsed.preflightChecklist
                    : buildChecklistForTask(taskType, habits),
                source: "gemini",
                taskType,
                taskDeclaration,
              });
            }
          }
        }
      } catch {
        // Fall back to deterministic analyzer
      }
    }

    return NextResponse.json(
      runDeterministicAudit(code, taskType, habits, taskDeclaration)
    );
  } catch {
    return NextResponse.json(
      { error: "コード解析リクエストの処理に失敗しました。" },
      { status: 400 }
    );
  }
}
