import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const webhookUrl = process.env.GAS_WEBHOOK_URL;
    if (!webhookUrl) {
      return NextResponse.json(
        {
          error:
            "環境変数 GAS_WEBHOOK_URL が設定されていません。gas/Code.gs を Google Apps Script でウェブアプリとしてデプロイし、URL を .env.local に設定してください。",
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const topicTitle = typeof body?.topic_title === "string" ? body.topic_title.trim() : "";
    const summary = typeof body?.summary === "string" ? body.summary.trim() : "";
    const tasks = Array.isArray(body?.tasks) ? body.tasks : [];

    if (!topicTitle) {
      return NextResponse.json({ error: "連携する解析データがありません。" }, { status: 400 });
    }

    const gasRes = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic_title: topicTitle,
        summary,
        tasks,
      }),
      redirect: "follow",
    });

    const text = await gasRes.text();
    let result: Record<string, unknown> = {};
    try {
      result = JSON.parse(text);
    } catch {
      if (!gasRes.ok) {
        return NextResponse.json(
          { error: "Google Apps Script への送信に失敗しました。" },
          { status: 502 }
        );
      }
    }

    if (result?.ok === false) {
      return NextResponse.json(
        { error: String(result.error || "GAS 側でエラーが発生しました。") },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      addedRows: result.addedRows ?? 0,
      addedEvents: result.addedEvents ?? 0,
    });
  } catch (error) {
    console.error("API /api/gas-sync error:", error);
    return NextResponse.json(
      { error: "Google Apps Script 連携中にエラーが発生しました。" },
      { status: 500 }
    );
  }
}
