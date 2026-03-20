import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mock DB ─────────────────────────────────
vi.mock("@/lib/db", () => ({ connectDB: vi.fn() }));

const mockChunks = [
  { content: "Introduction to React Hooks", page: 1 },
  { content: "useEffect handles side effects", page: 2 },
];

vi.mock("@/models/Chunk", () => ({
  Chunk: {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(mockChunks),
        }),
      }),
    }),
  },
}));

// ─── Mock LangChain — class-based ────────────
vi.mock("@langchain/openai", () => ({
  ChatOpenAI: class {
    pipe() {
      return {
        stream: vi.fn().mockResolvedValue({
          [Symbol.asyncIterator]: async function* () {
            yield "## Summary\n";
            yield "- React Hooks intro\n";
          },
        }),
      };
    }
  },
}));

vi.mock("@langchain/core/output_parsers", () => ({
  StringOutputParser: class {},
}));

describe("POST /api/summary/generate", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 without documentId", async () => {
    const { POST } = await import("@/app/api/summary/generate/route");
    const req = new NextRequest("http://localhost/api/summary/generate", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns streaming summary for valid documentId", async () => {
    const { POST } = await import("@/app/api/summary/generate/route");
    const req = new NextRequest("http://localhost/api/summary/generate", {
      method: "POST",
      body: JSON.stringify({ documentId: "doc-1" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);

    const text = await res.text();
    const lines = text.trim().split("\n").filter(Boolean);
    expect(lines.length).toBeGreaterThanOrEqual(1);

    const lastLine = JSON.parse(lines[lines.length - 1]);
    expect(lastLine.done).toBe(true);
  });

  it("returns 404 when no chunks found", async () => {
    const { Chunk } = await import("@/models/Chunk");
    vi.mocked(Chunk.find).mockReturnValueOnce({
      sort: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([]),
        }),
      }),
    } as unknown as ReturnType<typeof Chunk.find>);

    const { POST } = await import("@/app/api/summary/generate/route");
    const req = new NextRequest("http://localhost/api/summary/generate", {
      method: "POST",
      body: JSON.stringify({ documentId: "nonexistent" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(404);
  });
});
