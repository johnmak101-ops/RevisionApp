import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { Chunk } from "@/models/Chunk";
import { ChatOpenAI } from "@langchain/openai";
import { StringOutputParser } from "@langchain/core/output_parsers";

/**
 * @module summary/generate/route
 *
 * Streaming 大綱生成 API — 將文件 chunks 餵入 LLM 產生結構化 Markdown 大綱。
 */

/** OpenRouter LLM singleton — streaming 模式 */
const llm = new ChatOpenAI({
  model: process.env.OPENROUTER_MODEL ?? "openai/gpt-oss-120b:free",
  apiKey: process.env.OPENROUTER_API_KEY,
  configuration: { baseURL: "https://openrouter.ai/api/v1" },
  maxRetries: 2,
  streaming: true,
});

const outputParser = new StringOutputParser();

/** LLM prompt — 要求以 Markdown 格式生成多層大綱 */
const SUMMARY_PROMPT = `You are an expert at creating structured study outlines. Based on the following course material, create a multi-level summary in Markdown format.

RULES:
1. Use the same language as the source material
2. Organize by chapters/sections with clear hierarchy
3. Use ## for chapters, ### for sections, - for key points
4. Be concise but cover all important concepts
5. Include important definitions, formulas, and examples
6. Add 🔑 emoji before the most critical points

CONTENT:
{context}`;

/**
 * `POST /api/summary/generate` — Streaming 生成文件大綱。
 *
 * @body `{ documentId: string }`
 * @returns NDJSON stream `{ token }` → `{ done: true }`
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { documentId?: string };

    if (!body.documentId) {
      return new Response(
        JSON.stringify({ error: "請指定文件 documentId" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    await connectDB();

    const chunks = await Chunk.find({ pdfId: body.documentId })
      .sort({ page: 1, chunkIndex: 1 })
      .select("content page")
      .lean();

    if (chunks.length === 0) {
      return new Response(
        JSON.stringify({ error: "搵唔到呢份文件嘅內容" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // 組合 context
    const MAX_CONTEXT_CHARS = 20000;
    let context = "";
    for (const chunk of chunks) {
      if (context.length + chunk.content.length > MAX_CONTEXT_CHARS) break;
      context += `[Page ${chunk.page}]\n${chunk.content}\n\n`;
    }

    const prompt = SUMMARY_PROMPT.replace("{context}", context);

    // Streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendChunk = (token: string) => {
          controller.enqueue(encoder.encode(JSON.stringify({ token }) + "\n"));
        };

        try {
          const langStream = await llm.pipe(outputParser).stream(prompt);
          for await (const chunk of langStream) {
            sendChunk(chunk);
          }
          controller.enqueue(
            encoder.encode(JSON.stringify({ done: true }) + "\n")
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Summary failed";
          controller.enqueue(
            encoder.encode(JSON.stringify({ error: msg }) + "\n")
          );
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
  } catch (err) {
    console.error("[Summary] generate error:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "生成大綱失敗",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
