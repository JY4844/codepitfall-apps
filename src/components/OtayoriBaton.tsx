"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useState } from "react";
import type { OtayoriAnalysis } from "@/app/api/otayori/route";
import styles from "./OtayoriBaton.module.css";

const SAMPLE_HANDOUT = `【さくら小学校 3年2組 学年だより】
秋の遠足（多摩動物公園）のお知らせ

1. 日時：11月28日（金）8:15 校庭集合 / 15:10 帰校予定
   ※雨天時は12月2日（火）に延期します。
2. 持ち物：リュック、水筒、お弁当、レジャーシート、雨具（カッパ）、ハンカチ・ティッシュ、筆記用具
3. 集金：交通費・入園料 500円（おつりのないよう封筒に入れ、11月25日（火）までに担任へ提出）
4. 提出物：参加承諾書（切り取り線以下を記入・押印し、11月20日（水）までに提出）
5. お願い：帰校時刻が通常より遅いため、学童を利用されないご家庭はお迎えをお願いします。`;

const DEFAULT_FAMILY_ROLES =
  "母：平日朝の準備・持ち物確認 / 父：水曜は早帰り・提出物や集金担当 / 祖母：金曜の送迎・見守り担当";

const FAMILY_MEMBERS = [
  { key: "母", label: "母（ママ）", icon: "👩", role: "朝の準備・持ち物確認" },
  { key: "父", label: "父（パパ）", icon: "👨", role: "水曜早帰り・提出物/集金" },
  { key: "祖母", label: "祖母（おばあちゃん）", icon: "👵", role: "金曜の送迎・見守り" },
] as const;

const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_IMAGE_EDGE = 1600;

const PRIORITY_LABEL: Record<string, string> = {
  high: "高",
  medium: "中",
  low: "低",
};

function nextAssignee(current: string): string {
  const order = ["母", "父", "祖母"];
  const idx = order.indexOf(current);
  return order[(idx + 1) % order.length];
}

