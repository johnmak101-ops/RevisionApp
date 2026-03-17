"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** 已上傳文件的摘要資訊（來自 `/api/documents`） */
interface Doc {
  /** MongoDB ObjectId */
  _id: string;
  /** 原始檔名 */
  filename: string;
  /** 切分後的 chunk 數量 */
  chunkCount: number;
}

/**
 * 摘要面板 — 選擇已上傳文件，由 AI 生成多層結構大綱。
 * 使用 streaming（NDJSON）即時顯示生成進度。
 */
export function SummaryPanel() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [selectedDoc, setSelectedDoc] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState("");
  const [streaming, setStreaming] = useState(false);

  useEffect(() => {
    fetch("/api/documents")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setDocs(data);
      })
      .catch(() => setDocs([]));
  }, []);

  /** 呼叫 `/api/summary/generate` 開始 streaming 生成大綱 */
  const handleGenerate = async () => {
    if (!selectedDoc) return;
    setLoading(true);
    setStreaming(true);
    setError("");
    setSummary("");

    try {
      const res = await fetch("/api/summary/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: selectedDoc }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          (data as { error?: string }).error || "生成失敗"
        );
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const parsed = JSON.parse(line) as {
              token?: string;
              done?: boolean;
              error?: string;
            };
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.token) {
              accumulated += parsed.token;
              setSummary(accumulated);
            }
            if (parsed.done) break;
          } catch (parseErr) {
            if (parseErr instanceof Error && parseErr.message !== line) {
              throw parseErr;
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成大綱失敗");
    } finally {
      setLoading(false);
      setStreaming(false);
    }
  };

  /** 將大綱文字複製到剪貼簿 */
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(summary);
    } catch {
      // Fallback: select all in a textarea
    }
  };

  return (
    <div className="flex flex-col rounded-lg border border-slate-200 bg-white shadow-sm h-full">
      {/* Header */}
      <div className="border-b border-slate-200 px-5 py-3 shrink-0">
        <h3 className="font-semibold text-slate-800">📑 Summary Agent</h3>
        <p className="text-xs text-slate-500">
          選文件，AI 自動生成多層結構大綱
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-0 h-[70vh]">
        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Doc selector */}
        {docs.length === 0 && !summary ? (
          <p className="text-sm text-slate-500">
            未有上傳文件。請先上傳 PDF 或 Markdown。
          </p>
        ) : (
          !summary && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  選擇文件
                </label>
                <select
                  value={selectedDoc}
                  onChange={(e) => setSelectedDoc(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">-- 揀一份文件 --</option>
                  {docs.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.filename} ({d.chunkCount} chunks)
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleGenerate}
                disabled={!selectedDoc || loading}
                className="w-full rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {loading ? "⏳ AI 整理中..." : "📑 生成大綱"}
              </button>
            </div>
          )
        )}

        {/* Streaming / completed summary */}
        {summary && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
            <div className="prose prose-sm prose-slate max-w-none
              [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-slate-900 [&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:border-b [&_h2]:border-slate-200 [&_h2]:pb-1
              [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-slate-800 [&_h3]:mt-3 [&_h3]:mb-1
              [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1
              [&_li]:text-sm [&_li]:text-slate-700
              [&_p]:text-sm [&_p]:text-slate-700 [&_p]:my-1.5
              [&_strong]:text-slate-900
              [&_code]:bg-slate-100 [&_code]:text-indigo-700 [&_code]:text-xs [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded
            ">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {summary}
              </ReactMarkdown>
              {streaming && (
                <span className="inline-block h-3 w-1.5 animate-pulse bg-indigo-400 align-middle ml-0.5" />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom bar */}
      {summary && !streaming && (
        <div className="border-t border-slate-200 p-4 shrink-0 flex gap-2">
          <button
            onClick={handleCopy}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
          >
            📋 複製
          </button>
          <button
            onClick={() => {
              setSummary("");
              setError("");
            }}
            className="flex-1 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            🔄 重新生成
          </button>
        </div>
      )}
    </div>
  );
}
