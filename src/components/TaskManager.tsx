"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  Task,
  TASK_PRIORITIES,
  TASK_STATUSES,
  TaskPriority,
  TaskStatus,
} from "@/types/task";

export default function TaskManager() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 新規作成フォーム
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [memo, setMemo] = useState("");

  // フィルタ
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");

  // 編集状態
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editStatus, setEditStatus] = useState<TaskStatus>("todo");
  const [editPriority, setEditPriority] = useState<TaskPriority>("medium");
  const [editMemo, setEditMemo] = useState("");

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== "all") params.set("status", filterStatus);
      if (filterPriority !== "all") params.set("priority", filterPriority);
      const query = params.toString();
      const res = await fetch(`/api/tasks${query ? `?${query}` : ""}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "タスクの取得に失敗しました。");
      }
      setTasks(data.tasks ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "予期しないエラーが発生しました。");
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterPriority]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const counts = useMemo(() => {
    return {
      total: tasks.length,
      todo: tasks.filter((t) => t.status === "todo").length,
      in_progress: tasks.filter((t) => t.status === "in_progress").length,
      done: tasks.filter((t) => t.status === "done").length,
    };
  }, [tasks]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, status, priority, memo }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "タスクの作成に失敗しました。");
      }
      setTitle("");
      setStatus("todo");
      setPriority("medium");
      setMemo("");
      await fetchTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "作成に失敗しました。");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleQuickStatusChange(taskId: number, nextStatus: TaskStatus) {
    setError(null);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "ステータスの更新に失敗しました。");
      }
      await fetchTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新に失敗しました。");
    }
  }

  function startEdit(task: Task) {
    setEditingId(task.id);
    setEditTitle(task.title);
    setEditStatus(task.status);
    setEditPriority(task.priority);
    setEditMemo(task.memo);
  }

  async function handleSaveEdit(taskId: number) {
    if (!editTitle.trim()) {
      setError("タイトルは必須です。");
      return;
    }
    setError(null);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle,
          status: editStatus,
          priority: editPriority,
          memo: editMemo,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "タスクの更新に失敗しました。");
      }
      setEditingId(null);
      await fetchTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新に失敗しました。");
    }
  }

  async function handleDelete(taskId: number) {
    if (!window.confirm("このタスクを削除しますか？")) return;
    setError(null);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "削除に失敗しました。");
      }
      await fetchTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "削除に失敗しました。");
    }
  }

  return (
    <main className="container">
      <header className="header">
        <div>
          <h1>タスク管理アプリ</h1>
          <p className="subtitle">Next.js App Router + Neon Serverless PostgreSQL</p>
        </div>
        <button className="btn" type="button" onClick={fetchTasks} disabled={loading}>
          {loading ? "読み込み中..." : "再読み込み"}
        </button>
      </header>

      <section className="stats" aria-label="タスク集計">
        <div className="stat-card">
          <div className="stat-label">表示中の件数</div>
          <div className="stat-value">{counts.total}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">未着手</div>
          <div className="stat-value">{counts.todo}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">進行中</div>
          <div className="stat-value">{counts.in_progress}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">完了</div>
          <div className="stat-value">{counts.done}</div>
        </div>
      </section>

      {error && (
        <div className="alert-error" role="alert">
          <strong>エラー:</strong> {error}
        </div>
      )}

      <section className="card">
        <h2 className="card-title">新しいタスクを追加</h2>
        <form onSubmit={handleCreate}>
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="task-title">タイトル *</label>
              <input
                id="task-title"
                type="text"
                placeholder="例: Neon の接続設定を確認する"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="task-status">状態</label>
              <select
                id="task-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
              >
                {TASK_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="task-priority">優先度</label>
              <select
                id="task-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
              >
                {TASK_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_LABELS[p]}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field full">
              <label htmlFor="task-memo">メモ</label>
              <textarea
                id="task-memo"
                rows={2}
                placeholder="補足事項やリンクなど（任意）"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
              />
            </div>
          </div>

          <div className="form-actions">
            <button className="btn btn-primary" type="submit" disabled={submitting}>
              {submitting ? "登録中..." : "タスクを追加"}
            </button>
          </div>
        </form>
      </section>

      <section className="card">
        <div className="toolbar">
          <h2 className="card-title" style={{ margin: 0 }}>
            タスク一覧
          </h2>
          <div className="filters">
            <select
              aria-label="状態で絞り込み"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">すべての状態</option>
              {TASK_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>

            <select
              aria-label="優先度で絞り込み"
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
            >
              <option value="all">すべての優先度</option>
              {TASK_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  優先度: {PRIORITY_LABELS[p]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="empty-state">タスクを読み込んでいます...</div>
        ) : tasks.length === 0 ? (
          <div className="empty-state">
            条件に一致するタスクはありません。上のフォームから追加してください。
          </div>
        ) : (
          <div className="task-list">
            {tasks.map((task) => {
              const isEditing = editingId === task.id;
              return (
                <article
                  key={task.id}
                  className={`task-item ${task.status === "done" ? "is-done" : ""}`}
                >
                  {isEditing ? (
                    <>
                      <div className="form-grid">
                        <div className="form-field">
                          <label>タイトル</label>
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                          />
                        </div>
                        <div className="form-field">
                          <label>状態</label>
                          <select
                            value={editStatus}
                            onChange={(e) => setEditStatus(e.target.value as TaskStatus)}
                          >
                            {TASK_STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {STATUS_LABELS[s]}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="form-field">
                          <label>優先度</label>
                          <select
                            value={editPriority}
                            onChange={(e) => setEditPriority(e.target.value as TaskPriority)}
                          >
                            {TASK_PRIORITIES.map((p) => (
                              <option key={p} value={p}>
                                {PRIORITY_LABELS[p]}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="form-field full">
                          <label>メモ</label>
                          <textarea
                            rows={2}
                            value={editMemo}
                            onChange={(e) => setEditMemo(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="form-actions">
                        <button
                          className="btn btn-sm"
                          type="button"
                          onClick={() => setEditingId(null)}
                        >
                          キャンセル
                        </button>
                        <button
                          className="btn btn-primary btn-sm"
                          type="button"
                          onClick={() => handleSaveEdit(task.id)}
                        >
                          保存
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="task-top">
                        <h3 className="task-title">{task.title}</h3>
                        <div className="badges">
                          <span className={`badge badge-status-${task.status}`}>
                            {STATUS_LABELS[task.status]}
                          </span>
                          <span className={`badge badge-priority-${task.priority}`}>
                            優先度: {PRIORITY_LABELS[task.priority]}
                          </span>
                        </div>
                      </div>

                      {task.memo && <p className="task-memo">{task.memo}</p>}

                      <div className="task-footer">
                        <span className="task-meta">
                          更新: {new Date(task.updated_at).toLocaleString("ja-JP")}
                        </span>
                        <div className="task-actions">
                          <select
                            aria-label="状態を変更"
                            value={task.status}
                            onChange={(e) =>
                              handleQuickStatusChange(task.id, e.target.value as TaskStatus)
                            }
                          >
                            {TASK_STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {STATUS_LABELS[s]}
                              </option>
                            ))}
                          </select>
                          <button
                            className="btn btn-sm"
                            type="button"
                            onClick={() => startEdit(task)}
                          >
                            編集
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            type="button"
                            onClick={() => handleDelete(task.id)}
                          >
                            削除
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
