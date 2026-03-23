"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import MarkdownRenderer from "@/components/MarkdownRendererDynamic";

function getMessageText(
  parts: Array<{ type: string; text?: string }>
): string {
  return parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text" && !!p.text)
    .map((p) => p.text)
    .join("");
}

function AIAvatar() {
  return (
    <div className="shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">
      <span className="text-white text-xs font-bold">AI</span>
    </div>
  );
}

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
        <svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <rect x="9" y="9" width="13" height="13" rx="2" strokeLinecap="round" strokeLinejoin="round" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
        </svg>
      )}
    </button>
  );
}

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
        <div
          className="relative rounded-2xl rounded-tl-none overflow-hidden
            border border-indigo-100
            bg-gradient-to-br from-white via-indigo-50/30 to-white
            shadow-[0_2px_12px_0_rgba(99,102,241,0.08)]"
        >
          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-indigo-400 to-purple-400" />

          <div className="pl-4 pr-4 pt-3 pb-2">
            <div className="flex items-start gap-1">
              <div className="flex-1 min-w-0">
                <MarkdownRenderer content={content} />
              </div>
              {!isStreaming && <CopyButton text={content} />}
            </div>

            {isStreaming && (
              <span className="inline-flex gap-1 mt-2 ml-0.5 items-end h-3.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:0ms]" />
                <span className="inline-block w-1.5 h-2 rounded-full bg-purple-400 animate-bounce [animation-delay:120ms]" />
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:240ms]" />
              </span>
            )}
          </div>

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

function UserBubble({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[72%] rounded-2xl rounded-tr-sm bg-gradient-to-br from-indigo-600 to-indigo-700 text-white px-4 py-2.5 shadow-sm">
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  );
}

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

export function ChatBox() {
  const { messages, sendMessage, status, setMessages, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isLoading = status === "streaming" || status === "submitted";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  useEffect(() => {
    if (status === "ready") {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [status]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input.trim() });
    setInput("");
  };

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-slate-50 shadow-sm h-full overflow-hidden">
      <div className="bg-white border-b border-slate-200 px-5 py-3 shrink-0 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">
          <span className="text-white text-xs font-bold">AI</span>
        </div>
        <div>
          <h3 className="font-semibold text-slate-800 text-sm">AI 複習助手</h3>
          <p className="text-xs text-slate-500">根據已上傳的 PDF 或 Markdown 內容回答問題</p>
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

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0 h-[70vh]">
        {messages.length === 0 && status === "ready" && (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-12">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
              <span className="text-2xl">💬</span>
            </div>
            <p className="text-sm text-slate-500 text-center max-w-xs">
              輸入問題開始複習
              <br />
              <span className="text-xs text-slate-400">例如：「這份教材嘅重點係咩？」</span>
            </p>
          </div>
        )}

        {messages.map((m, i) => {
          const text = getMessageText(m.parts);
          const isLastAssistant = m.role === "assistant" && i === messages.length - 1;
          const isCurrentlyStreaming = isLastAssistant && status === "streaming";

          return m.role === "user" ? (
            <UserBubble key={m.id} content={text} />
          ) : (
            <AssistantBubble key={m.id} content={text} isStreaming={isCurrentlyStreaming} />
          );
        })}

        {status === "submitted" &&
          (messages.length === 0 || messages[messages.length - 1].role === "user") && (
            <TypingIndicator />
          )}

        {error && (
          <AssistantBubble content={`錯誤：${error.message || "無法取得回覆"}`} />
        )}

        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="bg-white border-t border-slate-200 px-4 py-3 shrink-0">
        <div className="flex gap-2 items-end">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="輸入問題..."
            className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all bg-slate-50 focus:bg-white"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 px-5 py-2.5 text-sm font-medium text-white hover:from-indigo-700 hover:to-indigo-800 disabled:opacity-40 transition-all shadow-sm hover:shadow"
          >
            送出
          </button>
        </div>
      </form>
    </div>
  );
}
