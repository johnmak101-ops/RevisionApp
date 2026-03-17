import { NextRequest } from "next/server";
import { vectorSearch } from "@/lib/search";
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence } from "@langchain/core/runnables";

/**
 * @module chat/route
 *
 * Streaming RAG chat API — 用 LangChain 做 retrieval-augmented generation。
 * 回傳 NDJSON streaming `{ token }` chunks。
 */

// ─────────────────────────────────────────────
// LLM singleton（唔每次 request 重建）
// ─────────────────────────────────────────────
/** System prompt — 限制 AI 只能根據文件上下文作答 */
const SYSTEM_TEMPLATE = `You are a helpful revision assistant for Bootcamp course materials. Always respond in the same language the user is writing in — if they write in English, reply in English; if they write in Traditional Chinese, reply in Traditional Chinese; and so on. Answer ONLY based on the provided context from the user's uploaded PDFs or Markdown files. Do NOT use any general knowledge or make up examples that are not present in the context. If the context is empty or does not contain enough information to answer the question, say so clearly and ask the user to upload relevant documents. Be concise and educational.

Context from documents:
{context}`;

/** OpenRouter LLM singleton — streaming 模式 */
const llm = new ChatOpenAI({
  model: process.env.OPENROUTER_MODEL ?? "openai/gpt-oss-120b:free",
  apiKey: process.env.OPENROUTER_API_KEY,
  configuration: {
    baseURL: "https://openrouter.ai/api/v1",
  },
  maxRetries: 2,
  streaming: true,
});

// ─────────────────────────────────────────────
// Prompt + Chain（module 頂層建立一次）
// ─────────────────────────────────────────────
const promptTemplate = ChatPromptTemplate.fromMessages([
  ["system", SYSTEM_TEMPLATE],
  new MessagesPlaceholder("history"),
  ["human", "{question}"],
]);

const outputParser = new StringOutputParser();
const chain = RunnableSequence.from([promptTemplate, llm, outputParser]);

/** 保留的歷史訊息上限（防止 token 過多） */
const MAX_HISTORY_MESSAGES = 6;
/** Vector search 最低相關分數門檻 */
const MIN_VECTOR_SCORE = 0.4;

/**
 * 將前端 `{ role, content }[]` 轉換為 LangChain message 物件。
 * @param msgs - 前端格式的對話歷史
 * @param maxCount - 最多保留幾條
 */
function toLCMessages(
  msgs: { role: string; content: string }[],
  maxCount: number
) {
  return msgs.slice(-maxCount).map((m) => {
    if (m.role === "user") return new HumanMessage(m.content);
    if (m.role === "assistant") return new AIMessage(m.content);
    return new SystemMessage(m.content);
  });
}

/**
 * `POST /api/chat` — Streaming RAG chat handler。
 *
 * 流程：取最新用戶訊息 → vectorSearch → 組合 context → LLM chain → stream NDJSON。
 */
export async function POST(request: NextRequest) {
  const { messages } = (await request.json()) as {
    messages: { role: string; content: string }[];
  };

  if (!messages?.length) {
    return new Response(JSON.stringify({ error: "Messages required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const lastUser = messages.filter((m) => m.role === "user").pop();
  if (!lastUser?.content) {
    return new Response(JSON.stringify({ error: "Last user message required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // ── Retrieval ────────────────────────────────
  let results;
  try {
    results = await vectorSearch(lastUser.content, 5);
  } catch (searchErr) {
    const errMsg = searchErr instanceof Error ? searchErr.message : "Search failed";
    console.error("[Chat] vectorSearch error:", errMsg);
    const errorResponse =
      JSON.stringify({
        token: "⚠️ 搜尋系統暫時出錯，請稍後再試。",
      }) +
      "\n" +
      JSON.stringify({ done: true }) +
      "\n";
    return new Response(errorResponse, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  }

  const relevantResults = results.filter((r) => (r.score ?? 1) >= MIN_VECTOR_SCORE);
  if (relevantResults.length === 0) {
    const noCtxMsg = JSON.stringify({ token: "⚠️ 冇搵到相關文件內容。請先上傳相關嘅 PDF 或 Markdown 檔案，再問呢個問題。" }) + "\n" +
      JSON.stringify({ done: true }) + "\n";
    return new Response(noCtxMsg, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  }

  const context = relevantResults
    .map((r) => `[Page ${r.page}]\n${r.content}`)
    .join("\n\n---\n\n");

  const historyMessages = messages.slice(0, -1);
  const history = toLCMessages(historyMessages, MAX_HISTORY_MESSAGES);

  const chainInput = {
    context,
    history,
    question: lastUser.content,
  };

  // ── Build streaming ReadableStream ───────────
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendChunk = (token: string) => {
        controller.enqueue(encoder.encode(JSON.stringify({ token }) + "\n"));
      };

      try {
        const langStream = await chain.stream(chainInput);
        for await (const chunk of langStream) {
          sendChunk(chunk);
        }
        controller.enqueue(encoder.encode(JSON.stringify({ done: true }) + "\n"));
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Chat failed";
        controller.enqueue(encoder.encode(JSON.stringify({ error: msg }) + "\n"));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
      "X-Accel-Buffering": "no",
      "Cache-Control": "no-cache",
    },
  });
}
