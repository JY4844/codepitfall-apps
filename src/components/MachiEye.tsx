"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import styles from "./MachiEye.module.css";

interface MachiEyePrivacyCheck {
  has_face: boolean;
  has_license_plate: boolean;
  has_nameplate: boolean;
  warning_message: string;
}

interface MachiEyeTask {
  title: string;
  priority: "high" | "medium" | "low";
  memo: string;
}

interface MachiEyeAnalysis {
  title: string;
  category: string;
  severity: number;
  department: string;
  report_draft: string;
  eco_disaster_impact: string;
  privacy_check: MachiEyePrivacyCheck;
  recommended_action: string;
  suggested_tasks: MachiEyeTask[];
}

const ACCEPTED_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_IMAGE_DIM = 1600;

async function resizeImageToJpegBase64(
  file: File
): Promise<{ base64: string; mimeType: string; previewUrl: string }> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("画像の読み込みに失敗しました。"));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("画像のデコードに失敗しました。"));
    el.src = dataUrl;
  });

  const scale = Math.min(1, MAX_IMAGE_DIM / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("画像の縮小処理に失敗しました。");
  }
  ctx.drawImage(img, 0, 0, width, height);
  const resizedDataUrl = canvas.toDataURL("image/jpeg", 0.85);
  const base64 = resizedDataUrl.split(",")[1] || "";

  return {
    base64,
    mimeType: "image/jpeg",
    previewUrl: resizedDataUrl,
  };
}

function severityLabel(level: number): string {
  if (level >= 5) return "最優先・直ちに危険";
  if (level === 4) return "高・早急な対応を推奨";
  if (level === 3) return "中・早めの点検を推奨";
  if (level === 2) return "低・定期巡回で対応";
  return "軽微・経過観察";
}