export default function OtayoriBaton() {
  const [sourceText, setSourceText] = useState("");
  const [familyRoles, setFamilyRoles] = useState(DEFAULT_FAMILY_ROLES);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState("");
  const [imageMimeType, setImageMimeType] = useState("");

  const [analyzing, setAnalyzing] = useState(false);
  const [syncingGas, setSyncingGas] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [copiedGrandma, setCopiedGrandma] = useState(false);

  const [analysis, setAnalysis] = useState<OtayoriAnalysis | null>(null);
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});

  function clearImage() {
    setImagePreview(null);
    setImageBase64("");
    setImageMimeType("");
  }

  function handleImageChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      clearImage();
      return;
    }
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      clearImage();
      e.target.value = "";
      setError("PNG / JPEG / WebP の画像を選択してください。");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      clearImage();
      e.target.value = "";
      setError("画像サイズは 10 MB 以下にしてください。");
      return;
    }
    setError(null);

    const reader = new FileReader();
    reader.onerror = () => {
      clearImage();
      setError("画像の読み込みに失敗しました。");
    };
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(img.width, img.height));
        let dataUrl = result;
        let mime = file.type || "image/png";
        if (scale < 1 || file.size > 1.5 * 1024 * 1024) {
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            dataUrl = canvas.toDataURL("image/jpeg", 0.88);
            mime = "image/jpeg";
          }
        }
        const [, base64] = dataUrl.split(",");
        setImagePreview(dataUrl);
        setImageBase64(base64 ?? "");
        setImageMimeType(mime);
      };
      img.onerror = () => {
        clearImage();
        setError("画像を解釈できませんでした。別の画像でお試しください。");
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  }

  async function handleAnalyze(e: FormEvent) {
    e.preventDefault();
    setAnalyzing(true);
    setError(null);
    setNotice(null);
    setCheckedItems({});
    setCopiedGrandma(false);

    try {
      const res = await fetch("/api/otayori", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceText,
          familyRoles,
          imageBase64,
          imageMimeType,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "おたよりの解析に失敗しました。");
      }
      setAnalysis(data.analysis);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "解析中にエラーが発生しました。"
      );
    } finally {
      setAnalyzing(false);
    }
  }

  function handlePassBaton(eventIndex: number) {
    setAnalysis((prev) => {
      if (!prev) return prev;
      const updated = prev.events.map((ev, idx) =>
        idx === eventIndex
          ? {
              ...ev,
              assignee: nextAssignee(ev.assignee),
              reason: "タップして家族バトンを切り替えました",
            }
          : ev
      );
      return { ...prev, events: updated };
    });
  }

  async function handleCopyGrandmaSummary() {
    if (!analysis) return;
    const text = [
      `【${analysis.title}】`,
      ...analysis.grandparent_summary.map((line, i) => `${i + 1}. ${line}`),
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopiedGrandma(true);
      setTimeout(() => setCopiedGrandma(false), 2500);
    } catch {
      setError("クリップボードへのコピーに失敗しました。");
    }
  }

  async function handleSyncToGas() {
    if (!analysis) return;
    setSyncingGas(true);
    setError(null);
    setNotice(null);

    const tasksToSync =
      analysis.suggested_tasks.length > 0
        ? analysis.suggested_tasks
        : analysis.events.map((ev) => ({
            title: `【${ev.assignee}】${ev.title}`,
            priority: "medium" as const,
            memo: `${ev.date} / ${ev.reason}`,
          }));

    try {
      const res = await fetch("/api/gas-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic_title: `【おたよりバトン】${analysis.title}`,
          summary: `${analysis.summary}（集金: ${analysis.cost}）`,
          tasks: tasksToSync,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          data.error || "Google Apps Script 連携に失敗しました。"
        );
      }
      setNotice(
        `家族の Google Workspace へ連携しました（スプレッドシート記録: ${
          data.addedRows ?? 0
        } 行 / カレンダー予定: ${data.addedEvents ?? 0} 件）。`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Google カレンダー / シート連携中にエラーが発生しました。"
      );
    } finally {
      setSyncingGas(false);
    }
  }

  function countForMember(memberKey: string): number {
    if (!analysis) return 0;
    return analysis.events.filter((ev) => ev.assignee === memberKey).length;
  }

  return (
    <div className={styles.shell}>
      <nav className={styles.topNav} aria-label="アプリ切り替え">
        <div className={styles.topNavInner}>
          <div className={styles.brandGroup}>
            <span className={styles.brand}>おたよりバトン</span>
            <span className={styles.geminiBadge}>
              ✦ Google Gemini 3.8 Flash + JSON Schema
            </span>
          </div>
          <div className={styles.navLinks}>
            <Link href="/" className={styles.navLink}>
              GapTutor（学習）
            </Link>
            <Link href="/machieye" className={styles.navLink}>
              MachiEye（まち）
            </Link>
          </div>
        </div>
      </nav>

      <main className={styles.container}>
        <header className={styles.header}>
          <div>
            <span className={styles.categoryTag}>暮らしと家族の部門</span>
            <h1 className={styles.title}>
              紙のお知らせを、家族みんなの「やること」へ
            </h1>
            <p className={styles.subtitle}>
              学校のおたより・自治体通知・お薬手帳を撮るだけ。母・父・祖母の3世代へ自動で振り分けます。
            </p>
          </div>
        </header>

        <section className={styles.familyBar} aria-label="家族メンバー">
          {FAMILY_MEMBERS.map((m) => {
            const count = countForMember(m.key);
            const avatarClass =
              m.key === "母"
                ? styles.avatarMother
                : m.key === "父"
                ? styles.avatarFather
                : styles.avatarGrandma;
            return (
              <div
                key={m.key}
                className={`${styles.familyPill} ${
                  count > 0 ? styles.familyPillActive : ""
                }`}
              >
                <span className={`${styles.avatar} ${avatarClass}`} aria-hidden="true">
                  {m.icon}
                </span>
                <div className={styles.familyInfo}>
                  <div className={styles.familyName}>{m.label}</div>
                  <div className={styles.familyRole}>{m.role}</div>
                </div>
                <span className={styles.countBadge}>{count} 件</span>
              </div>
            );
          })}
        </section>

        {error && (
          <div className={styles.alertError} role="alert">
            <strong>エラー:</strong> {error}
          </div>
        )}
        {notice && (
          <div className={styles.alertSuccess} role="status">
            <span aria-hidden="true">✓</span>
            <span>{notice}</span>
          </div>
        )}

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.stepHead}>
              <span className={styles.stepBadge}>STEP 1</span>
              <h2 className={styles.cardTitle}>
                おたより・通知を読み込む
              </h2>
            </div>
            <button
              type="button"
              className={styles.sampleBtn}
              onClick={() => {
                setSourceText(SAMPLE_HANDOUT);
                setError(null);
              }}
            >
              ✨ 学校プリント サンプルを入力
            </button>
          </div>

          <form onSubmit={handleAnalyze}>
            <div className={styles.inputGrid}>
              <div className={styles.field}>
                <label htmlFor="otayori-image" className={styles.fieldLabel}>
                  おたより・お薬手帳の写真（任意）
                </label>
                <label
                  htmlFor="otayori-image"
                  className={`${styles.dropzone} ${
                    imagePreview ? styles.dropzoneHasImage : ""
                  }`}
                >
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="アップロードしたおたよりのプレビュー"
                      className={styles.previewImg}
                    />
                  ) : (
                    <span className={styles.dropzoneInner}>
                      <span className={styles.dropzoneIcon} aria-hidden="true">
                        📷
                      </span>
                      <span>クリックしておたより写真を選択</span>
                      <span className={styles.dropzoneHint}>
                        学校プリント・自治体通知・お薬手帳（PNG / JPEG / WebP）
                      </span>
                    </span>
                  )}
                </label>
                <input
                  id="otayori-image"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className={styles.hiddenInput}
                  onChange={handleImageChange}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="otayori-text" className={styles.fieldLabel}>
                  お知らせのテキスト（画像のみでも解析できます）
                </label>
                <textarea
                  id="otayori-text"
                  rows={7}
                  className={styles.textarea}
                  placeholder="学校プリントや連絡メールの文章を貼り付けてください"
                  value={sourceText}
                  onChange={(e) => setSourceText(e.target.value)}
                />
              </div>
            </div>

            <div className={styles.field} style={{ marginTop: 14 }}>
              <label htmlFor="family-roles" className={styles.fieldLabel}>
                家族の役割・曜日ごとの目安（担当提案のヒント）
              </label>
              <input
                id="family-roles"
                type="text"
                className={styles.textInput}
                value={familyRoles}
                onChange={(e) => setFamilyRoles(e.target.value)}
              />
            </div>

            <div className={styles.actionsRow}>
              <button
                type="submit"
                className={styles.primaryBtn}
                disabled={analyzing}
              >
                {analyzing ? (
                  <>
                    <span className={styles.spinner} aria-hidden="true" />
                    Gemini 3.8 Flash が読み解き中...
                  </>
                ) : (
                  "おたよりを読み解いて家族に振り分ける →"
                )}
              </button>
            </div>
          </form>
        </section>

        {analysis && (
          <section className={styles.resultCard}>
            <div className={styles.resultHero}>
              <div className={styles.heroTop}>
                <span className={styles.heroBadge}>STEP 2 · 構造化抽出完了</span>
                <span className={styles.heroBadge}>
                  ⚡ Google Gemini 3.8 Flash + JSON Schema
                </span>
              </div>
              <h2 className={styles.heroTitle}>{analysis.title}</h2>
              <p className={styles.heroSummary}>{analysis.summary}</p>
              <div className={styles.heroChips}>
                <span className={styles.heroChip}>
                  📅 予定・締切 {analysis.events.length} 件
                </span>
                <span className={styles.heroChip}>
                  🎒 持ち物 {analysis.items_to_bring.length} 点
                </span>
                <span className={styles.heroChip}>
                  💴 費用・集金：{analysis.cost}
                </span>
              </div>
            </div>

            <div className={styles.section}>
              <div className={styles.sectionTitleRow}>
                <h3 className={styles.sectionTitle}>
                  🔁 3世代 家族バトン（担当の自動提案）
                </h3>
                <span className={styles.sectionHint}>
                  「バトンを渡す」をタップすると担当を切り替えられます
                </span>
              </div>
              <div className={styles.batonGrid}>
                {FAMILY_MEMBERS.map((member) => {
                  const colClass =
                    member.key === "母"
                      ? styles.batonMother
                      : member.key === "父"
                      ? styles.batonFather
                      : styles.batonGrandma;
                  const memberEvents = analysis.events
                    .map((ev, index) => ({ ev, index }))
                    .filter(({ ev }) => ev.assignee === member.key);

                  return (
                    <div
                      key={member.key}
                      className={`${styles.batonCol} ${colClass}`}
                    >
                      <div className={styles.batonColHead}>
                        <span aria-hidden="true">{member.icon}</span>
                        <span>{member.label}</span>
                      </div>
                      {memberEvents.length === 0 ? (
                        <p className={styles.emptyMember}>
                          現在割り当てはありません
                        </p>
                      ) : (
                        memberEvents.map(({ ev, index }) => (
                          <div key={index} className={styles.batonEvent}>
                            <span className={styles.eventDate}>{ev.date}</span>
                            <div className={styles.eventTitle}>{ev.title}</div>
                            <p className={styles.eventReason}>
                              理由：{ev.reason}
                            </p>
                            <button
                              type="button"
                              className={styles.passBtn}
                              onClick={() => handlePassBaton(index)}
                            >
                              🔁 {nextAssignee(ev.assignee)}へバトンを渡す
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {analysis.items_to_bring.length > 0 && (
              <div className={styles.section}>
                <div className={styles.sectionTitleRow}>
                  <h3 className={styles.sectionTitle}>
                    🎒 持ち物・準備チェックリスト
                  </h3>
                </div>
                <div className={styles.itemsGrid}>
                  {analysis.items_to_bring.map((item, idx) => {
                    const checked = !!checkedItems[idx];
                    return (
                      <label
                        key={idx}
                        className={`${styles.itemChip} ${
                          checked ? styles.itemChipChecked : ""
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setCheckedItems((prev) => ({
                              ...prev,
                              [idx]: !prev[idx],
                            }))
                          }
                        />
                        <span>{item}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div className={styles.section}>
              <div className={styles.grandmaBox}>
                <div className={styles.grandmaHeader}>
                  <h3 className={styles.grandmaTitle}>
                    <span aria-hidden="true">👵</span>
                    おばあちゃん向け やさしい3行要約
                  </h3>
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    onClick={handleCopyGrandmaSummary}
                  >
                    {copiedGrandma ? "✓ コピーしました" : "📋 要約をコピー"}
                  </button>
                </div>
                <ol className={styles.grandmaLines}>
                  {analysis.grandparent_summary.map((line, idx) => (
                    <li key={idx} className={styles.grandmaLine}>
                      <span className={styles.grandmaNum}>{idx + 1}</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            {analysis.suggested_tasks.length > 0 && (
              <div className={styles.section}>
                <div className={styles.sectionTitleRow}>
                  <h3 className={styles.sectionTitle}>
                    📋 Google カレンダー / シートへ送る家族タスク
                  </h3>
                </div>
                <ul className={styles.taskList}>
                  {analysis.suggested_tasks.map((task, idx) => {
                    const prioClass =
                      task.priority === "high"
                        ? styles.prioHigh
                        : task.priority === "low"
                        ? styles.prioLow
                        : styles.prioMedium;
                    return (
                      <li key={idx} className={styles.taskItem}>
                        <span className={`${styles.prioBadge} ${prioClass}`}>
                          優先度 {PRIORITY_LABEL[task.priority] ?? task.priority}
                        </span>
                        <div>
                          <strong>{task.title}</strong>
                          {task.memo && (
                            <span className={styles.taskMemo}>{task.memo}</span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <div className={styles.actionDock}>
              <div className={styles.dockText}>
                <span className={styles.stepBadge}>STEP 3</span>
                <span>
                  抽出した家族の予定とタスクを Google Workspace へ一括共有
                </span>
              </div>
              <button
                type="button"
                className={styles.primaryBtn}
                disabled={syncingGas}
                onClick={handleSyncToGas}
              >
                {syncingGas
                  ? "GAS 送信中..."
                  : "📅 Google カレンダー / シートへ連携 (GAS)"}
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
