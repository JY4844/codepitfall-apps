import { NextRequest, NextResponse } from "next/server";
import { DatabaseConfigError, getSql } from "@/lib/db";
import { isValidPriority, isValidStatus, Task } from "@/types/task";

function parseId(rawId: string): number | null {
  const id = Number(rawId);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function handleApiError(error: unknown) {
  if (error instanceof DatabaseConfigError) {
    return NextResponse.json({ error: error.message, code: "MISSING_ENV" }, { status: 500 });
  }
  console.error("API /api/tasks/[id] error:", error);
  return NextResponse.json(
    { error: "データベース処理中にエラーが発生しました。" },
    { status: 500 }
  );
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await context.params;
    const id = parseId(rawId);
    if (!id) {
      return NextResponse.json({ error: "不正なタスク ID です。" }, { status: 400 });
    }

    const body = await request.json();
    const sql = getSql();

    const existing = (await sql`
      SELECT id, title, status, priority, memo
      FROM tasks
      WHERE id = ${id}
    `) as Task[];

    if (existing.length === 0) {
      return NextResponse.json({ error: "タスクが見つかりません。" }, { status: 404 });
    }

    const current = existing[0];
    const nextTitle =
      body?.title !== undefined
        ? typeof body.title === "string"
          ? body.title.trim()
          : ""
        : current.title;

    if (!nextTitle) {
      return NextResponse.json({ error: "タイトルは空にできません。" }, { status: 400 });
    }

    if (body?.status !== undefined && !isValidStatus(body.status)) {
      return NextResponse.json({ error: "不正なステータスです。" }, { status: 400 });
    }
    if (body?.priority !== undefined && !isValidPriority(body.priority)) {
      return NextResponse.json({ error: "不正な優先度です。" }, { status: 400 });
    }

    const nextStatus = body?.status ?? current.status;
    const nextPriority = body?.priority ?? current.priority;
    const nextMemo =
      body?.memo !== undefined
        ? typeof body.memo === "string"
          ? body.memo.trim()
          : current.memo
        : current.memo;

    const updated = (await sql`
      UPDATE tasks
      SET
        title = ${nextTitle},
        status = ${nextStatus},
        priority = ${nextPriority},
        memo = ${nextMemo},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, title, status, priority, memo, created_at, updated_at
    `) as Task[];

    return NextResponse.json({ task: updated[0] });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await context.params;
    const id = parseId(rawId);
    if (!id) {
      return NextResponse.json({ error: "不正なタスク ID です。" }, { status: 400 });
    }

    const sql = getSql();
    const deleted = (await sql`
      DELETE FROM tasks
      WHERE id = ${id}
      RETURNING id
    `) as { id: number }[];

    if (deleted.length === 0) {
      return NextResponse.json({ error: "タスクが見つかりません。" }, { status: 404 });
    }

    return NextResponse.json({ deletedId: deleted[0].id });
  } catch (error) {
    return handleApiError(error);
  }
}
