import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

/** 有效 MongoDB ObjectId（24 hex），符合 `guardDocumentId` */
const VALID_DOC_ID = "507f1f77bcf86cd799439011";

// ─── Mock DB ─────────────────────────────────
vi.mock("@/lib/db", () => ({ connectDB: vi.fn() }));

// ─── Mock Chunk model ────────────────────────
vi.mock("@/models/Chunk", () => ({
  Chunk: {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([
            { content: "React is a JS library", page: 1 },
            { content: "Hooks are a new addition", page: 2 },
          ]),
        }),
      }),
    }),
  },
}));

// ─── Mock QuizAttempt ────────────────────────
const fakeQuizData = {
  _id: { toString: () => "quiz-123" },
  documentId: VALID_DOC_ID,
  questions: [
    {
      question: "What is React?",
      options: ["Library", "Framework", "Language", "Database"],
      correctIndex: 0,
      topic: "React Basics",
      explanation: "React is a JavaScript library",
      userAnswer: undefined as number | undefined,
    },
  ],
  totalQuestions: 1,
  score: undefined as number | undefined,
  submittedAt: undefined as Date | undefined,
  save: vi.fn(),
};

vi.mock("@/models/QuizAttempt", () => ({
  QuizAttempt: {
    create: vi.fn().mockResolvedValue(fakeQuizData),
    findById: vi.fn().mockResolvedValue(fakeQuizData),
    find: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      }),
    }),
  },
}));

// ─── Mock LangChain — class-based (used with `new`) ──
vi.mock("@langchain/openai", () => ({
  ChatOpenAI: class {
    invoke() {
      return Promise.resolve({
        content: JSON.stringify([
          {
            question: "What is React?",
            options: ["Library", "Framework", "Language", "Database"],
            correctIndex: 0,
            topic: "React Basics",
            explanation: "React is a JavaScript library",
          },
        ]),
      });
    }
    pipe() { return this; }
    stream() { return Promise.resolve({ [Symbol.asyncIterator]: async function* () {} }); }
  },
}));

vi.mock("@langchain/core/output_parsers", () => ({
  StringOutputParser: class {},
}));

describe("Quiz API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fakeQuizData.score = undefined;
    fakeQuizData.submittedAt = undefined;
    fakeQuizData.questions[0].userAnswer = undefined;
    fakeQuizData.save.mockReset();
  });

  describe("POST /api/quiz/generate", () => {
    it("returns 400 without documentId", async () => {
      const { POST } = await import("@/app/api/quiz/generate/route");
      const req = new NextRequest("http://localhost/api/quiz/generate", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("returns quiz questions for valid request", async () => {
      const { POST } = await import("@/app/api/quiz/generate/route");
      const req = new NextRequest("http://localhost/api/quiz/generate", {
        method: "POST",
        body: JSON.stringify({ documentId: VALID_DOC_ID, count: 1 }),
        headers: { "Content-Type": "application/json" },
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.quizId).toBe("quiz-123");
      expect(json.questions).toHaveLength(1);
      expect(json.questions[0]).not.toHaveProperty("correctIndex");
    });
  });

  describe("POST /api/quiz/submit", () => {
    it("returns 400 without quizId or answers", async () => {
      const { POST } = await import("@/app/api/quiz/submit/route");
      const req = new NextRequest("http://localhost/api/quiz/submit", {
        method: "POST",
        body: JSON.stringify({ quizId: "quiz-123" }),
        headers: { "Content-Type": "application/json" },
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("scores and returns results", async () => {
      const { POST } = await import("@/app/api/quiz/submit/route");
      const req = new NextRequest("http://localhost/api/quiz/submit", {
        method: "POST",
        body: JSON.stringify({ quizId: "quiz-123", answers: [0] }),
        headers: { "Content-Type": "application/json" },
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.score).toBe(1);
      expect(json.percentage).toBe(100);
      expect(json.results[0].isCorrect).toBe(true);
    });
  });

  describe("GET /api/quiz/stats", () => {
    it("returns empty stats when no submissions", async () => {
      const { GET } = await import("@/app/api/quiz/stats/route");
      const res = await GET();
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.overall.totalAttempts).toBe(0);
      expect(json.topics).toEqual([]);
    });
  });
});
