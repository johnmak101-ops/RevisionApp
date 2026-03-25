import { useEffect, useReducer } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

/**
 * @module useQuiz
 *
 * Quiz 全流程狀態管理 hook — setup → answering → results。
 * 用 `useReducer` 管理本地狀態，`useMutation` 處理 API 呼叫。
 */

// ── Types ─────────────────────────────────────────────────────────────────────

/** 文件列表項目 */
export interface Doc {
  _id: string;
  filename: string;
  chunkCount: number;
}

/** 前端顯示用的題目（不含答案） */
export interface ClientQuestion {
  index: number;
  question: string;
  options: string[];
}

export interface QuizResult {
  index: number;
  question: string;
  options: string[];
  correctIndex: number;
  userAnswer: number;
  isCorrect: boolean;
  topic: string;
  explanation: string;
}

export type Phase = "setup" | "answering" | "results";

// ── Reducer ───────────────────────────────────────────────────────────────────
// Only manages UI/domain state — loading & error are derived from mutations

interface QuizState {
  phase: Phase;
  selectedDoc: string;
  count: number;
  quizId: string;
  questions: ClientQuestion[];
  answers: number[];
  results: QuizResult[];
  score: number;
  total: number;
}

export type QuizAction =
  | { type: "SET_DOC"; doc: string }
  | { type: "SET_COUNT"; count: number }
  | { type: "GENERATE_SUCCESS"; quizId: string; questions: ClientQuestion[] }
  | { type: "SET_ANSWER"; questionIndex: number; answerIndex: number }
  | { type: "SUBMIT_SUCCESS"; results: QuizResult[]; score: number; total: number }
  | { type: "RETRY" }
  | { type: "RESET_DOC" };

const initialState: QuizState = {
  phase: "setup",
  selectedDoc: "",
  count: 5,
  quizId: "",
  questions: [],
  answers: [],
  results: [],
  score: 0,
  total: 0,
};

function quizReducer(state: QuizState, action: QuizAction): QuizState {
  switch (action.type) {
    case "SET_DOC":
      return { ...state, selectedDoc: action.doc };
    case "SET_COUNT":
      return { ...state, count: action.count };
    case "GENERATE_SUCCESS":
      return {
        ...state,
        phase: "answering",
        quizId: action.quizId,
        questions: action.questions,
        answers: new Array(action.questions.length).fill(-1),
      };
    case "SET_ANSWER": {
      const answers = [...state.answers];
      answers[action.questionIndex] = action.answerIndex;
      return { ...state, answers };
    }
    case "SUBMIT_SUCCESS":
      return {
        ...state,
        phase: "results",
        results: action.results,
        score: action.score,
        total: action.total,
      };
    case "RETRY":
      return { ...initialState, selectedDoc: state.selectedDoc, count: state.count };
    case "RESET_DOC":
      return initialState;
    default:
      return state;
  }
}

// ── API fns ───────────────────────────────────────────────────────────────────

async function fetchDocs(): Promise<Doc[]> {
  const res = await fetch("/api/documents");
  if (!res.ok) throw new Error("Failed to load documents");
  return res.json();
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Quiz 全流程 hook。
 *
 * @returns docs — 文件清單； state — 當前狀態；
 *          generate / submit / setAnswer / setDoc / setCount / reset — action dispatchers。
 */
export function useQuiz() {
  const [state, dispatch] = useReducer(quizReducer, initialState);
  const queryClient = useQueryClient();

  // ── Documents ────────────────────────────────────────────────────────────
  const { data: docs = [] } = useQuery<Doc[]>({
    queryKey: ["documents"],
    queryFn: fetchDocs,
    staleTime: 60_000, // docs change rarely
  });

  useEffect(() => {
    if (state.selectedDoc && !docs.some((d) => d._id === state.selectedDoc)) {
      dispatch({ type: "SET_DOC", doc: "" });
    }
  }, [docs, state.selectedDoc]);

  // ── Generate quiz ─────────────────────────────────────────────────────────
  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: state.selectedDoc, count: state.count }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "生成題目失敗");
      return data as { quizId: string; questions: ClientQuestion[] };
    },
    onSuccess: (data) => {
      dispatch({ type: "GENERATE_SUCCESS", quizId: data.quizId, questions: data.questions });
    },
  });

  // ── Submit answers ────────────────────────────────────────────────────────
  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quizId: state.quizId, answers: state.answers }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "提交失敗");
      return data as { results: QuizResult[]; score: number; totalQuestions: number };
    },
    onSuccess: (data) => {
      dispatch({
        type: "SUBMIT_SUCCESS",
        results: data.results,
        score: data.score,
        total: data.totalQuestions,
      });
      // Invalidate stats cache so KnowledgeGap auto-refreshes
      queryClient.invalidateQueries({ queryKey: ["quiz-stats"] });
    },
  });

  // ── Derived state ─────────────────────────────────────────────────────────
  const loading = generateMutation.isPending || submitMutation.isPending;
  const error =
    (generateMutation.error as Error | null)?.message ||
    (submitMutation.error as Error | null)?.message ||
    "";

  return {
    state,
    dispatch,
    docs,
    loading,
    error,
    generateQuiz: () => generateMutation.mutate(),
    submitQuiz: () => submitMutation.mutate(),
  };
}
