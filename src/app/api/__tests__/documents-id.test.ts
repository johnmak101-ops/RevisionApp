import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({ connectDB: vi.fn() }));

const mockFindById = vi.fn();
const mockFindByIdAndDelete = vi.fn();
vi.mock("@/models/Document", () => ({
  Document: {
    findById: (...args: unknown[]) => mockFindById(...args),
    findByIdAndDelete: (...args: unknown[]) => mockFindByIdAndDelete(...args),
  },
}));

const mockChunkDeleteMany = vi.fn();
vi.mock("@/models/Chunk", () => ({
  Chunk: {
    deleteMany: (...args: unknown[]) => mockChunkDeleteMany(...args),
  },
}));

const mockQuizDeleteMany = vi.fn();
vi.mock("@/models/QuizAttempt", () => ({
  QuizAttempt: {
    deleteMany: (...args: unknown[]) => mockQuizDeleteMany(...args),
  },
}));

const VALID_ID = "507f1f77bcf86cd799439011";

describe("DELETE /api/documents/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindById.mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: VALID_ID, filename: "a.pdf" }),
    });
    mockChunkDeleteMany.mockResolvedValue({ deletedCount: 3 });
    mockQuizDeleteMany.mockResolvedValue({ deletedCount: 0 });
    mockFindByIdAndDelete.mockResolvedValue({ _id: VALID_ID });
  });

  it("returns 400 for invalid id", async () => {
    const { DELETE } = await import("@/app/api/documents/[id]/route");
    const res = await DELETE(new NextRequest("http://localhost/api/documents/bad"), {
      params: Promise.resolve({ id: "not-hex" }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 404 when document missing", async () => {
    mockFindById.mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    });
    const { DELETE } = await import("@/app/api/documents/[id]/route");
    const res = await DELETE(new NextRequest(`http://localhost/api/documents/${VALID_ID}`), {
      params: Promise.resolve({ id: VALID_ID }),
    });
    expect(res.status).toBe(404);
  });

  it("deletes chunks, quiz attempts, and document", async () => {
    const { DELETE } = await import("@/app/api/documents/[id]/route");
    const res = await DELETE(new NextRequest(`http://localhost/api/documents/${VALID_ID}`), {
      params: Promise.resolve({ id: VALID_ID }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.deletedDocumentId).toBe(VALID_ID);
    expect(json.deletedChunks).toBe(3);
    expect(mockChunkDeleteMany).toHaveBeenCalledWith({ pdfId: VALID_ID });
    expect(mockQuizDeleteMany).toHaveBeenCalledWith({ documentId: VALID_ID });
    expect(mockFindByIdAndDelete).toHaveBeenCalledWith(VALID_ID);
  });
});
