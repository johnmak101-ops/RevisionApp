"use client";

import { useState, useEffect } from "react";

/** 已上傳文件的摘要資訊 */
interface Doc {
  _id: string;
  filename: string;
  chunkCount: number;
}

/** 供前端顯示的題目（不含答案） */
interface ClientQuestion {
  /** 題目序號 */
  index: number;
  /** 題目內容 */
  question: string;
  /** 選項列表 */
  options: string[];
}

/** 單題批改結果（提交後由後端回傳） */
interface QuizResult {
  index: number;
  question: string;
  options: string[];
  /** 正確選項索引 */
  correctIndex: number;
  /** 用戶選擇的索引 */
  userAnswer: number;
  /** 是否答對 */
  isCorrect: boolean;
  /** 所屬知識主題 */
  topic: string;
  /** AI 解釋 */
  explanation: string;
}

/** Quiz 元件的三段式生命週期 */
type Phase = "setup" | "answering" | "results";

/**
 * Quiz 生成器面板 — 選文件 → AI 出題 → 作答 → 批改。
 * 三段式 Phase：setup → answering → results。
 */
export function QuizPanel() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [selectedDoc, setSelectedDoc] = useState("");
  const [count, setCount] = useState(5);
  const [phase, setPhase] = useState<Phase>("setup");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Quiz state
  const [quizId, setQuizId] = useState("");
  const [questions, setQuestions] = useState<ClientQuestion[]>([]);
  const [answers, setAnswers] = useState<number[]>([]);

  // Results state
  const [results, setResults] = useState<QuizResult[]>([]);
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);

  // Load documents
  useEffect(() => {
    fetch("/api/documents")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setDocs(data);
      })
      .catch(() => setDocs([]));
  }, []);

  // ── Generate Quiz ──────────────────────────
  /** 呼叫 `/api/quiz/generate` 生成新 quiz */
  const handleGenerate = async () => {
    if (!selectedDoc) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: selectedDoc, count }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "生成失敗");

      setQuizId(data.quizId);
      setQuestions(data.questions);
      setAnswers(new Array(data.questions.length).fill(-1));
      setPhase("answering");
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成練習題失敗");
    } finally {
      setLoading(false);
    }
  };

  // ── Submit Answers ─────────────────────────
  /** 提交答案到 `/api/quiz/submit` 進行批改 */
  const handleSubmit = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quizId, answers }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "提交失敗");

      setResults(data.results);
      setScore(data.score);
      setTotal(data.totalQuestions);
      setPhase("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "提交失敗");
    } finally {
      setLoading(false);
    }
  };

  // ── Reset ──────────────────────────────────
  /** 重設所有狀態，回到 setup phase */
  const handleReset = () => {
    setPhase("setup");
    setQuizId("");
    setQuestions([]);
    setAnswers([]);
    setResults([]);
    setScore(0);
    setTotal(0);
    setError("");
  };

  const allAnswered = answers.length > 0 && answers.every((a) => a >= 0);

  return (
    <div className="flex flex-col rounded-lg border border-slate-200 bg-white shadow-sm h-full">
      {/* Header */}
      <div className="border-b border-slate-200 px-5 py-3 shrink-0">
        <h3 className="font-semibold text-slate-800">📝 Quiz Generator</h3>
        <p className="text-xs text-slate-500">
          {phase === "setup" && "揀文件，AI 自動出練習題"}
          {phase === "answering" && `共 ${questions.length} 題，揀好答案再提交`}
          {phase === "results" && `得分：${score}/${total} (${Math.round((score / total) * 100)}%)`}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-0 h-[70vh]">
        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* ── SETUP Phase ── */}
        {phase === "setup" && (
          <div className="space-y-4">
            {docs.length === 0 ? (
              <p className="text-sm text-slate-500">
                未有上傳文件。請先喺上方上傳 PDF 或 Markdown。
              </p>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    選擇文件
                  </label>
                  <select
                    value={selectedDoc}
                    onChange={(e) => setSelectedDoc(e.target.value)}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="">-- 揀一份文件 --</option>
                    {docs.map((d) => (
                      <option key={d._id} value={d._id}>
                        {d.filename} ({d.chunkCount} chunks)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    題目數量
                  </label>
                  <input
                    type="range"
                    min={3}
                    max={15}
                    value={count}
                    onChange={(e) => setCount(Number(e.target.value))}
                    className="w-full accent-indigo-600"
                  />
                  <span className="text-sm text-slate-600">{count} 題</span>
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={!selectedDoc || loading}
                  className="w-full rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? "⏳ AI 出題中..." : "🎲 生成練習題"}
                </button>
              </>
            )}
          </div>
        )}

        {/* ── ANSWERING Phase ── */}
        {phase === "answering" && (
          <div className="space-y-5">
            {questions.map((q, qi) => (
              <div
                key={qi}
                className="rounded-lg border border-slate-200 bg-slate-50 p-4"
              >
                <p className="text-sm font-medium text-slate-800 mb-3">
                  <span className="text-indigo-600 font-bold">Q{qi + 1}.</span>{" "}
                  {q.question}
                </p>
                <div className="space-y-2">
                  {q.options.map((opt, oi) => (
                    <label
                      key={oi}
                      className={`flex items-center gap-3 rounded-md border px-3 py-2 text-sm cursor-pointer transition-colors ${
                        answers[qi] === oi
                          ? "border-indigo-500 bg-indigo-50 text-indigo-800"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`q${qi}`}
                        checked={answers[qi] === oi}
                        onChange={() => {
                          const next = [...answers];
                          next[qi] = oi;
                          setAnswers(next);
                        }}
                        className="accent-indigo-600"
                      />
                      <span className="font-mono text-xs text-slate-400 shrink-0">
                        {String.fromCharCode(65 + oi)}.
                      </span>
                      {opt}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── RESULTS Phase ── */}
        {phase === "results" && (
          <div className="space-y-4">
            {/* Score banner */}
            <div
              className={`rounded-lg px-5 py-4 text-center ${
                score / total >= 0.8
                  ? "bg-green-50 border border-green-200"
                  : score / total >= 0.6
                  ? "bg-yellow-50 border border-yellow-200"
                  : "bg-red-50 border border-red-200"
              }`}
            >
              <p className="text-3xl font-bold">
                {score}/{total}
              </p>
              <p className="text-sm text-slate-600 mt-1">
                {score / total >= 0.8
                  ? "🎉 好掂！繼續保持！"
                  : score / total >= 0.6
                  ? "💪 唔錯，仲有進步空間"
                  : "📚 加油，建議重溫弱項"}
              </p>
            </div>

            {/* Per-question results */}
            {results.map((r, i) => (
              <div
                key={i}
                className={`rounded-lg border p-4 ${
                  r.isCorrect
                    ? "border-green-200 bg-green-50/50"
                    : "border-red-200 bg-red-50/50"
                }`}
              >
                <div className="flex items-start gap-2 mb-2">
                  <span className="text-lg">{r.isCorrect ? "✅" : "❌"}</span>
                  <p className="text-sm font-medium text-slate-800">
                    Q{i + 1}. {r.question}
                  </p>
                </div>
                <div className="ml-7 space-y-1">
                  {r.options.map((opt, oi) => (
                    <p
                      key={oi}
                      className={`text-sm px-2 py-0.5 rounded ${
                        oi === r.correctIndex
                          ? "text-green-800 font-medium bg-green-100"
                          : oi === r.userAnswer && !r.isCorrect
                          ? "text-red-700 line-through"
                          : "text-slate-600"
                      }`}
                    >
                      {String.fromCharCode(65 + oi)}. {opt}
                      {oi === r.correctIndex && " ✓"}
                    </p>
                  ))}
                  {r.explanation && (
                    <p className="text-xs text-slate-500 mt-2 italic">
                      💡 {r.explanation}
                    </p>
                  )}
                  <p className="text-xs text-indigo-500 mt-1">#{r.topic}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div className="border-t border-slate-200 p-4 shrink-0">
        {phase === "answering" && (
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              disabled={!allAnswered || loading}
              className="flex-1 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "⏳ 批改中..." : `提交答案 (${answers.filter((a) => a >= 0).length}/${questions.length})`}
            </button>
          </div>
        )}
        {phase === "results" && (
          <button
            onClick={handleReset}
            className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            🔄 再出一次題
          </button>
        )}
      </div>
    </div>
  );
}
