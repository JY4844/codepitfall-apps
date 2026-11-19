/**
 * GapTutor × Google Apps Script 連携用スクリプト
 *
 * 使い方:
 * 1. Google スプレッドシートを開き「拡張機能」→「Apps Script」を開く
 * 2. このファイルの内容を貼り付けて保存する
 * 3. 「デプロイ」→「新しいデプロイ」→ 種類:「ウェブアプリ」
 *    - 実行するユーザー: 自分
 *    - アクセスできるユーザー: 全員（または自分のみ※API経由時は全員推奨）
 * 4. 発行されたウェブアプリ URL を .env.local の GAS_WEBHOOK_URL に設定する
 */

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents || "{}");
    var topicTitle = payload.topic_title || "学習トピック";
    var summary = payload.summary || "";
    var tasks = Array.isArray(payload.tasks) ? payload.tasks : [];

    var addedRows = appendToSpreadsheet_(topicTitle, summary, tasks);
    var addedEvents = createCalendarEvents_(topicTitle, tasks);

    return ContentService.createTextOutput(
      JSON.stringify({
        ok: true,
        addedRows: addedRows,
        addedEvents: addedEvents,
      })
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({
        ok: false,
        error: String(err),
      })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

function appendToSpreadsheet_(topicTitle, summary, tasks) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return 0;

  var sheet = ss.getSheetByName("GapTutor_Log") || ss.insertSheet("GapTutor_Log");
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["記録日時", "テーマ", "要約", "復習タスク", "優先度", "メモ"]);
  }

  var now = new Date();
  if (tasks.length === 0) {
    sheet.appendRow([now, topicTitle, summary, "(タスクなし)", "-", ""]);
    return 1;
  }

  tasks.forEach(function (t) {
    sheet.appendRow([
      now,
      topicTitle,
      summary,
      t.title || "",
      t.priority || "medium",
      t.memo || "",
    ]);
  });
  return tasks.length;
}

function createCalendarEvents_(topicTitle, tasks) {
  var cal = CalendarApp.getDefaultCalendar();
  if (!cal || tasks.length === 0) return 0;

  var count = 0;
  var now = new Date();

  tasks.forEach(function (t, idx) {
    // 優先度 high は翌日、それ以外は 2 日後以降の 20:00〜20:30 に復習予定を作成
    var daysOffset = t.priority === "high" ? 1 : 2 + idx;
    var start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysOffset, 20, 0, 0);
    var end = new Date(start.getTime() + 30 * 60 * 1000);

    var eventTitle = "[GapTutor復習] " + (t.title || topicTitle);
    var description = "テーマ: " + topicTitle + "\n優先度: " + (t.priority || "medium") + "\n\n" + (t.memo || "");
    cal.createEvent(eventTitle, start, end, { description: description });
    count += 1;
  });

  return count;
}
