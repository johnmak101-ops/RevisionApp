"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

// ─── Markdown normaliser ────────────────────────────────────────────────────
function normalizeMarkdown(text: string): string {
  let out = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\uFEFF/g, "");

  // 1. Fix inline triple-backtick code blocks: ```lang code here```
  //    (LLM sometimes omits newlines after the language identifier)
  out = out.replace(
    /```([a-zA-Z]*)[ \t]+([^`]+?)```/g,
    (_m, lang, code) => `\n\`\`\`${lang}\n${code.trim()}\n\`\`\`\n`
  );

  // 2. Remove empty or whitespace-only fenced code blocks
  //    e.g. ```THESE\n``` or ```\n   \n```
  out = out.replace(/```[a-zA-Z]*\n\s*```/g, "");

  // 3. Convert long single-backtick inline code to fenced blocks
  out = out.replace(/`([^`\n]{100,})`/g, (_match, inner) => {
    const formatted = inner
      .replace(/\s*\|\s*↳\s*/g, "\n↳ ")
      .replace(/\s*\|\s*/g, "\n");
    return "```\n" + formatted + "\n```";
  });

  return out;
}

// ─── Code Block with per-block copy ─────────────────────────────────────────
function CodeBlock({
  lang,
  children,
}: {
  lang: string;
  children: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  const codeText =
    typeof children === "string" ? children : String(children ?? "");

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(codeText.replace(/\n$/, ""));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [codeText]);

  const isPlain = !lang;

  return (
    <div className="my-3 rounded-lg overflow-hidden border border-zinc-200 bg-zinc-50 shadow-sm text-[0.82rem] leading-relaxed font-mono">
      {/* toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-100 border-b border-zinc-200">
        <span className="text-[0.7rem] font-sans font-medium text-zinc-500 uppercase tracking-widest select-none">
          {lang || "code"}
        </span>
        <button
          onClick={handleCopy}
          title="Copy code"
          className="flex items-center gap-1 text-[0.7rem] font-sans text-zinc-400 hover:text-zinc-700 transition-colors px-1.5 py-0.5 rounded hover:bg-zinc-200"
        >
          {copied ? (
            <>
              <svg
                className="w-3 h-3 text-emerald-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span className="text-emerald-500">Copied!</span>
            </>
          ) : (
            <>
              <svg
                className="w-3 h-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <rect
                  x="9"
                  y="9"
                  width="13"
                  height="13"
                  rx="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"
                />
              </svg>
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      {/* code body */}
      <pre
        className="px-4 py-3 text-zinc-800 overflow-x-auto"
        style={{
          whiteSpace: isPlain ? "pre-wrap" : "pre",
          wordBreak: isPlain ? "break-word" : "normal",
        }}
      >
        <code>{children}</code>
      </pre>
    </div>
  );
}

// ─── Markdown renderers ─────────────────────────────────────────────────────
const markdownComponents: Components = {
  h1: ({ children }) => (
    <h1 className="text-lg font-bold text-slate-900 mt-5 mb-2 pb-1.5 border-b-2 border-indigo-200">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-base font-semibold text-indigo-900 mt-4 mb-2 flex items-center gap-2">
      <span className="inline-block w-1 h-4 bg-gradient-to-b from-indigo-400 to-purple-400 rounded-full" />
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-sm font-semibold text-slate-700 mt-3 mb-1.5 uppercase tracking-wide text-[0.72rem] text-indigo-600">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-sm font-semibold text-slate-700 mt-2 mb-1">{children}</h4>
  ),

  p: ({ children }) => (
    <p className="text-[0.84rem] text-slate-700 leading-[1.75] my-1.5 first:mt-0 last:mb-0">{children}</p>
  ),

  code: ({ className, children, ...props }) => {
    const isBlock = Boolean(className);
    const lang = (className ?? "").replace("language-", "");
    if (isBlock) {
      return <CodeBlock lang={lang}>{children}</CodeBlock>;
    }
    return (
      <code
        className="bg-indigo-50 text-indigo-700 border border-indigo-100 text-[0.78em] px-1.5 py-0.5 rounded-md font-mono break-words"
        style={{ whiteSpace: "normal" }}
        {...props}
      >
        {children}
      </code>
    );
  },

  pre: ({ children }) => <>{children}</>,

  ul: ({ children }) => (
    <ul className="list-none pl-0 my-2 space-y-1 text-sm">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-outside pl-5 my-2 space-y-1 text-[0.84rem] text-slate-700">
      {children}
    </ol>
  ),
  li: (props) => {
    const { children } = props;
    const ordered = (props as typeof props & { ordered?: boolean }).ordered;
    return ordered ? (
      <li className="text-[0.84rem] text-slate-700 leading-relaxed pl-0.5 [&>p]:my-0">
        {children}
      </li>
    ) : (
      <li className="flex gap-2.5 items-start text-[0.84rem] text-slate-700 leading-relaxed [&>p]:my-0">
        <span className="mt-[0.42rem] w-1.5 h-1.5 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 shrink-0" />
        <span>{children}</span>
      </li>
    );
  },

  table: ({ children }) => (
    <div className="my-3 overflow-x-auto rounded-xl border border-indigo-100 shadow-sm">
      <table className="min-w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-gradient-to-r from-indigo-50 to-purple-50">{children}</thead>
  ),
  tbody: ({ children }) => (
    <tbody className="divide-y divide-slate-100">{children}</tbody>
  ),
  tr: ({ children }) => (
    <tr className="hover:bg-indigo-50/40 transition-colors">{children}</tr>
  ),
  th: ({ children }) => (
    <th className="px-3 py-2 text-left text-xs font-semibold text-indigo-700 border-r border-indigo-100 last:border-r-0">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2 text-sm text-slate-800 border-r border-slate-100 last:border-r-0">
      {children}
    </td>
  ),

  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-indigo-400 pl-4 my-3 text-slate-600 italic text-sm bg-gradient-to-r from-indigo-50/70 to-transparent py-2.5 pr-3 rounded-r-xl">
      {children}
    </blockquote>
  ),

  hr: () => <hr className="my-4 border-indigo-100" />,

  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-indigo-600 underline underline-offset-2 hover:text-indigo-800 transition-colors"
    >
      {children}
    </a>
  ),

  strong: ({ children }) => (
    <strong className="font-semibold text-slate-900">{children}</strong>
  ),
  em: ({ children }) => <em className="italic text-slate-500">{children}</em>,
};

// ─── Types ──────────────────────────────────────────────────────────────────
interface Message {
  role: "user" | "assistant";
  content: string;
}

// ─── Sub-components ─────────────────────────────────────────────────────────

/** AI avatar badge */
function AIAvatar() {
  return (
    <div className="shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">
      <span className="text-white text-xs font-bold">AI</span>
    </div>
  );
}

/** Copy whole message button */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      title="複製回覆"
      className="opacity-0 group-hover:opacity-100 transition-opacity ml-auto shrink-0 p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-700"
    >
      {copied ? (
        <svg
          className="w-3.5 h-3.5 text-green-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <rect
            x="9"
            y="9"
            width="13"
            height="13"
            rx="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"
          />
        </svg>
      )}
    </button>
  );
}

/** AI message bubble — premium indigo-tinted card */
function AssistantBubble({
  content,
  isStreaming = false,
}: {
  content: string;
  isStreaming?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 group">
      <AIAvatar />
      <div className="flex-1 min-w-0">
        {/* card */}
        <div
          className="relative rounded-2xl rounded-tl-none overflow-hidden
            border border-indigo-100
            bg-gradient-to-br from-white via-indigo-50/30 to-white
            shadow-[0_2px_12px_0_rgba(99,102,241,0.08)]"
        >
          {/* left accent stripe */}
          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-indigo-400 to-purple-400" />

          {/* content */}
          <div className="pl-4 pr-4 pt-3 pb-2">
            <div className="flex items-start gap-1">
              <div className="flex-1 min-w-0">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={markdownComponents}
                >
                  {normalizeMarkdown(content)}
                </ReactMarkdown>
              </div>
              {!isStreaming && <CopyButton text={content} />}
            </div>

            {/* streaming cursor */}
            {isStreaming && (
              <span className="inline-flex gap-1 mt-2 ml-0.5 items-end h-3.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:0ms]" />
                <span className="inline-block w-1.5 h-2 rounded-full bg-purple-400 animate-bounce [animation-delay:120ms]" />
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:240ms]" />
              </span>
            )}
          </div>

          {/* footer badge */}
          {!isStreaming && (
            <div className="px-4 py-1.5 border-t border-indigo-50 bg-indigo-50/50 flex items-center gap-1.5">
              <span className="text-[0.65rem] text-indigo-400 select-none">📚 Based on your documents</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** User message bubble */
function UserBubble({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[72%] rounded-2xl rounded-tr-sm bg-gradient-to-br from-indigo-600 to-indigo-700 text-white px-4 py-2.5 shadow-sm">
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  );
}

/** Typing indicator (pre-stream) */
function TypingIndicator() {
  return (
    <div className="flex items-start gap-3">
      <AIAvatar />
      <div
        className="rounded-2xl rounded-tl-none border border-indigo-100
          bg-gradient-to-br from-white via-indigo-50/30 to-white
          shadow-[0_2px_12px_0_rgba(99,102,241,0.08)]
          px-5 py-3.5"
      >
        <div className="flex items-center gap-2.5">
          <span className="inline-flex gap-1.5 items-end">
            <span className="inline-block h-2 w-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:0ms]" />
            <span className="inline-block h-2.5 w-2 rounded-full bg-purple-400 animate-bounce [animation-delay:150ms]" />
            <span className="inline-block h-2 w-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:300ms]" />
          </span>
          <span className="text-xs text-indigo-400 animate-pulse">Thinking…</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────
export function ChatBox() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

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
              // ── Token space guard ────────────────────────────────────────
              // LLM tokenisers sometimes omit the leading space of a token
              // (e.g. " you" gets split into "" + "you") causing run-together
              // words like "excerptsyou". We inject a space whenever:
              //   • accumulated ends with a word char (letter / digit)
              //   • AND the incoming token starts with a word char
              //   • AND the token has NO leading whitespace of its own
              const needsSpace =
                accumulated.length > 0 &&
                /\w$/.test(accumulated) &&
                /^\w/.test(parsed.token);
              accumulated += needsSpace ? " " + parsed.token : parsed.token;
              setStreamingContent(accumulated);
            }
            if (parsed.done) break;
          } catch (parseErr) {
            console.warn("Stream parse warn:", parseErr);
          }
        }
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: accumulated },
      ]);
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
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-slate-50 shadow-sm h-full overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-5 py-3 shrink-0 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">
          <span className="text-white text-xs font-bold">AI</span>
        </div>
        <div>
          <h3 className="font-semibold text-slate-800 text-sm">AI 複習助手</h3>
          <p className="text-xs text-slate-500">
            根據已上傳的 PDF 或 Markdown 內容回答問題
          </p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="ml-auto text-xs text-slate-400 hover:text-slate-600 transition-colors px-2 py-1 rounded-md hover:bg-slate-100"
          >
            清除對話
          </button>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0 h-[70vh]">
        {messages.length === 0 && !streamingContent && (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-12">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
              <span className="text-2xl">💬</span>
            </div>
            <p className="text-sm text-slate-500 text-center max-w-xs">
              輸入問題開始複習
              <br />
              <span className="text-xs text-slate-400">
                例如：「這份教材嘅重點係咩？」
              </span>
            </p>
          </div>
        )}

        {messages.map((m, i) =>
          m.role === "user" ? (
            <UserBubble key={i} content={m.content} />
          ) : (
            <AssistantBubble key={i} content={m.content} />
          )
        )}

        {streamingContent && (
          <AssistantBubble content={streamingContent} isStreaming />
        )}

        {loading && !streamingContent && <TypingIndicator />}

        <div ref={bottomRef} />
      </div>

      {/* Input form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white border-t border-slate-200 px-4 py-3 shrink-0"
      >
        <div className="flex gap-2 items-end">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="輸入問題..."
            className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all bg-slate-50 focus:bg-white"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 px-5 py-2.5 text-sm font-medium text-white hover:from-indigo-700 hover:to-indigo-800 disabled:opacity-40 transition-all shadow-sm hover:shadow"
          >
            送出
          </button>
        </div>
      </form>
    </div>
  );
}
