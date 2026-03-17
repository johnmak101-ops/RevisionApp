"use client";

import { useState, useEffect } from "react";

/** 單一知識主題的統計資料 */
interface TopicStat {
  /** 主題名稱 */
  name: string;
  /** 該主題總題數 */
  totalQuestions: number;
  /** 答對題數 */
  correct: number;
  /** 正確率（0-100） */
  accuracy: number;
}

/** `/api/quiz/stats` 回傳的統計結構 */
interface Stats {
  /** 各主題統計列表 */
  topics: TopicStat[];
  /** 整體表現數據 */
  overall: {
    totalAttempts: number;
    totalQuestions: number;
    totalCorrect: number;
    accuracy: number;
  };
}

/**
 * 知識缺口分析面板 — 彙總所有 quiz 結果，
 * 以 topic 正確率進度條呈現強弱項，並提供弱項重溫建議。
 */
export function KnowledgeGap() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = () => {
    setLoading(true);
    fetch("/api/quiz/stats")
      .then((r) => r.json())
      .then((data) => setStats(data))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchStats(); }, []);

  if (loading) {
    return (
      <div className="text-center text-sm text-slate-500 py-8">載入中...</div>
    );
  }

  if (!stats || stats.topics.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 text-center">
        <p className="text-slate-500 text-sm">
          未有答題記錄。完成幾次 Quiz 之後，呢度會顯示你嘅弱項分析。
        </p>
      </div>
    );
  }

  const { topics, overall } = stats;

  /** 依正確率回傳進度條色碼 */
  const getColor = (acc: number) =>
    acc >= 80 ? "bg-green-500" : acc >= 60 ? "bg-yellow-500" : "bg-red-500";
  /** 依正確率回傳文字標籤 */
  const getLabel = (acc: number) =>
    acc >= 80 ? "💪 強" : acc >= 60 ? "⚡ 一般" : "🔥 弱項";
  const getBg = (acc: number) =>
    acc >= 80
      ? "bg-green-50 border-green-200"
      : acc >= 60
      ? "bg-yellow-50 border-yellow-200"
      : "bg-red-50 border-red-200";

  return (
    <div className="space-y-4">
      {/* Overall stats */}
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <h4 className="text-sm font-semibold text-slate-700 mb-3">📊 整體表現</h4>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-md bg-slate-50 p-3">
            <p className="text-2xl font-bold text-indigo-600">{overall.accuracy}%</p>
            <p className="text-xs text-slate-500">正確率</p>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <p className="text-2xl font-bold text-slate-800">{overall.totalAttempts}</p>
            <p className="text-xs text-slate-500">次測驗</p>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <p className="text-2xl font-bold text-slate-800">{overall.totalQuestions}</p>
            <p className="text-xs text-slate-500">題已答</p>
          </div>
        </div>
      </div>

      {/* Topic breakdown */}
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-slate-700">🎯 各 Topic 正確率</h4>
          <button
            onClick={fetchStats}
            className="text-xs text-indigo-600 hover:text-indigo-800"
          >
            🔄 重新整理
          </button>
        </div>
        <div className="space-y-3">
          {topics.map((t) => (
            <div key={t.name} className={`rounded-md border p-3 ${getBg(t.accuracy)}`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium text-slate-800">{t.name}</span>
                <span className="text-xs text-slate-500">
                  {getLabel(t.accuracy)} {t.correct}/{t.totalQuestions}
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getColor(t.accuracy)}`}
                  style={{ width: `${t.accuracy}%` }}
                />
              </div>
              <p className="text-right text-xs text-slate-600 mt-1">{t.accuracy}%</p>
            </div>
          ))}
        </div>
      </div>

      {/* Weak topics suggestion */}
      {topics.filter((t) => t.accuracy < 60).length > 0 && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
          <h4 className="text-sm font-semibold text-orange-800 mb-2">
            📚 建議重溫
          </h4>
          <ul className="space-y-1">
            {topics
              .filter((t) => t.accuracy < 60)
              .map((t) => (
                <li key={t.name} className="text-sm text-orange-700">
                  • {t.name}（正確率 {t.accuracy}%）
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}
