import { neon } from "@neondatabase/serverless";

export class DatabaseConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DatabaseConfigError";
  }
}

export function getSql() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new DatabaseConfigError(
      "環境変数 DATABASE_URL が設定されていません。.env.local を作成して Neon の接続文字列を設定してください。"
    );
  }
  return neon(databaseUrl);
}
