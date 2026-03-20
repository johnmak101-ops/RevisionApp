"use client";

import { useState } from "react";
import { useUpload } from "@/context/UploadContext";

/**
 * 文件上傳元件 — 支援 PDF 和 Markdown。
 * 上傳透過 UploadContext 在背景執行，用戶可自由切換 Tab。
 */
export function FileUpload() {
  const [file, setFile] = useState<File | null>(null);
  const { startUpload, uploadState } = useUpload();

  const isUploading = uploadState.status === "uploading";

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file || isUploading) return;

    // 🔑 Fire-and-forget — does NOT block the UI
    startUpload(file);
    setFile(null);

    // Reset the file input
    const form = e.currentTarget;
    form.reset();
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
          disabled={!file || isUploading}
          className="shrink-0 rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium
            text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors whitespace-nowrap"
        >
          {isUploading ? "⏳ 上傳中..." : "建立索引"}
        </button>

        {isUploading && (
          <span className="text-xs text-indigo-500 shrink-0">
            可以切換 Tab，上傳背景進行
          </span>
        )}
      </form>
    </div>
  );
}
