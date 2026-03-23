import { NextRequest } from "next/server";
import { multiQuerySearch } from "@/lib/search";
import { streamingLLM } from "@/lib/llm";
import { guardUserMessage } from "@/lib/promptGuard";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rateLimiter";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { HumanMessage, AIMessage, AIMessageChunk, SystemMessage } from "@langchain/core/messages";

import { RunnableSequence } from "@langchain/core/runnables";
import { toUIMessageStream } from "@ai-sdk/langchain";
import { createUIMessageStreamResponse, UIMessage } from "ai";

/**
 * @module chat/route
 *
 * Streaming RAG chat API — 用 LangChain 做 retrieval-augmented generation。
 * 使用 Vercel AI SDK 嘅 `createUIMessageStreamResponse` 同 `toUIMessageStream` 做 streaming。
 */


/** System prompt — 教學為主，唔好做 meta-summary */
const SYSTEM_TEMPLATE = `# Role
You are a patient, expert revision tutor specialising in Bootcamp course materials.
Your students are beginners who need clear, encouraging explanations — not lectures.
Your job is to **teach the concepts**, not just describe what the materials contain.

# Language Rule
ALWAYS respond in the SAME language the student writes in.
- English question → English answer
- 繁體中文問題 → 繁體中文回答

# Critical Anti-Meta Rule
NEVER write meta-commentary about the uploaded materials. Treat the context as your own knowledge and teach directly from it.

❌ BAD (meta-commentary):
- "The uploaded material covers primitive data types on page 4."
- "Page 28 explains type casting."
- "The context includes a section on..."

✅ GOOD (direct teaching):
- "Java has 8 primitive data types: \`int\`, \`double\`, \`boolean\`, \`char\`, \`byte\`, \`short\`, \`long\`, and \`float\`."
- "Type casting lets you convert a value from one type to another."

# Objective
Help the student **understand and remember** the concepts by:
1. Explaining ideas in plain language with analogies where helpful.
2. Walking through each sub-concept with concrete details and examples FROM the context.
3. Connecting related concepts together so the student sees the big picture.

# Reasoning Steps (follow every time)
Before writing your answer, silently work through these steps:
1. **Identify** — What specific topic or concept is the student asking about?
2. **Locate** — Find all relevant details, definitions, and examples in the context.
3. **Organise** — Group related points; decide on a logical teaching order.
4. **Teach** — Explain each concept as if lecturing to a beginner. Include definitions, how it works, and examples.
5. **Verify** — Check that every claim and code example comes from the context.

# Output Format
Structure every answer with these parts in order:

1. **Opening paragraph** (NO heading, NO bold label) — Start your response immediately with 1–2 plain sentences that answer the question. Example:
   "A data type defines what kind of value a variable can hold and how much memory it uses."

2. **Explanation sections** — Use ### or #### headings to teach each sub-topic. Cover:
   - What the concept IS (definition)
   - How it works (mechanics)
   - Why it matters or when to use it

3. **Code examples** — If the context contains code, include it in fenced code blocks and explain what each line does.

4. **Closing line** — End with exactly ONE line in this format (bold label + summary, same line):
   **Key Takeaway:** In short, Java has eight primitive types…
   Do NOT repeat this line. Do NOT use a heading for it.

# Context Coverage Rules
| Situation | What to do |
|-----------|-----------|
| Context fully covers the question | Teach the concepts using context as your knowledge base |
| Context partially covers it | Teach what you can, then add: "⚠️ The uploaded materials only cover [X]; they don't include [Y]. You may want to upload additional pages if you need that information." |
| Context is empty / totally unrelated | Reply: "I don't have enough material to answer this. Please upload the relevant PDF or Markdown first." |

# Formatting Rules
## Code Blocks
- ALL code (declarations, method calls, statements, examples) MUST use fenced code blocks with the language name:
  \`\`\`java
  int count = 10;
  \`\`\`
- NEVER put code and the language tag on the same line as the opening backticks.
- Use inline \`backticks\` ONLY for single identifiers (e.g. \`int\`, \`main\`, \`byte\`), never for full statements.
- NEVER produce an empty code block.
- Do NOT use generic words like 'THESE' as a language identifier.

## Tables
- Render tables as **native Markdown tables** — NEVER wrap them inside \`\`\` code fences.
- Every table MUST have a header row, a separator row (|---|---|), and at least one data row.
- NEVER include a column that has empty cells — every column must contain meaningful data in every row.
- If information is already covered by another column, do NOT add a redundant column.
- Always leave a BLANK LINE before and after a table.
- NEVER place a table on the same line as a heading.

❌ BAD (empty column):

| type | size           | range       | bytes |
|------|----------------|-------------|-------|
| int  | 32 bits/4 Bytes| -2B to 2B   |       |

✅ GOOD (no empty columns):

| type | size            | range       |
|------|-----------------|-------------|
| int  | 32 bits/4 Bytes | -2B to 2B   |

## General
- Headings MUST have a space after the \`#\` symbols: write \`### Opening\`, NEVER \`###Opening\`.
- Body text MUST NEVER appear on the same line as a heading. Always put body text on a NEW LINE after the heading.
- Always leave a BLANK LINE after every heading (### ...) before the next content.
- NEVER use \`---\` horizontal rules in your response. Use headings (###) to separate sections instead.
- Never merge two words together without a space (e.g. write "A data type", not "Adata type").

## Code Fence Rules
- Opening \`\`\`\`\`\` and closing \`\`\`\`\`\` MUST each be on their OWN line with NO other text.
- NEVER put code on the same line as the closing \`\`\`\`\`\`.

❌ BAD:
int x = 9;\`\`\`

✅ GOOD:
int x = 9;
\`\`\`

# Guardrails
- NEVER reference page numbers, sections, or "the uploaded material" in your explanation. Just teach.
- NEVER invent facts, code, or examples not supported by the context.
- NEVER copy the context verbatim — always synthesise and paraphrase.
- NEVER answer questions unrelated to the course material (e.g. personal advice, off-topic trivia). Politely redirect.
- If the student seems confused, offer to re-explain in simpler terms.

# Context from uploaded documents
{context}`;

