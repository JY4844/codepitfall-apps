import { NextRequest, NextResponse } from "next/server";
import { DatabaseConfigError, getSql } from "@/lib/db";
import { StudyAnalysis, StudySession } from "@/types/study";
import { isValidPriority } from "@/types/task";

function handleApiError(error: unknown) {
  if (error instanceof DatabaseConfigError) {
    return NextResponse.json({ error: error.message, code: "MISSING_ENV" }, { status: 500 });
  }
  console.error("API /api/study-sessions error:", error);
  return NextResponse.json(
    { error: "データベース処理中にエラーが発生しました。schema.sql を再実行したか確認してください。" },
    { status: 500 }
  );
}

export async function GET() {
  try {
    const sql = getSql();
    const rows = (await sql`
      SELECT id, topic_title, source_text, summary, prerequisites, steps, quiz, suggested_tasks, created_at
      FROM study_sessions
      ORDER BY created_at DESC
      LIMIT 10
    `) as StudySession[];

    return NextResponse.json({ sessions: rows });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const analysis = body?.analysis as StudyAnalysis | undefined;
    const sourceText = typeof body?.sourceText === "string" ? body.sourceText.trim() : "";
    const registerTasks = Boolean(body?.registerTasks);

    if (!analysis || !analysis.topic_title?.trim()) {
      return NextResponse.json({ error: "保存する解析データが不足しています。" }, { status: 400 });
    }

    const sql = getSql();
    const saved = (await sql`
      INSERT INTO study_sessions (
        topic_title,
        source_text,
        summary,
        prerequisites,
        steps,
        quiz,
        suggested_tasks
      )
      VALUES (
        ${analysis.topic_title.trim()},
        ${sourceText},
        ${analysis.summary ?? ""},
        ${JSON.stringify(analysis.prerequisites ?? [])}::jsonb,
        ${JSON.stringify(analysis.steps ?? [])}::jsonb,
        ${JSON.stringify(analysis.quiz ?? [])}::jsonb,
        ${JSON.stringify(analysis.suggested_tasks ?? [])}::jsonb
      )
      RETURNING id, topic_title, source_text, summary, prerequisites, steps, quiz, suggested_tasks, created_at
    `) as StudySession[];

    let createdTaskCount = 0;
    if (registerTasks && Array.isArray(analysis.suggested_tasks)) {
      for (const task of analysis.suggested_tasks) {
        const title = typeof task?.title === "string" ? task.title.trim() : "";
        if (!title) continue;
        const priority = isValidPriority(task.priority) ? task.priority : "medium";
        const memo = typeof task?.memo === "string" ? task.memo.trim() : "";
        await sql`
          INSERT INTO tasks (title, status, priority, memo)
          VALUES (${title}, 'todo', ${priority}, ${memo})
        `;
        createdTaskCount += 1;
      }
    }

    return NextResponse.json(
      { session: saved[0], createdTaskCount },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
