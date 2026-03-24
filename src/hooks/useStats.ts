import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

/**
 * @module useStats
 *
 * Knowledge Gap 統計 hook — 從 `/api/quiz/stats` 取得 topic 正確率及整體表現。
 */

/** 單一 topic 的統計資料 */
export interface TopicStat {
  name: string;
  totalQuestions: number;
  correct: number;
  accuracy: number;
}

/** 全部統計資料（topics 分組 + overall 彙總） */
export interface Stats {
  topics: TopicStat[];
  overall: {
    totalAttempts: number;
    totalQuestions: number;
    totalCorrect: number;
    accuracy: number;
  };
}

const STATS_KEY = ["quiz-stats"] as const;

async function fetchStatsApi(): Promise<Stats> {
  const res = await fetch("/api/quiz/stats");
  if (!res.ok) throw new Error("Failed to fetch stats");
  return res.json();
}

/**
 * Fetches quiz stats via TanStack Query.
 * Call `invalidate()` after a quiz completes to auto-refresh.
 */
export function useStats() {
  const queryClient = useQueryClient();

  const { data: stats, isLoading: loading, refetch } = useQuery<Stats>({
    queryKey: STATS_KEY,
    queryFn: fetchStatsApi,
  });

  const { mutateAsync: resetStats } = useMutation({
    mutationFn: () => fetch("/api/quiz/stats", { method: "DELETE" }).then((r) => {
      if (!r.ok) throw new Error("Failed to reset stats");
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: STATS_KEY }),
  });

  return { stats, loading, refetch, resetStats };
}
