import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { QuizAttempt } from "@/models/QuizAttempt";

/**
 * `GET /api/quiz/stats` — Knowledge Gap Analysis。
 *
 * 彙總所有已提交 quiz 的 topic 正確率，弱項排前。
 *
 * @returns `{ topics: TopicStat[], overall: { totalAttempts, totalQuestions, totalCorrect, accuracy } }`
 */
export async function GET() {
  try {
    await connectDB();

    // 只計已提交嘅 quiz
    const attempts = await QuizAttempt.find({ submittedAt: { $ne: null } })
      .select("questions score totalQuestions submittedAt")
      .lean();

    if (attempts.length === 0) {
      return NextResponse.json({
        topics: [],
        overall: { totalAttempts: 0, totalQuestions: 0, totalCorrect: 0, accuracy: 0 },
      });
    }

    // 按 topic 分組計算
    const topicMap = new Map<string, { total: number; correct: number }>();
    let totalQuestions = 0;
    let totalCorrect = 0;

    for (const attempt of attempts) {
      for (const q of attempt.questions) {
        const topic = q.topic || "General";
        const entry = topicMap.get(topic) ?? { total: 0, correct: 0 };
        entry.total++;
        totalQuestions++;
        if (q.userAnswer === q.correctIndex) {
          entry.correct++;
          totalCorrect++;
        }
        topicMap.set(topic, entry);
      }
    }

    const topics = Array.from(topicMap.entries())
      .map(([name, data]) => ({
        name,
        totalQuestions: data.total,
        correct: data.correct,
        accuracy: Math.round((data.correct / data.total) * 100),
      }))
      .sort((a, b) => a.accuracy - b.accuracy); // 弱項排前面

    return NextResponse.json({
      topics,
      overall: {
        totalAttempts: attempts.length,
        totalQuestions,
        totalCorrect,
        accuracy: totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0,
      },
    });
  } catch (err) {
    console.error("[Quiz] stats error:", err);
    return NextResponse.json(
      { error: "無法取得統計資料" },
      { status: 500 }
    );
  }
}

/**
 * `DELETE /api/quiz/stats` — 清除所有答題記錄。
 *
 * 刪除 QuizAttempt collection 內的所有文件，重置整體表現統計。
 *
 * @returns `{ deleted: number }`
 */
export async function DELETE() {
  try {
    await connectDB();
    const result = await QuizAttempt.deleteMany({});
    return NextResponse.json({ deleted: result.deletedCount });
  } catch (err) {
    console.error("[Quiz] reset stats error:", err);
    return NextResponse.json(
      { error: "無法重置記錄" },
      { status: 500 }
    );
  }
}
