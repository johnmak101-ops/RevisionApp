"use client";

import { useQuiz } from "@/hooks/useQuiz";

// ── Presentational: Setup ─────────────────────────────────────────────────────

function QuizSetup({
  docs,
  selectedDoc,
  count,
  loading,
  onDocChange,
  onCountChange,
  onGenerate,
}: {
  docs: { _id: string; filename: string; chunkCount: number }[];
  selectedDoc: string;
  count: number;
  loading: boolean;
  onDocChange: (id: string) => void;
  onCountChange: (n: number) => void;
  onGenerate: () => void;
}) {
  if (docs.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        未有上傳文件。請先喺上方上傳 PDF 或 Markdown。
      </p>
    );
  }
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">選擇文件</label>
        <select
          value={selectedDoc}
          onChange={(e) => onDocChange(e.target.value)}
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
        <label className="block text-sm font-medium text-slate-700 mb-1">題目數量</label>
        <input
          type="range"
          min={3}
          max={15}
          value={count}
          onChange={(e) => onCountChange(Number(e.target.value))}
          className="w-full accent-indigo-600"
        />
        <span className="text-sm text-slate-600">{count} 題</span>
      </div>

      <button
        onClick={onGenerate}
        disabled={!selectedDoc || loading}
        className="w-full rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
      >
        {loading ? "⏳ AI 出題中..." : "🎲 生成練習題"}
      </button>
    </div>
  );
}

// ── Presentational: Answering ─────────────────────────────────────────────────

function QuizAnswering({
  questions,
  answers,
  loading,
  onAnswer,
  onSubmit,
  onCancel,
}: {
  questions: { index: number; question: string; options: string[] }[];
  answers: number[];
  loading: boolean;
  onAnswer: (qi: number, oi: number) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const allAnswered = answers.length > 0 && answers.every((a) => a >= 0);

  return (
    <>
      <div className="space-y-5">
        {questions.map((q, qi) => (
          <div key={qi} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-800 mb-3">
              <span className="text-indigo-600 font-bold">Q{qi + 1}.</span> {q.question}
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
                    onChange={() => onAnswer(qi, oi)}
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

      {/* Answering bottom bar */}
      <div className="border-t border-slate-200 p-4 shrink-0 mt-auto">
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
          >
            取消
          </button>
          <button
            onClick={onSubmit}
            disabled={!allAnswered || loading}
            className="flex-1 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {loading
              ? "⏳ 批改中..."
              : `提交答案 (${answers.filter((a) => a >= 0).length}/${questions.length})`}
          </button>
        </div>
      </div>
    </>
  );
}

// ── Presentational: Results ───────────────────────────────────────────────────

function QuizResults({
  results,
  score,
  total,
  onRetry,
  onChangeDoc,
}: {
  results: {
    index: number;
    question: string;
    options: string[];
    correctIndex: number;
    userAnswer: number;
    isCorrect: boolean;
    topic: string;
    explanation: string;
  }[];
  score: number;
  total: number;
  onRetry: () => void;
  onChangeDoc: () => void;
}) {
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  const bannerClass =
    pct >= 80
      ? "bg-green-50 border border-green-200"
      : pct >= 60
      ? "bg-yellow-50 border border-yellow-200"
      : "bg-red-50 border border-red-200";
  const bannerMsg =
    pct >= 80 ? "🎉 好掂！繼續保持！" : pct >= 60 ? "💪 唔錯，仲有進步空間" : "📚 加油，建議重溫弱項";

  return (
    <>
      <div className="space-y-4">
        <div className={`rounded-lg px-5 py-4 text-center ${bannerClass}`}>
          <p className="text-3xl font-bold">
            {score}/{total}
          </p>
          <p className="text-sm text-slate-600 mt-1">{bannerMsg}</p>
        </div>

        {results.map((r, i) => (
          <div
            key={i}
            className={`rounded-lg border p-4 ${
              r.isCorrect ? "border-green-200 bg-green-50/50" : "border-red-200 bg-red-50/50"
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
                <p className="text-xs text-slate-500 mt-2 italic">💡 {r.explanation}</p>
              )}
              <p className="text-xs text-indigo-500 mt-1">#{r.topic}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Results bottom bar */}
      <div className="border-t border-slate-200 p-4 shrink-0 mt-auto">
        <div className="flex flex-col gap-2">
          <button
            onClick={onRetry}
            className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            🔄 再出一次題
          </button>
          <button
            onClick={onChangeDoc}
            className="w-full rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
          >
            換一份文件
          </button>
        </div>
      </div>
    </>
  );
}

// ── Container ─────────────────────────────────────────────────────────────────

/**
 * Quiz 生成器面板 — 選文件 → AI 出題 → 作答 → 批改。
 * 三段式 Phase：setup → answering → results。
 * State logic is fully encapsulated in `useQuiz`.
 */
export function QuizPanel() {
  const { state, dispatch, docs, loading, error, generateQuiz, submitQuiz } = useQuiz();
  const { phase, selectedDoc, count, questions, answers, results, score, total } = state;

  const headerSub =
    phase === "setup"
      ? "揀文件，AI 自動出練習題"
      : phase === "answering"
      ? `共 ${questions.length} 題，揀好答案再提交`
      : total > 0
      ? `得分：${score}/${total} (${Math.round((score / total) * 100)}%)`
      : "";

  return (
    <div className="flex flex-col rounded-lg border border-slate-200 bg-white shadow-sm h-full">
      {/* Header */}
      <div className="border-b border-slate-200 px-5 py-3 shrink-0">
        <h3 className="font-semibold text-slate-800">📝 Quiz Generator</h3>
        <p className="text-xs text-slate-500">{headerSub}</p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-0 h-[70vh]">
        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {phase === "setup" && (
          <QuizSetup
            docs={docs}
            selectedDoc={selectedDoc}
            count={count}
            loading={loading}
            onDocChange={(doc) => dispatch({ type: "SET_DOC", doc })}
            onCountChange={(count) => dispatch({ type: "SET_COUNT", count })}
            onGenerate={generateQuiz}
          />
        )}

        {phase === "answering" && (
          <QuizAnswering
            questions={questions}
            answers={answers}
            loading={loading}
            onAnswer={(questionIndex, answerIndex) =>
              dispatch({ type: "SET_ANSWER", questionIndex, answerIndex })
            }
            onSubmit={submitQuiz}
            onCancel={() => dispatch({ type: "RETRY" })}
          />
        )}

        {phase === "results" && (
          <QuizResults
            results={results}
            score={score}
            total={total}
            onRetry={() => dispatch({ type: "RETRY" })}
            onChangeDoc={() => dispatch({ type: "RESET_DOC" })}
          />
        )}
      </div>

      {/* Setup bottom bar */}
      {phase === "setup" && selectedDoc && (
        <div className="border-t border-slate-200 p-4 shrink-0">
          <button
            onClick={() => dispatch({ type: "RESET_DOC" })}
            className="w-full rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
          >
            🔄 重新開始
          </button>
        </div>
      )}
    </div>
  );
}
