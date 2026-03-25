"use client";

import { useState } from "react";
import { FileUpload } from "@/components/FileUpload";
import { DocumentList } from "@/components/DocumentList";
import { ChatBox } from "@/components/ChatBox";
import { QuizPanel } from "@/components/QuizPanel";
import { SummaryPanel } from "@/components/SummaryPanel";
import { KnowledgeGap } from "@/components/KnowledgeGap";
import { TabNav } from "@/components/TabNav";

/**
 * 應用主頁面 — 包含 FileUpload、TabNav 及三個 tab 內容（Chat / Quiz / Summary）。
 */
export default function Home() {
  const [activeTab, setActiveTab] = useState("chat");

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <header className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-slate-800">Bootcamp 複習 App</h1>
        <p className="mt-1 text-slate-600">
          上傳 PDF 或 Markdown，用 AI 聊天複習、自動出題、生成大綱
        </p>
      </header>

      {/* Upload bar */}
      <div className="mb-4 space-y-0">
        <FileUpload />
        <DocumentList />
      </div>

      {/* Tab navigation */}
      <TabNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Tab content */}
      <div className="w-full">
        {activeTab === "chat" && <ChatBox />}

        {activeTab === "quiz" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <QuizPanel />
            </div>
            <div>
              <KnowledgeGap />
            </div>
          </div>
        )}

        {activeTab === "summary" && <SummaryPanel />}
      </div>
    </main>
  );
}
