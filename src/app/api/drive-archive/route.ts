import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const app = String(body.app || "FlagshipApp");
    const title = String(body.title || "snapshot");
    const gasUrl = process.env.GAS_DRIVE_WEBHOOK_URL;

    if (gasUrl && gasUrl.startsWith("https://")) {
      const resp = await fetch(gasUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          app,
          title,
          jsonData: body.jsonData ?? null,
          markdown: body.markdown ?? null,
          imageBase64: body.imageBase64 ?? null,
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        return NextResponse.json({
          ok: true,
          mode: "google-drive-5tb",
          ...data,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      mode: "local-preview",
      message:
        "GAS_DRIVE_WEBHOOK_URL を .env.local に設定すると、Google Drive 5TB（GoogleAIChallenge_5TB フォルダ）へ自動保存されます。",
      previewFolder: `GoogleAIChallenge_5TB/${app}`,
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Google Drive アーカイブ処理に失敗しました。" },
      { status: 400 }
    );
  }
}
