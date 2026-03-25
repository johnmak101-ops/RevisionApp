import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Chunk } from "@/models/Chunk";
import { QuizAttempt } from "@/models/QuizAttempt";
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { guardDocumentId } from "@/lib/promptGuard";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rateLimiter";

/**
 * @module quiz/generate/route
 *
 * AI Quiz 生成器 — 取指定文件的 chunks，用 LLM 出 MCQ 題目。
 */

/** OpenRouter LLM — temperature 0.7 增加題目多樣性 */
const llm = new ChatOpenAI({
  model: process.env.OPENROUTER_MODEL ?? "google/gemini-2.5-flash-lite",
  apiKey: process.env.OPENROUTER_API_KEY,
  configuration: { baseURL: "https://openrouter.ai/api/v1" },
  maxRetries: 2,
  temperature: 0.7,
});

/** LLM prompt — ChatPromptTemplate 做 system/user role 分離 */
const quizPromptTemplate = ChatPromptTemplate.fromMessages([
  ["system", `You are a quiz generator. Your job is to create multiple-choice questions STRICTLY based on the document content provided by the user.

RULES:
1. Every question, option, and explanation MUST be based solely on the provided content — NO outside knowledge.
2. "topic" MUST be a heading or subject that literally appears in the content (max 5 words). Do NOT invent topics.
3. Provide exactly 4 options (A–D). All distractors must be plausible but clearly wrong based on the content.
4. Test understanding, not just memorisation.
5. Respond ONLY with a valid JSON array — no markdown fencing, no extra text.

OUTPUT FORMAT:
[{{
  "question": "...",
  "options": ["option A", "option B", "option C", "option D"],
  "correctIndex": 0,
  "topic": "Exact Section Title From Content",
  "explanation": "One sentence citing why the answer is correct, based on the content."
}}]`],
  ["human", "Generate exactly {count} questions from this content:\n\n{context}"],
]);

/**
 * `POST /api/quiz/generate` — 為指定文件生成 MCQ quiz。
 *
 * @body `{ documentId: string, count?: number }`
 * @returns `{ quizId, questions: ClientQuestion[], totalQuestions }`
 */
export async function POST(request: NextRequest) {
  try {
    // ── Rate Limiting ─────────────────────────────
    const clientIp = getClientIp(request);
    const rateCheck = checkRateLimit(`${clientIp}:quiz`, RATE_LIMITS.quiz);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((rateCheck.retryAfterMs ?? 60000) / 1000)),
          },
        }
      );
    }

    const body = (await request.json()) as {
      documentId?: string;
      count?: number;
    };

    // ── Input Validation ─────────────────────────
    if (!body.documentId || !guardDocumentId(body.documentId)) {
      return NextResponse.json(
        { error: "請提供有效嘅文件 documentId" },
        { status: 400 }
      );
    }

    const count = Math.min(Math.max(body.count ?? 5, 3), 15);

    await connectDB();

    // 搵指定文件嘅所有 chunks
    const chunks = await Chunk.find({ pdfId: body.documentId })
      .sort({ page: 1, chunkIndex: 1 })
      .select("content page")
      .lean();

    if (chunks.length === 0) {
      return NextResponse.json(
        { error: "搵唔到呢份文件嘅內容" },
        { status: 404 }
      );
    }

    // 組合 context（限制長度避免 token 過多）
    const MAX_CONTEXT_CHARS = 12000;
    let context = "";
    for (const chunk of chunks) {
      if (context.length + chunk.content.length > MAX_CONTEXT_CHARS) break;
      context += `[Page ${chunk.page}]\n${chunk.content}\n\n`;
    }

    // LLM 生成 quiz（用 ChatPromptTemplate 做 role 分離）
    const formattedPrompt = await quizPromptTemplate.formatMessages({
      count: String(count),
      context,
    });

    const response = await llm.invoke(formattedPrompt);
    const raw = typeof response.content === "string"
      ? response.content
      : JSON.stringify(response.content);

    // Parse JSON — 容錯：移除可能嘅 markdown fence
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    let questions: {
      question: string;
      options: string[];
      correctIndex: number;
      topic: string;
      explanation: string;
    }[];

    try {
      questions = JSON.parse(cleaned);
    } catch {
      console.error("[Quiz] LLM returned invalid JSON:", cleaned.slice(0, 300));
      return NextResponse.json(
        { error: "AI 生成嘅題目格式有誤，請重試" },
        { status: 502 }
      );
    }

    // Validate
    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json(
        { error: "AI 冇生成到題目，請重試" },
        { status: 502 }
      );
    }

    // 過濾 + 規範化（必須恰好 4 個選項；先截斷再驗證 correctIndex，避免 >4 選項時 index 越界）
    const validQuestions = questions
      .filter((q) => {
        if (!q.question || !Array.isArray(q.options)) return false;
        const opts = q.options.slice(0, 4);
        if (opts.length !== 4) return false;
        const ci = q.correctIndex;
        return typeof ci === "number" && ci >= 0 && ci < 4;
      })
      .map((q) => ({
        question: q.question,
        options: q.options.slice(0, 4),
        correctIndex: q.correctIndex,
        topic: q.topic || "General",
        explanation: q.explanation || "",
      }));

    if (validQuestions.length === 0) {
      return NextResponse.json(
        { error: "AI 生成嘅題目全部唔合格，請重試" },
        { status: 502 }
      );
    }

    // 儲存 quiz attempt
    const attempt = await QuizAttempt.create({
      documentId: body.documentId,
      questions: validQuestions,
      totalQuestions: validQuestions.length,
    });

    // 回傳時隱藏 correctIndex 同 explanation
    const clientQuestions = validQuestions.map((q, i) => ({
      index: i,
      question: q.question,
      options: q.options,
    }));

    return NextResponse.json({
      quizId: attempt._id.toString(),
      questions: clientQuestions,
      totalQuestions: validQuestions.length,
    });
  } catch (err) {
    console.error("[Quiz] generate error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "生成練習題失敗" },
      { status: 500 }
    );
  }
}
