# Google AI Challenge 2026 — 3 部門デモアプリ集（Next.js + Gemini API + Neon + GAS）

Google AI Challenge（Google Japan 25 周年記念）向けに制作した **3 部門のマルチモーダル AI アプリ** を 1 つの Next.js (App Router) プロジェクトに統合したリポジトリです。

## 収録アプリ（全 3 部門）

| 部門 | アプリ名 | ルート | 主な機能 |
| :--- | :--- | :--- | :--- |
| **はたらく・まなぶ部門** | **GapTutor** | `/` | 数式・論文・手書きノートから不足している前提知識を特定し、知識依存マップ・段階解説・適応型クイズ・復習タスク（Neon / GAS）を生成 |
| **暮らしと家族の部門** | **おたよりバトン** | `/otayori` | 学校プリント・自治体通知・お薬手帳から日程・持ち物・集金を抽出し、母/父/祖母の 3 世代バトン振り分け＋大きい文字のやさしい 3 行要約＋GAS 連携 |
| **まちと地球の未来部門** | **MachiEye** | `/machieye` | 街の危険箇所写真から深刻度 1〜5 トリアージ・担当部署推定・自治体提出レポートを生成し、顔/ナンバー/表札の公開前プライバシー警告＋Google マップピン＋GAS 連携 |

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
