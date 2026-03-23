"use client";

import { useState, useEffect } from "react";
import MarkdownRenderer from "@/components/MarkdownRendererDynamic";

interface Doc {
  _id: string;
  filename: string;
  chunkCount: number;
}

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
        throw new Error((data as { error?: string }).error || "生成失敗");
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

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(summary);
    } catch {
      // clipboard fallback
    }
  };

  return (
    <div className="flex flex-col rounded-lg border border-slate-200 bg-white shadow-sm h-full">
      <div className="border-b border-slate-200 px-5 py-3 shrink-0">
        <h3 className="font-semibold text-slate-800">📑 Summary Agent</h3>
        <p className="text-xs text-slate-500">選文件，AI 自動生成多層結構大綱</p>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-0 h-[70vh]">
        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {docs.length === 0 && !summary ? (
          <p className="text-sm text-slate-500">未有上傳文件。請先上傳 PDF 或 Markdown。</p>
        ) : (
          !summary && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">選擇文件</label>
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

        {summary && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
            <div>
              <MarkdownRenderer content={summary} />
              {streaming && (
                <span className="inline-block h-3 w-1.5 animate-pulse bg-indigo-400 align-middle ml-0.5" />
              )}
            </div>
          </div>
        )}
      </div>

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
