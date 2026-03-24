import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { QuizAttempt } from "@/models/QuizAttempt";

/**
 * `POST /api/quiz/submit` — 提交答案並批改 quiz。
 *
 * 防止重複提交（已有 submittedAt 則回 409）。
 *
 * @body `{ quizId: string, answers: number[] }`
 * @returns `{ quizId, score, totalQuestions, percentage, results }`
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      quizId?: string;
      answers?: number[];
    };

    if (!body.quizId || !Array.isArray(body.answers)) {
      return NextResponse.json(
        { error: "需要 quizId 同 answers" },
        { status: 400 }
      );
    }

    await connectDB();

    const attempt = await QuizAttempt.findById(body.quizId);
    if (!attempt) {
      return NextResponse.json(
        { error: "搵唔到呢份 quiz" },
        { status: 404 }
      );
    }

    if (attempt.submittedAt) {
      return NextResponse.json(
        { error: "呢份 quiz 已經交咗" },
        { status: 409 }
      );
    }

    // 確保所有題目都有作答
    if (body.answers!.length !== attempt.totalQuestions) {
      return NextResponse.json(
        { error: `請回答所有題目（需要 ${attempt.totalQuestions} 個答案，收到 ${body.answers!.length} 個）` },
        { status: 400 }
      );
    }

    // 批改
    let correct = 0;
    const results = attempt.questions.map((q: { question: string; options: string[]; correctIndex: number; userAnswer?: number; topic: string; explanation: string }, i: number) => {
      const userAnswer = body.answers![i] ?? -1;
      const isCorrect = userAnswer === q.correctIndex;
      if (isCorrect) correct++;

      // 記錄用戶答案
      attempt.questions[i].userAnswer = userAnswer;

      return {
        index: i,
        question: q.question,
        options: q.options,
        correctIndex: q.correctIndex,
        userAnswer,
        isCorrect,
        topic: q.topic,
        explanation: q.explanation,
      };
    });

    attempt.score = correct;
    attempt.submittedAt = new Date();
    await attempt.save();

    return NextResponse.json({
      quizId: attempt._id.toString(),
      score: correct,
      totalQuestions: attempt.totalQuestions,
      percentage: Math.round((correct / attempt.totalQuestions) * 100),
      results,
    });
  } catch (err) {
    console.error("[Quiz] submit error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "提交失敗" },
      { status: 500 }
    );
  }
}