export default function MachiEye() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [sourceText, setSourceText] = useState("");
  const [locationText, setLocationText] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [geminiModel, setGeminiModel] = useState<"gemini-3.8-flash" | "gemini-4-hydrogen">(
    "gemini-3.8-flash"
  );

  const [imageBase64, setImageBase64] = useState("");
  const [imageMimeType, setImageMimeType] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [imageName, setImageName] = useState("");
  const [dragActive, setDragActive] = useState(false);

  const [gpsLoading, setGpsLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [result, setResult] = useState<MachiEyeAnalysis | null>(null);
  const [usedModel, setUsedModel] = useState("");

  const [copied, setCopied] = useState(false);
  const [gasSyncing, setGasSyncing] = useState(false);
  const [gasMessage, setGasMessage] = useState("");
  const [gasError, setGasError] = useState("");

  const handleLoadHazardSample = () => {
    setLocationText("第一小学校 北門前の通学路（バス停付近）");
    setLatitude("35.681236");
    setLongitude("139.767125");
    setSourceText(
      "通学路沿いの側溝に落ち葉とペットボトル・レジ袋が大量に詰まっており、排水口が約8割ふさがっています。明日の大雨予報で歩道が冠水しやすく、子どもたちの通学と河川へのプラスチックごみ流出が心配です。周囲に通行人の顔や車のナンバーは映っていません。"
    );
    setErrorMsg("");
    setGasMessage("");
    setGasError("");
  };

  const handleLoadPrivacySample = () => {
    setLocationText("駅前商店街 裏手の空き地前");
    setLatitude("35.689487");
    setLongitude("139.691711");
    setSourceText(
      "空き地の隅に壊れた電子レンジと自転車が不法投棄されています。すぐ横に駐車中の乗用車のナンバープレート「品川 300 あ 12-34」と、隣家の表札「佐藤」が写真に大きく映り込んでいます。"
    );
    setErrorMsg("");
    setGasMessage("");
    setGasError("");
  };

  const handleImageFile = async (file: File) => {
    setErrorMsg("");
    if (!ACCEPTED_MIME_TYPES.has(file.type)) {
      setErrorMsg("PNG / JPEG / WebP 形式の画像を選択してください。");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setErrorMsg("画像サイズが 10MB を超えています。別の画像を選択してください。");
      return;
    }
    try {
      const resized = await resizeImageToJpegBase64(file);
      setImageBase64(resized.base64);
      setImageMimeType(resized.mimeType);
      setImagePreview(resized.previewUrl);
      setImageName(file.name);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "画像の処理に失敗しました。");
    }
  };

  const handleGetGps = () => {
    if (!navigator.geolocation) {
      setErrorMsg("このブラウザは位置情報取得（Geolocation）に対応していません。");
      return;
    }
    setGpsLoading(true);
    setErrorMsg("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        if (!locationText) {
          setLocationText("現在地（GPS自動取得）");
        }
        setGpsLoading(false);
      },
      () => {
        setErrorMsg("位置情報の取得が拒否されたかタイムアウトしました。手動で場所を入力してください。");
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceText.trim() && !imageBase64) {
      setErrorMsg("現場の写真、または状況メモを入力してください。");
      return;
    }

    setAnalyzing(true);
    setErrorMsg("");
    setGasMessage("");
    setGasError("");
    setCopied(false);

    try {
      const res = await fetch("/api/machieye", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceText,
          locationText,
          latitude,
          longitude,
          imageBase64,
          imageMimeType,
          geminiModel,
        }),
      });

      const raw = await res.text();
      let data: Record<string, unknown> = {};
      try {
        data = JSON.parse(raw) as Record<string, unknown>;
      } catch {
        throw new Error("サーバーから予期しない応答が返されました。");
      }

      if (!res.ok) {
        const msg =
          typeof data.error === "string" ? data.error : "AI トリアージの実行に失敗しました。";
        const code = typeof data.code === "string" ? ` [${data.code}]` : "";
        throw new Error(`${msg}${code}`);
      }

      setResult(data.result as MachiEyeAnalysis);
      setUsedModel(typeof data.usedModel === "string" ? data.usedModel : geminiModel);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "解析中にエラーが発生しました。");
    } finally {
      setAnalyzing(false);
    }
  };

  const mapQuery =
    latitude.trim() && longitude.trim()
      ? `${latitude.trim()},${longitude.trim()}`
      : locationText.trim() || "東京駅";
  const googleMapsUrl = `https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}`;

  const handleCopyReport = async () => {
    if (!result?.report_draft) return;
    try {
      await navigator.clipboard.writeText(result.report_draft);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setErrorMsg("クリップボードへのコピーに失敗しました。");
    }
  };

  const handleGasSync = async () => {
    if (!result) return;
    setGasSyncing(true);
    setGasMessage("");
    setGasError("");

    try {
      const summaryForSheet = [
        `[緊急度 ${result.severity}/5] ${result.category} / 担当: ${result.department}`,
        `場所: ${locationText || "未指定"} (${googleMapsUrl})`,
        `防災・環境影響: ${result.eco_disaster_impact}`,
      ].join(" | ");

      const res = await fetch("/api/gas-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic_title: `[MachiEye] ${result.title}`,
          summary: summaryForSheet,
          tasks: result.suggested_tasks,
        }),
      });

      const data = (await res.json()) as Record<string, unknown>;
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "Google シート / カレンダー連携に失敗しました。"
        );
      }

      setGasMessage(
        `Google Workspace 連携完了！地域台帳シートに ${String(
          data.addedRows ?? 1
        )} 件記録し、パトロール確認予定を ${String(
          data.addedEvents ?? result.suggested_tasks.length
        )} 件登録しました。`
      );
    } catch (err) {
      setGasError(err instanceof Error ? err.message : "GAS 連携中にエラーが発生しました。");
    } finally {
      setGasSyncing(false);
    }
  };

  const hasPrivacyRisk = Boolean(
    result &&
      (result.privacy_check.has_face ||
        result.privacy_check.has_license_plate ||
        result.privacy_check.has_nameplate)
  );

  const severityColorClass =
    !result || result.severity <= 2
      ? styles.severityLow
      : result.severity === 3
      ? styles.severityMid
      : styles.severityHigh;

  const segFillClass =
    !result || result.severity <= 2
      ? styles.segLow
      : result.severity === 3
      ? styles.segMid
      : styles.segHigh;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <nav className={styles.topNav} aria-label="応募デモ切替">
          <div className={styles.navLinks}>
            <Link href="/" className={styles.navLink}>
              📘 GapTutor（はたらく・まなぶ）
            </Link>
            <Link href="/otayori" className={styles.navLink}>
              📮 おたよりバトン（暮らしと家族）
            </Link>
          </div>
          <span className={styles.categoryPill}>🌏 まちと地球の未来部門</span>
        </nav>

        <header className={styles.headerCard}>
          <div className={styles.headerTop}>
            <div className={styles.brand}>
              <div className={styles.brandIcon} aria-hidden="true">
                🛡️
              </div>
              <h1 className={styles.brandTitle}>MachiEye</h1>
            </div>
            <span className={styles.geminiBadge}>
              ✨ Google Gemini 3.8 Flash + Privacy Guard
            </span>
          </div>
          <p className={styles.headerSubtitle}>
            街の側溝詰まり・道路陥没・不法投棄を撮るだけ。緊急度トリアージ、自治体提出用の通報文、
            公開前プライバシーチェックを構造化し、Google シート・マップ・カレンダーへ即座に連携するシビックテック AI。
          </p>
          <div className={styles.stepper}>
            <span
              className={`${styles.stepChip} ${
                sourceText || imageBase64 ? styles.stepChipDone : ""
              }`}
            >
              1. 現場撮影・GPS
            </span>
            <span className={`${styles.stepChip} ${result ? styles.stepChipDone : ""}`}>
              2. AI 緊急度 ＆ プライバシー検知
            </span>
            <span
              className={`${styles.stepChip} ${
                copied || gasMessage ? styles.stepChipDone : ""
              }`}
            >
              3. 自治体通報 ＆ 地域マップ記録
            </span>
          </div>
        </header>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitleGroup}>
              <span className={styles.stepBadge}>STEP 1</span>
              <h2 className={styles.cardTitle}>街の異変を撮影・位置情報を入力</h2>
            </div>
            <div className={styles.sampleButtons}>
              <button
                type="button"
                className={styles.sampleBtn}
                onClick={handleLoadHazardSample}
              >
                🌧️ 街の危険箇所 サンプルを入力
              </button>
              <button
                type="button"
                className={`${styles.sampleBtn} ${styles.sampleBtnWarn}`}
                onClick={handleLoadPrivacySample}
              >
                ⚠️ プライバシー警告テスト
              </button>
            </div>
          </div>

          <form onSubmit={handleAnalyze} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div
              className={`${styles.dropzone} ${dragActive ? styles.dropzoneActive : ""}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                const file = e.dataTransfer.files?.[0];
                if (file) void handleImageFile(file);
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleImageFile(file);
                }}
              />
              <span className={styles.dropzoneTitle}>
                📷 現場写真をドラッグ＆ドロップ、またはクリックして選択
              </span>
              <span className={styles.dropzoneHint}>
                PNG / JPEG / WebP（最大 10MB・自動で 1600px JPEG へ最適化）
              </span>
            </div>

            {imagePreview && (
              <div className={styles.previewWrap}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePreview} alt="アップロード現場写真" className={styles.previewImg} />
                <div className={styles.previewMeta}>
                  <strong>{imageName}</strong>
                  <div>Gemini マルチモーダル視覚解析＋プライバシー自動検知の対象</div>
                </div>
                <button
                  type="button"
                  className={styles.removeBtn}
                  onClick={() => {
                    setImageBase64("");
                    setImageMimeType("");
                    setImagePreview("");
                    setImageName("");
                  }}
                >
                  削除
                </button>
              </div>
            )}

            <div className={styles.fieldGrid}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="machieye-location">
                  場所メモ（通学路・目印など）
                </label>
                <input
                  id="machieye-location"
                  className={styles.input}
                  type="text"
                  placeholder="例：第一小学校 北門前の通学路"
                  value={locationText}
                  onChange={(e) => setLocationText(e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="machieye-lat">
                  緯度 (Lat)
                </label>
                <input
                  id="machieye-lat"
                  className={styles.input}
                  type="text"
                  placeholder="35.681236"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="machieye-lng">
                  経度 (Lng)
                </label>
                <input
                  id="machieye-lng"
                  className={styles.input}
                  type="text"
                  placeholder="139.767125"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                />
              </div>
              <button
                type="button"
                className={styles.gpsBtn}
                onClick={handleGetGps}
                disabled={gpsLoading}
              >
                {gpsLoading ? "取得中..." : "📍 現在地 (GPS)"}
              </button>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="machieye-notes">
                現場の状況メモ（写真のみでも解析可能）
              </label>
              <textarea
                id="machieye-notes"
                className={styles.textarea}
                placeholder="例：側溝に落ち葉とペットボトルが詰まっており、大雨で冠水しそうです..."
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
              />
            </div>

            <div className={styles.submitRow}>
              <div className={styles.modelWrap}>
                <label className={styles.label} htmlFor="machieye-model">
                  Gemini モデル:
                </label>
                <select
                  id="machieye-model"
                  className={styles.select}
                  style={{ width: "auto" }}
                  value={geminiModel}
                  onChange={(e) =>
                    setGeminiModel(
                      e.target.value === "gemini-4-hydrogen"
                        ? "gemini-4-hydrogen"
                        : "gemini-3.8-flash"
                    )
                  }
                >
                  <option value="gemini-3.8-flash">gemini-3.8-flash（推奨・高速）</option>
                  <option value="gemini-4-hydrogen">gemini-4-hydrogen</option>
                </select>
              </div>
              <button type="submit" className={styles.primaryBtn} disabled={analyzing}>
                {analyzing
                  ? "⏳ Gemini が現場トリアージ中..."
                  : "🔍 AI トリアージ ＆ プライバシー検知を実行"}
              </button>
            </div>
          </form>

          {errorMsg && <div className={styles.errorBanner}>{errorMsg}</div>}
        </section>

        {result && (
          <section className={styles.card} aria-live="polite">
            <div className={styles.resultHero}>
              <div className={styles.resultHeroTop}>
                <span className={styles.categoryTag}>{result.category}</span>
                <span className={styles.modelPill}>⚡ gemini · {usedModel}</span>
              </div>
              <h2 className={styles.resultTitle}>{result.title}</h2>
              <div className={styles.pipelineHint}>
                Gemini JSON Schema → 緊急度判定・プライバシー検知 → Google Sheets / Maps / Calendar
              </div>
            </div>

            <div
              className={`${styles.privacyAlert} ${
                hasPrivacyRisk ? styles.privacyDanger : styles.privacySafe
              }`}
              role="status"
            >
              <div className={styles.privacyHeader}>
                <span>
                  {hasPrivacyRisk
                    ? "⚠️ 公開前プライバシー警告（個人情報映り込みを検出）"
                    : "✅ 公開前プライバシーチェック通過（安全な公開が可能）"}
                </span>
                <div className={styles.privacyChips}>
                  <span
                    className={
                      result.privacy_check.has_face ? styles.privacyChipWarn : styles.privacyChipOk
                    }
                  >
                    顔: {result.privacy_check.has_face ? "検出" : "なし"}
                  </span>
                  <span
                    className={
                      result.privacy_check.has_license_plate
                        ? styles.privacyChipWarn
                        : styles.privacyChipOk
                    }
                  >
                    ナンバー: {result.privacy_check.has_license_plate ? "検出" : "なし"}
                  </span>
                  <span
                    className={
                      result.privacy_check.has_nameplate
                        ? styles.privacyChipWarn
                        : styles.privacyChipOk
                    }
                  >
                    表札: {result.privacy_check.has_nameplate ? "検出" : "なし"}
                  </span>
                </div>
              </div>
              <p className={styles.privacyMsg}>{result.privacy_check.warning_message}</p>
            </div>

            <div className={styles.twoCol}>
              <div className={styles.metricBox}>
                <span className={styles.metricLabel}>緊急度トリアージ (1〜5)</span>
                <div className={styles.severityHeader}>
                  <span className={`${styles.severityValue} ${severityColorClass}`}>
                    Lv.{result.severity} / 5
                  </span>
                  <span style={{ fontSize: "0.84rem", fontWeight: 700, color: "#334155" }}>
                    {severityLabel(result.severity)}
                  </span>
                </div>
                <div className={styles.severityBars} aria-label={`緊急度 ${result.severity} / 5`}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <div
                      key={n}
                      className={`${styles.severitySegment} ${
                        n <= result.severity ? segFillClass : ""
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className={styles.metricBox}>
                <span className={styles.metricLabel}>推定担当部署 ＆ 現場マップ</span>
                <div className={styles.departmentName}>🏛️ {result.department}</div>
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.mapLink}
                >
                  📍 Google マップで現場ピンを開く ↗
                </a>
              </div>
            </div>

            <div className={styles.twoCol}>
              <div className={styles.metricBox}>
                <span className={styles.metricLabel}>🌍 防災・環境インパクト</span>
                <p className={styles.infoText}>{result.eco_disaster_impact}</p>
              </div>
              <div className={styles.metricBox}>
                <span className={styles.metricLabel}>🦺 市民が取るべき安全行動</span>
                <p className={styles.infoText}>{result.recommended_action}</p>
              </div>
            </div>

            <div className={styles.reportBox}>
              <div className={styles.reportHeader}>
                <span className={styles.metricLabel}>📨 自治体提出用 定型通報文（そのまま送付可能）</span>
                <button type="button" className={styles.copyBtn} onClick={handleCopyReport}>
                  {copied ? "✅ コピーしました！" : "📋 通報文をコピー"}
                </button>
              </div>
              <pre className={styles.reportPre}>{result.report_draft}</pre>
            </div>

            {result.suggested_tasks.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <span className={styles.metricLabel}>
                  📋 地域パトロール・確認タスク（Google シート＆カレンダー連携対象）
                </span>
                <div className={styles.taskList}>
                  {result.suggested_tasks.map((task, idx) => (
                    <div key={`${task.title}-${idx}`} className={styles.taskItem}>
                      <div>
                        <div className={styles.taskTitle}>{task.title}</div>
                        <div className={styles.taskMemo}>{task.memo}</div>
                      </div>
                      <span
                        className={`${styles.priorityBadge} ${
                          task.priority === "high"
                            ? styles.prioHigh
                            : task.priority === "low"
                            ? styles.prioLow
                            : styles.prioMedium
                        }`}
                      >
                        {task.priority}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className={styles.gasDock}>
              <div className={styles.gasDockText}>
                地域台帳（Google シート）へピンURL付きで記録し、確認予定をカレンダー登録します
              </div>
              <button
                type="button"
                className={styles.gasBtn}
                onClick={handleGasSync}
                disabled={gasSyncing}
              >
                {gasSyncing
                  ? "⏳ Google Workspace へ連携中..."
                  : "🗺️ Google シート / カレンダーへ連携 (GAS)"}
              </button>
            </div>

            {gasMessage && <div className={styles.successBanner}>{gasMessage}</div>}
            {gasError && <div className={styles.errorBanner}>{gasError}</div>}
          </section>
        )}
      </div>
    </div>
  );
}
