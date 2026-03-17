import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock DB + Model ──────────────────────────
vi.mock("@/lib/db", () => ({ connectDB: vi.fn() }));

const mockDocs = [
  { _id: "doc1", filename: "test.pdf", originalName: "test.pdf", chunkCount: 10, uploadedAt: new Date() },
  { _id: "doc2", filename: "notes.md", originalName: "notes.md", chunkCount: 5, uploadedAt: new Date() },
];

vi.mock("@/models/Document", () => ({
  Document: {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(mockDocs),
        }),
      }),
    }),
  },
}));

describe("GET /api/documents", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns document list as JSON", async () => {
    const { GET } = await import("@/app/api/documents/route");
    const response = await GET();
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toHaveLength(2);
    expect(json[0].filename).toBe("test.pdf");
    expect(json[1].filename).toBe("notes.md");
  });

  it("returns 500 when DB query fails", async () => {
    const { Document } = await import("@/models/Document");
    vi.mocked(Document.find).mockImplementationOnce(() => {
      throw new Error("DB down");
    });

    const { GET } = await import("@/app/api/documents/route");
    const response = await GET();
    expect(response.status).toBe(500);
    const json = await response.json();
    expect(json.error).toBeTruthy();
  });
});
