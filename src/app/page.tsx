"use client";

import { useState } from "react";
import StudyTutor from "@/components/StudyTutor";
import TaskManager from "@/components/TaskManager";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<"tutor" | "tasks">("tutor");
  const [taskRefreshKey, setTaskRefreshKey] = useState(0);

  return (
    <div className="app-shell">
      <nav className="top-nav" aria-label="機能切り替え">
        <div className="top-nav-inner">
          <span className="brand">GapTutor × Neon</span>
          <div className="tab-group">
            <button
              type="button"
              className={`tab-btn ${activeTab === "tutor" ? "is-active" : ""}`}
              onClick={() => setActiveTab("tutor")}
            >
              AI 学習チューター
            </button>
            <button
              type="button"
              className={`tab-btn ${activeTab === "tasks" ? "is-active" : ""}`}
              onClick={() => setActiveTab("tasks")}
            >
              学習タスク管理
            </button>
          </div>
        </div>
      </nav>

      {activeTab === "tutor" ? (
        <main className="container">
          <header className="header">
            <div>
              <h1>数式・論文・専門書インタラクティブ学習ツール</h1>
              <p className="subtitle">
                つまずきの前提知識を Gemini が特定し、段階演習と Neon 復習タスクへ変換します
              </p>
            </div>
          </header>
          <StudyTutor onTasksCreated={() => setTaskRefreshKey((k) => k + 1)} />
        </main>
      ) : (
        <TaskManager key={taskRefreshKey} />
      )}
    </div>
  );
}