// ─────────────────────────────────────────────
// Prompt + Chain（module 頂層建立一次）
// ─────────────────────────────────────────────
const promptTemplate = ChatPromptTemplate.fromMessages([
  ["system", SYSTEM_TEMPLATE],
  new MessagesPlaceholder("history"),
  ["human", "{question}"],
]);

const chain = RunnableSequence.from([promptTemplate, streamingLLM]);

/** 保留的歷史訊息上限（防止 token 過多） */
const MAX_HISTORY_MESSAGES = 10;
/** Vector search 最低相關分數門檻 */
const MIN_VECTOR_SCORE = 0.40;

/**
 * 將前端 `UIMessage[]` 轉換為 LangChain message 物件。
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
 * 從 UIMessage 中提取純文字內容。
 * UIMessage 用 parts 陣列儲存內容，每個 part 可能係 text / tool-call 等。
 */
function extractTextFromUIMessage(msg: UIMessage): string {
  if (msg.parts && msg.parts.length > 0) {
    return msg.parts
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("");
  }
  // Fallback: older clients may still send content string
  return (msg as UIMessage & { content?: string }).content ?? "";
}

/**
 * 回傳純文字 streaming response（用於 early-return error messages）。
 * 用 toUIMessageStream 包裝一個 async generator（同 LangChain stream 格式一樣），
 * 令前端 useChat 可以正確接收。
 */
function textMessageResponse(text: string) {
  async function* singleChunk() {
    yield new AIMessageChunk(text);
  }

  return createUIMessageStreamResponse({
    stream: toUIMessageStream(singleChunk()),
  });
}

/**
 * `POST /api/chat` — Streaming RAG chat handler。
 *
 * 流程：取最新用戶訊息 → vectorSearch → 組合 context → LLM chain → stream via AI SDK。
 */
export async function POST(request: NextRequest) {
  // ── Rate Limiting ─────────────────────────────
  const clientIp = getClientIp(request);
  const rateCheck = checkRateLimit(`${clientIp}:chat`, RATE_LIMITS.chat);
  if (!rateCheck.allowed) {
    return new Response(
      JSON.stringify({ error: "Too many requests. Please try again later." }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(Math.ceil((rateCheck.retryAfterMs ?? 60000) / 1000)),
        },
      }
    );
  }

  const { messages } = (await request.json()) as {
    messages: UIMessage[];
  };

  if (!messages?.length) {
    return new Response(JSON.stringify({ error: "Messages required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const lastUserText = lastUser ? extractTextFromUIMessage(lastUser) : "";

  if (!lastUserText) {
    return new Response(JSON.stringify({ error: "Last user message required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // ── Prompt Injection Guard ──────────────────────
  const guard = guardUserMessage(lastUserText);
  if (!guard.safe) {
    return textMessageResponse(`⚠️ ${guard.reason}`);
  }
  const safeUserText = guard.sanitizedText!;

  // ── Retrieval ────────────────────────────────
  let results;
  try {
    results = await multiQuerySearch(safeUserText);
  } catch (searchErr) {
    const errMsg = searchErr instanceof Error ? searchErr.message : "Search failed";
    console.error("[Chat] vectorSearch error:", errMsg);
    return textMessageResponse("⚠️ 搜尋系統暫時出錯，請稍後再試。");
  }

  const relevantResults = results.filter((r) => (r.score ?? 1) >= MIN_VECTOR_SCORE);
  if (relevantResults.length === 0) {
    return textMessageResponse("⚠️ 冇搵到相關文件內容。請先上傳相關嘅 PDF 或 Markdown 檔案，再問呢個問題。");
  }

  const context = relevantResults
    .map((r) => `[Page ${r.page}]\n${r.content}`)
    .join("\n\n════════════════\n\n");

  // Build history from all messages except the last user message
  const historyMessages = messages.slice(0, -1).map((m) => ({
    role: m.role,
    content: extractTextFromUIMessage(m),
  }));
  const history = toLCMessages(historyMessages, MAX_HISTORY_MESSAGES);

  const chainInput = {
    context,
    history,
    question: safeUserText,
  };

  // ── Stream via AI SDK ───────────────────────
  const langStream = await chain.stream(chainInput);

  return createUIMessageStreamResponse({
    stream: toUIMessageStream(langStream),
  });
}
