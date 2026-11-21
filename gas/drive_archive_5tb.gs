/**
 * Google AI Challenge 2026 — 5TB Google Drive Auto-Archive Web App (GAS)
 * Deploy as Web App: Execute as "Me", Who has access: "Anyone" (with shared secret token optional).
 * Copy the Web App URL into .env.local as GAS_DRIVE_WEBHOOK_URL.
 */
function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents || "{}");
    var appName = payload.app || "General";
    var title = (payload.title || "archive").replace(/[\\/:*?"<>|]/g, "_");
    var timestamp = Utilities.formatDate(new Date(), "Asia/Tokyo", "yyyyMMdd_HHmmss");

    var rootFolder = getOrCreateFolder_(DriveApp.getRootFolder(), "GoogleAIChallenge_5TB");
    var appFolder = getOrCreateFolder_(rootFolder, appName);

    var savedFiles = [];

    // 1. Save JSON metadata / Personal DNA / Structured Report
    if (payload.jsonData) {
      var jsonName = timestamp + "_" + title + ".json";
      var jsonFile = appFolder.createFile(
        jsonName,
        JSON.stringify(payload.jsonData, null, 2),
        MimeType.PLAIN_TEXT
      );
      savedFiles.push({ name: jsonName, url: jsonFile.getUrl(), id: jsonFile.getId() });
    }

    // 2. Save Markdown / Human-readable report
    if (payload.markdown) {
      var mdName = timestamp + "_" + title + ".md";
      var mdFile = appFolder.createFile(mdName, payload.markdown, MimeType.PLAIN_TEXT);
      savedFiles.push({ name: mdName, url: mdFile.getUrl(), id: mdFile.getId() });
    }

    // 3. Save original photo/image (base64 data URL) for OtayoriBaton / MachiEye
    if (payload.imageBase64) {
      var match = payload.imageBase64.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
      var mimeType = match ? match[1] : "image/jpeg";
      var rawBase64 = match ? match[2] : payload.imageBase64;
      var ext = mimeType.indexOf("png") !== -1 ? "png" : "jpg";
      var blob = Utilities.newBlob(
        Utilities.base64Decode(rawBase64),
        mimeType,
        timestamp + "_" + title + "." + ext
      );
      var imgFile = appFolder.createFile(blob);
      savedFiles.push({ name: imgFile.getName(), url: imgFile.getUrl(), id: imgFile.getId() });
    }

    return ContentService.createTextOutput(
      JSON.stringify({
        ok: true,
        folderUrl: appFolder.getUrl(),
        savedFiles: savedFiles,
      })
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ ok: false, error: String(err) })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

function getOrCreateFolder_(parent, name) {
  var iter = parent.getFoldersByName(name);
  return iter.hasNext() ? iter.next() : parent.createFolder(name);
}
