"use client";

import Link from "next/link";
import { ChangeEvent, CSSProperties, FormEvent, useState } from "react";
import { SHOWCASE_APPS, ShowcaseAppId } from "@/lib/showcaseConfigs";
import styles from "./ShowcaseApp.module.css";

interface ShowcaseResult {
  title: string;
  summary: string;
  alert_level: "high" | "medium" | "low";
  alert_title: string;
  alert_message: string;
  items: { label: string; badge: string; detail: string }[];
  checklist: string[];
  copyable_draft: string;
  suggested_tasks: { title: string; priority: "high" | "medium" | "low"; memo: string }[];
}

export default function ShowcaseApp({ appId }: { appId: ShowcaseAppId }) {
  const config = SHOWCASE_APPS[appId];
  const [sourceText, setSourceText] = useState("");
  const [locationText, setLocationText] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState("");
  const [imageMimeType, setImageMimeType] = useState("");

  const [loading, setLoading] = useState(false);
  const [syncingGas, setSyncingGas] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [result, setResult] = useState<ShowcaseResult | null>(null);
  const [checked, setChecked] = useState<Record<number, boolean>>({});

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setImagePreview(null);
      setImageBase64("");
      setImageMimeType("");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      const [, b64] = dataUrl.split(",");
      setImagePreview(dataUrl);
      setImageBase64(b64 ?? "");
      setImageMimeType(file.type || "image/jpeg");
    };
    reader.readAsDataURL(file);
  }

  function handleLoadSample() {
    setSourceText(config.sampleText);
    if (config.sampleLocation) {
      setLocationText(config.sampleLocation);
    }
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);
    setChecked({});

    try {
      const res = await fetch("/api/showcase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appId,
          sourceText,
          locationText,
          imageBase64,
          imageMimeType,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "解析に失敗しました。");
      }
      setResult(data.result as ShowcaseResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました。");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopyDraft() {
    if (!result?.copyable_draft) return;
    try {
      await navigator.clipboard.writeText(result.copyable_draft);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("コピーに失敗しました。");
    }
  }

  async function handleGasSync() {
    if (!result) return;
    setSyncingGas(true);
    setError(null);
    setNotice(null);

    try {
      const res = await fetch("/api/gas-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic_title: `${config.gasPrefix} ${result.title}`,
          summary: `${result.alert_title} / ${result.summary}`,
          tasks: result.suggested_tasks ?? [],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Google Workspace 連携に失敗しました。");
      }
      setNotice(
        `Google Workspace へ連携しました（スプレッドシート: ${data.addedRows ?? 0}行 / カレンダー予定: ${data.addedEvents ?? 0}件）。`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "GAS 連携中にエラーが発生しました。");
    } finally {
      setSyncingGas(false);
    }
  }

  const themeStyle = {
    "--accent": config.accentColor,
    "--accent-soft": config.accentSoft,
  } as CSSProperties;

  const bannerClass =
    result?.alert_level === "high"
      ? styles.bannerHigh
      : result?.alert_level === "medium"
      ? styles.bannerMid
      : styles.bannerLow;

  return (
    <div className={styles.shell} style={themeStyle}>
      <nav className={styles.topNav} aria-label="アプリ切り替え">
        <div className={styles.topNavInner}>
          <div className={styles.brandGroup}>
            <span className={styles.brand}>{config.name}</span>
            <span className={styles.geminiBadge}>{config.badgeText}</span>
          </div>
          <div className={styles.navLinks}>
            <Link href="/" className={styles.navLink}>
              GapTutor
            </Link>
            <Link href="/otayori" className={styles.navLink}>
              おたよりバトン
            </Link>
            <Link href="/machieye" className={styles.navLink}>
              MachiEye
            </Link>
            <Link href="/gitbridge" className={styles.navLink}>
              GitBridge
            </Link>
          </div>
        </div>
      </nav>

      <main className={styles.container}>
        <span className={styles.categoryTag}>{config.category}</span>
        <h1 className={styles.title}>{config.tagline}</h1>
        <p className={styles.subtitle}>{config.subtitle}</p>

        {error && <div className={styles.alertError}>{error}</div>}
        {notice && <div className={styles.alertSuccess}>{notice}</div>}

        <section className={styles.card}>
          <div className={styles.toolbar}>
            <h2 className={styles.cardTitle}>STEP 1: 写真またはテキストを入力</h2>
            <button type="button" className={styles.btn} onClick={handleLoadSample}>
              ✨ サンプルを入力
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="showcase-file">
                写真・書類画像（任意）
              </label>
              <input id="showcase-file" type="file" accept="image/*" onChange={handleFileChange} />
              {imagePreview && (
                <img src={imagePreview} alt="アップロード画像" className={styles.preview} />
              )}
            </div>

            {config.showLocationInput && (
              <div className={styles.field}>
                <label className={styles.label} htmlFor="showcase-loc">
                  場所・エリア名
                </label>
                <input
                  id="showcase-loc"
                  className={styles.input}
                  type="text"
                  placeholder="例: 東京都新宿区西新宿1丁目"
                  value={locationText}
                  onChange={(e) => setLocationText(e.target.value)}
                />
              </div>
            )}

            <div className={styles.field}>
              <label className={styles.label} htmlFor="showcase-text">
                {config.inputLabel}
              </label>
              <textarea
                id="showcase-text"
                className={styles.textarea}
                rows={4}
                placeholder={config.inputPlaceholder}
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
              />
            </div>

            <div className={styles.actions}>
              <button
                type="submit"
                className={`${styles.btn} ${styles.btnPrimary}`}
                disabled={loading}
              >
                {loading ? "Gemini 3.8 Flash が構造化解析中..." : config.submitLabel}
              </button>
            </div>
          </form>
        </section>

        {result && (
          <section className={styles.card}>
            <div className={styles.toolbar}>
              <div>
                <h2 className={styles.cardTitle}>{result.title}</h2>
                <p className={styles.subtitle} style={{ margin: "4px 0 0" }}>
                  {result.summary}
                </p>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {config.showLocationInput && locationText.trim() && (
                  <a
                    href={`https://www.google.com/maps?q=${encodeURIComponent(locationText.trim())}`}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.btn}
                  >
                    Google マップで開く
                  </a>
                )}
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  disabled={syncingGas}
                  onClick={handleGasSync}
                >
                  {syncingGas ? "送信中..." : "Google カレンダー / シートへ連携 (GAS)"}
                </button>
              </div>
            </div>

            <div className={bannerClass}>
              <strong>{result.alert_title}</strong>
              <p style={{ margin: "6px 0 0", fontSize: "0.9rem" }}>{result.alert_message}</p>
            </div>

            <div className={styles.section}>
              <h3>{config.section1Title}</h3>
              <div className={styles.grid}>
                {result.items.map((item, idx) => (
                  <div key={idx} className={styles.subCard}>
                    <div className={styles.itemHead}>
                      <strong>{item.label}</strong>
                      <span className={styles.itemBadge}>{item.badge}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: "0.88rem", color: "#334155" }}>
                      {item.detail}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.section}>
              <h3>{config.section2Title}</h3>
              <div className={styles.checkList}>
                {result.checklist.map((item, idx) => (
                  <label key={idx} className={styles.checkItem}>
                    <input
                      type="checkbox"
                      checked={Boolean(checked[idx])}
                      onChange={() => setChecked((prev) => ({ ...prev, [idx]: !prev[idx] }))}
                    />
                    <span
                      style={{
                        textDecoration: checked[idx] ? "line-through" : "none",
                        color: checked[idx] ? "#64748b" : "#0f172a",
                      }}
                    >
                      {item}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className={styles.section}>
              <div className={styles.toolbar} style={{ marginBottom: 8 }}>
                <h3 style={{ margin: 0 }}>{config.section3Title}</h3>
                <button type="button" className={styles.btn} onClick={handleCopyDraft}>
                  {copied ? "コピーしました" : "コピー"}
                </button>
              </div>
              <div className={styles.draftBox}>{result.copyable_draft}</div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
