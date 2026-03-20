import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface TopicStat {
  name: string;
  totalQuestions: number;
  correct: number;
  accuracy: number;
}

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
