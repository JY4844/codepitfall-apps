import { NextRequest, NextResponse } from "next/server";
import { DatabaseConfigError, getSql } from "@/lib/db";
import {
  isValidPriority,
  isValidStatus,
  Task,
  TaskPriority,
  TaskStatus,
} from "@/types/task";

function handleApiError(error: unknown) {
  if (error instanceof DatabaseConfigError) {
    return NextResponse.json({ error: error.message, code: "MISSING_ENV" }, { status: 500 });
  }
  console.error("API /api/tasks error:", error);
  return NextResponse.json(
    { error: "データベース処理中にエラーが発生しました。テーブル作成と接続設定を確認してください。" },
    { status: 500 }
  );
}

export async function GET(request: NextRequest) {
  try {
    const sql = getSql();
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status");
    const priorityParam = searchParams.get("priority");

    const status = statusParam && statusParam !== "all" ? statusParam : null;
    const priority = priorityParam && priorityParam !== "all" ? priorityParam : null;

    if (status && !isValidStatus(status)) {
      return NextResponse.json({ error: "不正なステータス指定です。" }, { status: 400 });
    }
    if (priority && !isValidPriority(priority)) {
      return NextResponse.json({ error: "不正な優先度指定です。" }, { status: 400 });
    }

    let rows: Task[];
    if (status && priority) {
      rows = (await sql`
        SELECT id, title, status, priority, memo, created_at, updated_at
        FROM tasks
        WHERE status = ${status} AND priority = ${priority}
        ORDER BY
          CASE status WHEN 'in_progress' THEN 0 WHEN 'todo' THEN 1 ELSE 2 END,
          CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
          created_at DESC
      `) as Task[];
    } else if (status) {
      rows = (await sql`
        SELECT id, title, status, priority, memo, created_at, updated_at
        FROM tasks
        WHERE status = ${status}
        ORDER BY
          CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
          created_at DESC
      `) as Task[];
    } else if (priority) {
      rows = (await sql`
        SELECT id, title, status, priority, memo, created_at, updated_at
        FROM tasks
        WHERE priority = ${priority}
        ORDER BY
          CASE status WHEN 'in_progress' THEN 0 WHEN 'todo' THEN 1 ELSE 2 END,
          created_at DESC
      `) as Task[];
    } else {
      rows = (await sql`
        SELECT id, title, status, priority, memo, created_at, updated_at
        FROM tasks
        ORDER BY
          CASE status WHEN 'in_progress' THEN 0 WHEN 'todo' THEN 1 ELSE 2 END,
          CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
          created_at DESC
      `) as Task[];
    }

    return NextResponse.json({ tasks: rows });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const status: TaskStatus = isValidStatus(body?.status) ? body.status : "todo";
    const priority: TaskPriority = isValidPriority(body?.priority) ? body.priority : "medium";
    const memo = typeof body?.memo === "string" ? body.memo.trim() : "";

    if (!title) {
      return NextResponse.json({ error: "タイトルは必須です。" }, { status: 400 });
    }

    const sql = getSql();
    const rows = (await sql`
      INSERT INTO tasks (title, status, priority, memo)
      VALUES (${title}, ${status}, ${priority}, ${memo})
      RETURNING id, title, status, priority, memo, created_at, updated_at
    `) as Task[];

    return NextResponse.json({ task: rows[0] }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
