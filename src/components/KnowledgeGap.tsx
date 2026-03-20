"use client";

import { useState } from "react";
import { useStats, TopicStat } from "@/hooks/useStats";
import { useToast } from "@/hooks/useToast";

// ── Helpers ───────────────────────────────────────────────────────────────────

const getBarColor = (acc: number) =>
  acc >= 80 ? "bg-green-500" : acc >= 60 ? "bg-yellow-500" : "bg-red-500";

const getBadge = (acc: number) =>
  acc >= 80 ? "💪 強" : acc >= 60 ? "⚡ 一般" : "🔥 弱項";

const getBadgeStyle = (acc: number) =>
  acc >= 80
    ? "bg-green-100 text-green-700"
    : acc >= 60
    ? "bg-yellow-100 text-yellow-700"
    : "bg-red-100 text-red-700";

const getCardBorder = (acc: number) =>
  acc >= 80 ? "border-green-200" : acc >= 60 ? "border-yellow-200" : "border-red-200";

// ── Presentational: TopicCard ─────────────────────────────────────────────────

function TopicCard({ topic }: { topic: TopicStat }) {
  return (
    <div className={`rounded-lg border bg-white p-4 ${getCardBorder(topic.accuracy)}`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-slate-800 truncate pr-2">{topic.name}</p>
        <span
          className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${getBadgeStyle(topic.accuracy)}`}
        >
          {getBadge(topic.accuracy)}
        </span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden mb-1.5">
        <div
          className={`h-full rounded-full transition-all duration-500 ${getBarColor(topic.accuracy)}`}
          style={{ width: `${topic.accuracy}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>答對 {topic.correct} / {topic.totalQuestions} 題</span>
        <span className="font-semibold text-slate-700">{topic.accuracy}%</span>
      </div>
    </div>
  );
}

// ── Container ─────────────────────────────────────────────────────────────────

export function KnowledgeGap() {
  const { stats, loading, refetch, resetStats } = useStats();
  const { toast, showToast } = useToast();
  const [confirmPending, setConfirmPending] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleReset = async () => {
    if (!confirmPending) {
      setConfirmPending(true);
      return;
    }
    setConfirmPending(false);
    setResetting(true);
    try {
      await resetStats();
      showToast("✅ 答題記錄已清除", "success");
    } catch {
      showToast("❌ 清除失敗，請重試", "error");
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return <div className="text-center text-sm text-slate-500 py-8">載入中...</div>;
  }

  if (!stats || stats.topics.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 text-center">
        <p className="text-slate-500 text-sm">
          未有答題記錄。完成幾次 Quiz 之後，呢度會顯示你嘅 Topic 表現分析。
        </p>
      </div>
    );
  }

  const { topics, overall } = stats;
  const weakTopics = topics.filter((t) => t.accuracy < 60);

  return (
    <div className="space-y-3">
      {/* Header bar */}
      <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-700">📊 各 Topic 表現</p>
            <p className="text-xs text-slate-400 mt-0.5">
              共 {overall.totalAttempts} 次測驗 · {overall.totalQuestions} 題 · 整體{" "}
              {overall.accuracy}%
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => refetch()}
              className="text-xs text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              🔄
            </button>
            {confirmPending ? (
              <div className="flex items-center gap-2 rounded-md bg-red-50 border border-red-200 px-2 py-1">
                <span className="text-xs text-red-700">確定清除？</span>
                <button
                  onClick={handleReset}
                  disabled={resetting}
                  className="text-xs font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
                >
                  {resetting ? "..." : "確定"}
                </button>
                <button
                  onClick={() => setConfirmPending(false)}
                  className="text-xs text-slate-500 hover:text-slate-700"
                >
                  取消
                </button>
              </div>
            ) : (
              <button
                onClick={handleReset}
                className="text-xs text-red-400 hover:text-red-600 transition-colors"
              >
                🗑️
              </button>
            )}
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div
            className={`mt-2 rounded-md px-3 py-1.5 text-xs font-medium ${
              toast.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
            }`}
          >
            {toast.msg}
          </div>
        )}
      </div>

      {/* Topic cards */}
      {topics.map((t) => (
        <TopicCard key={t.name} topic={t} />
      ))}

      {/* Weak topics summary */}
      {weakTopics.length > 0 && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
          <h4 className="text-xs font-semibold text-orange-800 mb-1.5">📚 建議重溫</h4>
          <ul className="space-y-1">
            {weakTopics.map((t) => (
              <li key={t.name} className="text-xs text-orange-700">
                • {t.name}（{t.accuracy}%）
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
