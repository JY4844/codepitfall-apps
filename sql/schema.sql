-- Neon SQL Editor にそのまま貼り付けて実行してください

-- 1. 学習・復習タスク管理テーブル
CREATE TABLE IF NOT EXISTS tasks (
  id          SERIAL PRIMARY KEY,
  title       TEXT NOT NULL CHECK (char_length(trim(title)) > 0),
  status      TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  priority    TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  memo        TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_status_created_at
  ON tasks (status, created_at DESC);

-- 2. 数式・論文・専門書の AI 解析履歴テーブル
CREATE TABLE IF NOT EXISTS study_sessions (
  id                SERIAL PRIMARY KEY,
  topic_title       TEXT NOT NULL CHECK (char_length(trim(topic_title)) > 0),
  source_text       TEXT NOT NULL DEFAULT '',
  summary           TEXT NOT NULL DEFAULT '',
  prerequisites     JSONB NOT NULL DEFAULT '[]'::jsonb,
  steps             JSONB NOT NULL DEFAULT '[]'::jsonb,
  quiz              JSONB NOT NULL DEFAULT '[]'::jsonb,
  suggested_tasks   JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_study_sessions_created_at
  ON study_sessions (created_at DESC);
