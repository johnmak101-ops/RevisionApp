"use client";

import { useState } from "react";

/**
 * 文件上傳元件 — 支援 PDF 和 Markdown。
 * 上傳後會呼叫 `/api/ingest` 進行切分 + embedding 索引。
 */
export function FileUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  /**
   * 處理表單提交 — 將檔案透過 FormData POST 到 `/api/ingest`。
   *
   * @remarks
   * 舊版 React 的 `React.FormEvent`（無型別參數）已棄用，
   * 請始終使用 `React.FormEvent<HTMLFormElement>`。
   *
   * @deprecated 舊寫法 `React.FormEvent` — 已升級為 `React.FormEvent<HTMLFormElement>`
   */
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) return;

    setStatus("uploading");
    setMessage("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setStatus("success");
      setMessage(`✅ ${file.name} — ${data.chunkCount} 個區塊`);
      setFile(null);
    } catch (err) {
      setStatus("error");
      setMessage(`❌ ${err instanceof Error ? err.message : "上傳失敗"}`);
    }
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-3">
        {/* Label */}
        <span className="shrink-0 text-sm font-semibold text-slate-700 whitespace-nowrap">
          📄 上傳教材
        </span>

        {/* File input */}
        <input
          type="file"
          accept=".pdf,.md,.markdown"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="flex-1 min-w-[200px] text-sm text-slate-600
            file:mr-3 file:rounded-md file:border-0 file:bg-indigo-50
            file:px-3 file:py-1.5 file:text-sm file:font-medium
            file:text-indigo-700 hover:file:bg-indigo-100 file:cursor-pointer"
        />

        {/* Upload button */}
        <button
          type="submit"
          disabled={!file || status === "uploading"}
          className="shrink-0 rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium
            text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors whitespace-nowrap"
        >
          {status === "uploading" ? "⏳ 處理中..." : "建立索引"}
        </button>

        {/* Status message — inline */}
        {message && (
          <span className={`text-sm shrink-0 ${status === "error" ? "text-red-600" : "text-green-600"}`}>
            {message}
          </span>
        )}
      </form>
    </div>
  );
}
