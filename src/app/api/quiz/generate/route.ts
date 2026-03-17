import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Chunk } from "@/models/Chunk";
import { QuizAttempt } from "@/models/QuizAttempt";
import { ChatOpenAI } from "@langchain/openai";

/**
 * @module quiz/generate/route
 *
 * AI Quiz 生成器 — 取指定文件的 chunks，用 LLM 出 MCQ 題目。
 */

/** OpenRouter LLM — temperature 0.7 增加題目多樣性 */
const llm = new ChatOpenAI({
  model: process.env.OPENROUTER_MODEL ?? "nvidia/nemotron-3-nano-30b-a3b:free",
  apiKey: process.env.OPENROUTER_API_KEY,
  configuration: { baseURL: "https://openrouter.ai/api/v1" },
  maxRetries: 2,
  temperature: 0.7,
});

/** LLM prompt — 要求輸出 JSON array 格式的 MCQ */
const QUIZ_PROMPT = `You are a quiz generator for study materials. Based on the following content, generate exactly {count} multiple-choice questions.

RULES:
1. Each question must test understanding, not just memorization
2. Provide exactly 4 options (A-D) for each question
3. Assign a short topic label (2-5 words) for each question
4. Include a brief explanation for the correct answer
5. Respond ONLY with valid JSON, no markdown fencing

OUTPUT FORMAT (JSON array):
[
  {{
    "question": "What is...",
    "options": ["option A", "option B", "option C", "option D"],
    "correctIndex": 0,
    "topic": "Short Topic Name",
    "explanation": "Brief explanation of why the answer is correct"
  }}
]

CONTENT:
{context}`;

/**
 * `POST /api/quiz/generate` — 為指定文件生成 MCQ quiz。
 *
 * @body `{ documentId: string, count?: number }`
 * @returns `{ quizId, questions: ClientQuestion[], totalQuestions }`
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      documentId?: string;
      count?: number;
    };

    if (!body.documentId) {
      return NextResponse.json(
        { error: "請指定文件 documentId" },
        { status: 400 }
      );
    }

    const count = Math.min(Math.max(body.count ?? 5, 1), 15);

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

    // LLM 生成 quiz
    const prompt = QUIZ_PROMPT
      .replace("{count}", String(count))
      .replace("{context}", context);

    const response = await llm.invoke(prompt);
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

    // 過濾 + 規範化
    const validQuestions = questions
      .filter(
        (q) =>
          q.question &&
          Array.isArray(q.options) &&
          q.options.length >= 2 &&
          typeof q.correctIndex === "number" &&
          q.correctIndex >= 0 &&
          q.correctIndex < q.options.length
      )
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
