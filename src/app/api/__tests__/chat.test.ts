import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mock vectorSearch ──────────────────────
vi.mock("@/lib/search", () => ({
  vectorSearch: vi.fn().mockResolvedValue([
    { content: "React hooks allow state in function components.", page: 1, pdfId: "doc1", score: 0.85 },
    { content: "useState and useEffect are basic hooks.", page: 2, pdfId: "doc1", score: 0.72 },
  ]),
}));

// ─── Mock LangChain — must be class-based (used with `new`) ──
vi.mock("@langchain/openai", () => ({
  ChatOpenAI: class {
    pipe() { return this; }
  },
}));

vi.mock("@langchain/core/prompts", () => ({
  ChatPromptTemplate: {
    fromMessages: vi.fn().mockReturnValue("mockPrompt"),
  },
  MessagesPlaceholder: class { constructor() {} },
}));

vi.mock("@langchain/core/output_parsers", () => ({
  StringOutputParser: class {},
}));

vi.mock("@langchain/core/runnables", () => ({
  RunnableSequence: {
    from: vi.fn().mockReturnValue({
      stream: vi.fn().mockResolvedValue({
        [Symbol.asyncIterator]: async function* () {
          yield "Hello ";
          yield "world!";
        },
      }),
    }),
  },
}));

vi.mock("@langchain/core/messages", () => ({
  HumanMessage: class { constructor(public content: string) {} },
  AIMessage: class { constructor(public content: string) {} },
  SystemMessage: class { constructor(public content: string) {} },
}));

describe("POST /api/chat", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 when messages is empty", async () => {
    const { POST } = await import("@/app/api/chat/route");

    const req = new NextRequest("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({ messages: [] }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Messages");
  });

  it("returns 400 when no user message found", async () => {
    const { POST } = await import("@/app/api/chat/route");

    const req = new NextRequest("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({
        messages: [{ role: "assistant", content: "hi" }],
      }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns streaming response for valid message", async () => {
    const { POST } = await import("@/app/api/chat/route");

    const req = new NextRequest("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({
        messages: [{ role: "user", content: "What are React hooks?" }],
      }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const text = await res.text();
    expect(text).toBeTruthy();
    const lines = text.trim().split("\n").filter(Boolean);
    expect(lines.length).toBeGreaterThanOrEqual(1);
  });
});
