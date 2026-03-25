import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mock all deps ───────────────────────────
vi.mock("@/lib/db", () => ({ connectDB: vi.fn() }));
vi.mock("@/lib/pdf", () => ({
  extractPdfText: vi.fn().mockResolvedValue([
    { text: "This is a test PDF page with enough content for chunking.", pageNumber: 1 },
  ]),
}));
vi.mock("@/lib/md", () => ({
  extractMdText: vi.fn().mockResolvedValue([
    { text: "This is a test Markdown section with enough content.", pageNumber: 1 },
  ]),
}));
vi.mock("@/lib/chunking", () => ({
  chunkText: vi.fn().mockResolvedValue([
    { content: "This is a test chunk with enough characters.", page: 1, chunkIndex: 0 },
  ]),
}));
vi.mock("@/lib/embedding", () => ({
  embedTexts: vi.fn().mockResolvedValue([[0.1, 0.2, 0.3]]),
}));
vi.mock("@/lib/promptGuard", () => ({
  guardChunkContent: vi.fn().mockReturnValue({ flagged: new Set<number>(), flaggedCount: 0 }),
}));

const mockFindOne = vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(null) });
const mockCreate = vi.fn().mockResolvedValue({
  _id: { toString: () => "new-doc-id" },
});

vi.mock("@/models/Document", () => ({
  Document: {
    findOne: mockFindOne,
    create: mockCreate,
  },
}));
vi.mock("@/models/Chunk", () => ({
  Chunk: {
    insertMany: vi.fn().mockResolvedValue([]),
  },
}));

function makeFormData(filename: string, content: string, type: string): FormData {
  const blob = new Blob([content], { type });
  const form = new FormData();
  form.append("file", new File([blob], filename, { type }));
  return form;
}

describe("POST /api/ingest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindOne.mockReturnValue({ lean: vi.fn().mockResolvedValue(null) });
    mockCreate.mockResolvedValue({ _id: { toString: () => "new-doc-id" } });
  });

  it("returns 400 when no file is provided", async () => {
    const { POST } = await import("@/app/api/ingest/route");

    const form = new FormData();
    const req = new NextRequest("http://localhost/api/ingest", {
      method: "POST",
      body: form,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for unsupported file type", async () => {
    const { POST } = await import("@/app/api/ingest/route");

    const form = makeFormData("image.png", "data", "image/png");
    const req = new NextRequest("http://localhost/api/ingest", {
      method: "POST",
      body: form,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for empty file", async () => {
    const { POST } = await import("@/app/api/ingest/route");

    const blob = new Blob([""], { type: "application/pdf" });
    const form = new FormData();
    form.append("file", new File([blob], "empty.pdf", { type: "application/pdf" }));
    const req = new NextRequest("http://localhost/api/ingest", {
      method: "POST",
      body: form,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 409 for duplicate file", async () => {
    mockFindOne.mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: "existing", filename: "test.md" }),
    });

    const { POST } = await import("@/app/api/ingest/route");
    const form = makeFormData("test.md", "# Hello\n\nThis is markdown content.", "text/markdown");
    const req = new NextRequest("http://localhost/api/ingest", {
      method: "POST",
      body: form,
    });
    const res = await POST(req);
    expect(res.status).toBe(409);
  });

  it("returns 200 with documentId for valid Markdown file", async () => {
    const { POST } = await import("@/app/api/ingest/route");

    const form = makeFormData("lecture.md", "# Topic\n\nSome content here that is long enough.", "text/markdown");
    const req = new NextRequest("http://localhost/api/ingest", {
      method: "POST",
      body: form,
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.documentId).toBe("new-doc-id");
    expect(json.chunkCount).toBeGreaterThanOrEqual(1);
  });
});
