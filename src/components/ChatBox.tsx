"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

/** 修正 AI 回傳的 Markdown 常見問題（BOM、\r 換行）
 *  + 將超長 inline code（> 100 char）自動升級為 fenced code block
 *  + 修復 streaming token boundary 導致缺 space 問題 */
function normalizeMarkdown(text: string): string {
  const normalized = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\uFEFF/g, "")
    // Fix missing spaces: lowercase letter immediately followed by uppercase (e.g. "haveAny" → "have Any")
    // but NOT inside URLs or camelCase identifiers in code — only in plain prose
    .replace(/([a-z])([A-Z][a-z])/g, "$1 $2");

  // 將超長 inline code 轉為 fenced block（避免超長 monospace 字串）
  return normalized.replace(/`([^`\n]{100,})`/g, (_match, inner) => {
    const formatted = inner
      .replace(/\s*\|\s*↳\s*/g, "\n↳ ")
      .replace(/\s*\|\s*/g, "\n");
    return "```\n" + formatted + "\n```";
  });
}

/** Custom renderers — 唔依賴 @tailwindcss/typography，
 *  直接用 Tailwind utility + inline style 確保 Turbopack 兼容 */
const markdownComponents: Components = {
  // Headings
  h1: ({ children }) => (
    <h1 className="text-xl font-bold text-slate-900 mt-4 mb-2 border-b border-slate-200 pb-1">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-lg font-semibold text-slate-900 mt-3 mb-1.5">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-base font-semibold text-slate-800 mt-2.5 mb-1">{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-sm font-semibold text-slate-800 mt-2 mb-1">{children}</h4>
  ),

  // Paragraph
  p: ({ children }) => (
    <p className="text-sm text-slate-800 leading-relaxed my-2">{children}</p>
  ),

  // Code — inline vs block
  code: ({ className, children, ...props }) => {
    const isBlock = Boolean(className); // e.g. "language-java"
    const lang = (className ?? "").replace("language-", "");
    if (isBlock) {
      // Plain diagram / no-language fenced block → wrap lines for readability
      const isPlain = !lang;
      return (
        <div className="my-2 rounded-md overflow-hidden border border-slate-600">
          {lang && (
            <div className="bg-slate-700 text-slate-300 text-xs px-3 py-1 font-mono">
              {lang}
            </div>
          )}
          <pre
            className="bg-slate-800 text-slate-100 text-xs p-3 leading-relaxed"
            style={{
              whiteSpace: isPlain ? "pre-wrap" : "pre",
              overflowX: isPlain ? "hidden" : "auto",
              wordBreak: isPlain ? "break-word" : "normal",
            }}
          >
            <code>{children}</code>
          </pre>
        </div>
      );
    }
    // Inline code — allow wrapping so long flow strings don't overflow
    return (
      <code
        className="bg-slate-100 text-indigo-700 border border-slate-300 text-xs px-1.5 py-0.5 rounded font-mono break-words"
        style={{ whiteSpace: "normal" }}
        {...props}
      >
        {children}
      </code>
    );
  },

  // pre — 交由 code renderer 處理，pre 本身唔額外 wrap
  pre: ({ children }) => <>{children}</>,

  // Lists
  ul: ({ children }) => (
    <ul className="list-disc list-outside pl-5 my-2 space-y-1 text-sm text-slate-800">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-outside pl-5 my-2 space-y-1 text-sm text-slate-800">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="text-sm text-slate-800 leading-relaxed">{children}</li>,

  // Table — 橫向 scroll 處理長表格
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto rounded-md border border-slate-300">
      <table className="min-w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-slate-100">{children}</thead>,
  tbody: ({ children }) => <tbody className="divide-y divide-slate-200">{children}</tbody>,
  tr: ({ children }) => <tr className="hover:bg-slate-50 transition-colors">{children}</tr>,
  th: ({ children }) => (
    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700 border-r border-slate-300 last:border-r-0">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2 text-sm text-slate-800 border-r border-slate-200 last:border-r-0">
      {children}
    </td>
  ),

  // Blockquote
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-indigo-400 pl-3 my-2 text-slate-600 italic text-sm bg-slate-50 py-1 rounded-r">
      {children}
    </blockquote>
  ),

  // Horizontal rule
  hr: () => <hr className="my-3 border-slate-300" />,

  // Links
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-indigo-600 underline hover:text-indigo-800"
    >
      {children}
    </a>
  ),

  // Strong / em
  strong: ({ children }) => (
    <strong className="font-semibold text-slate-900">{children}</strong>
  ),
  em: ({ children }) => <em className="italic text-slate-700">{children}</em>,
};

/** 單一對話訊息 */
interface Message {
  /** 發送者角色 */
  role: "user" | "assistant";
  /** 訊息內容（Markdown 格式） */
  content: string;
}

/**
 * AI 複習聊天介面 — streaming SSE 回應 + Markdown 渲染。
 * 透過 `/api/chat` 執行 RAG 查詢。
 */
export function ChatBox() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  /**
   * 處理聊天表單提交 — streaming fetch + 逐字渲染。
   *
   * @remarks
   * 舊版 React 的 `React.FormEvent`（無型別參數）已棄用，
   * 請始終使用 `React.FormEvent<HTMLFormElement>`。
   *
   * @deprecated 舊寫法 `React.FormEvent` — 已升級為 `React.FormEvent<HTMLFormElement>`
   */
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: "user", content: input.trim() };
    const allMessages = [...messages, userMessage];
    setMessages(allMessages);
    setInput("");
    setLoading(true);
    setStreamingContent("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: allMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || "Chat failed");
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
              setStreamingContent(accumulated);
            }
            if (parsed.done) break;
          } catch (parseErr) {
            console.warn("Stream parse warn:", parseErr);
          }
        }
      }

      setMessages((prev) => [...prev, { role: "assistant", content: accumulated }]);
      setStreamingContent("");
    } catch (err) {
      setStreamingContent("");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `錯誤：${err instanceof Error ? err.message : "無法取得回覆"}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col rounded-lg border border-slate-200 bg-white shadow-sm h-full">
      {/* Header */}
      <div className="border-b border-slate-200 px-5 py-3 shrink-0">
        <h3 className="font-semibold text-slate-800">AI 複習助手</h3>
        <p className="text-xs text-slate-500">根據已上傳的 PDF 或 Markdown 內容回答問題</p>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0 h-[70vh]">
        {messages.length === 0 && !streamingContent && (
          <p className="text-center text-sm text-slate-500 mt-8">
            輸入問題開始複習，例如：「這份教材的重點是什麼？」
          </p>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`rounded-lg px-4 py-2.5 ${
                m.role === "user"
                  ? "max-w-[70%] bg-indigo-600 text-white text-sm"
                  : "w-full bg-slate-50 border border-slate-200"
              }`}
            >
              {m.role === "assistant" ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={markdownComponents}
                >
                  {normalizeMarkdown(m.content)}
                </ReactMarkdown>
              ) : (
                <p className="whitespace-pre-wrap">{m.content}</p>
              )}
            </div>
          </div>
        ))}

        {/* Streaming bubble */}
        {streamingContent && (
          <div className="flex justify-start">
            <div className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={markdownComponents}
              >
                {normalizeMarkdown(streamingContent)}
              </ReactMarkdown>
              <span className="inline-block h-3 w-1.5 animate-pulse bg-indigo-400 align-middle ml-0.5 mt-1" />
            </div>
          </div>
        )}

        {/* Loading indicator */}
        {loading && !streamingContent && (
          <div className="flex justify-start">
            <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3">
              <div className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:0ms]" />
                <span className="inline-block h-2 w-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:150ms]" />
                <span className="inline-block h-2 w-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input form */}
      <form onSubmit={handleSubmit} className="border-t border-slate-200 p-4 shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="輸入問題..."
            className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            送出
          </button>
        </div>
      </form>
    </div>
  );
}
