# Google AI Challenge 2026 — 3 部門デモアプリ集（Next.js + Gemini API + Neon + GAS）

Google AI Challenge（Google Japan 25 周年記念）向けに制作した **3 部門のマルチモーダル AI アプリ** を 1 つの Next.js (App Router) プロジェクトに統合したリポジトリです。

## 収録アプリ（全 3 部門）

| 部門 | アプリ名 | ルート | 主な機能 |
| :--- | :--- | :--- | :--- |
| **はたらく・まなぶ部門** | **GapTutor** | `/` | 数式・論文・手書きノートから不足している前提知識を特定し、知識依存マップ・段階解説・適応型クイズ・復習タスク（Neon / GAS）を生成 |
| **暮らしと家族の部門** | **おたよりバトン** | `/otayori` | 学校プリント・自治体通知・お薬手帳から日程・持ち物・集金を抽出し、母/父/祖母の 3 世代バトン振り分け＋大きい文字のやさしい 3 行要約＋GAS 連携 |
| **まちと地球の未来部門** | **MachiEye** | `/machieye` | 街の危険箇所写真から深刻度 1〜5 トリアージ・担当部署推定・自治体提出レポートを生成し、顔/ナンバー/表札の公開前プライバシー警告＋Google マップピン＋GAS 連携 |
| **はたらく・まなぶ部門** | **GitBridge** | `/gitbridge` | コード初心者向けに GitHub リポジトリの「読む順番・用語・クイズ」を自動生成し、API キー漏れ防止チェック＋意味つきコマンドで初めての GitHub 公開まで伴走 |
| **暮らしと家族の部門** | **おくすりミマモリ** | `/okusuri` | 処方箋・お薬手帳・市販薬の写真から服用タイミングと飲み合わせ確認ポイントを構造化し、家族の Google カレンダーへ服薬リマインドを自動登録 |
| **暮らしと家族の部門** | **レシート家計コーチ** | `/receipt` | スーパーのレシートからカテゴリ別支出・栄養バランス診断・3 日分の節約献立を生成し、Google シートへ自動記帳 |
| **はたらく・まなぶ部門** | **規約・契約書イエローカード** | `/contract` | 業務委託・バイト・賃貸契約の不利な条項を 3 段階リスクで検出し、先方への丁寧な確認メール文面まで自動生成 |
| **まちと地球の未来部門** | **ごみ分別カメラ** | `/gomi` | 迷うごみの写真と自治体ルールから正確な分別区分・リチウム電池火災防止手順を判定し、収集日を Google カレンダーへ登録 |
| **まちと地球の未来部門** | **バリアフリー街歩きマップ** | `/barrierfree` | 車いす・ベビーカー目線の現場写真から通行難易度と迂回ルートを構造化し、Google マップ＆シートで地域の安心マップを共創 |

## 主な技術スタック
- **AI**: Google Gemini API（`gemini-3.8-flash` / `gemini-4-hydrogen` マルチモーダル＋構造化 JSON Schema 出力）、ローカル LLM フォールバック（Ollama / XeStrata）
- **フレームワーク**: Next.js 15 (App Router) + TypeScript
- **データベース**: Neon (Serverless PostgreSQL / `@neondatabase/serverless`)
- **Google Workspace 連携**: Google Apps Script（`gas/Code.gs` → Google カレンダー & Google スプレッドシート自動登録）

## セットアップ手順
1. Neon の **SQL Editor** で `sql/schema.sql` を実行する
2. Google スプレッドシートの Apps Script に `gas/Code.gs` を貼り付けてウェブアプリとしてデプロイする
3. `.env.local.example` を `.env.local` にコピーして `DATABASE_URL`・`GEMINI_API_KEY`・`GAS_WEBHOOK_URL` を設定する
4. 起動する：
   ```bash
   npm install
   npm run dev
   ```
