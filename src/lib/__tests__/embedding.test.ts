import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * embedding.ts has module-level side effects (warmup IIFE).
 * We mock `global.fetch` before import and reset modules between tests
 * to ensure each test starts fresh.
 */

function makeEmbeddingResponse(vectors: number[][]): object {
  return {
    object: "list",
    data: vectors.map((embedding, index) => ({
      object: "embedding",
      index,
      embedding,
    })),
    model: "test-model",
    usage: { prompt_tokens: 10, total_tokens: 10 },
  };
}

describe("embedding module", () => {
  const originalFetch = global.fetch;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    mockFetch = vi.fn();
    global.fetch = mockFetch;
    // Default: warmup call succeeds
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(makeEmbeddingResponse([[0.0, 0.1, 0.2]])),
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("embedText returns embedding vector", async () => {
    const fakeVector = [0.1, 0.2, 0.3];
    // Second call = actual embedText call
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(makeEmbeddingResponse([fakeVector])),
    });

    const mod = await import("../embedding");
    // Give warmup IIFE time to finish
    await new Promise((r) => setTimeout(r, 50));

    const result = await mod.embedText("hello");
    expect(result).toEqual(fakeVector);
  });

  it("embedTexts returns [] for empty input", async () => {
    const mod = await import("../embedding");
    const result = await mod.embedTexts([]);
    expect(result).toEqual([]);
  });

  it("embedTexts batches correctly", async () => {
    // 25 texts → should make 2 batch calls (20 + 5)
    const vecs = Array.from({ length: 25 }, (_, i) => [i * 0.1]);
    const batch1 = vecs.slice(0, 20);
    const batch2 = vecs.slice(20);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(makeEmbeddingResponse(batch1)),
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(makeEmbeddingResponse(batch2)),
    });

    const mod = await import("../embedding");
    await new Promise((r) => setTimeout(r, 50));

    const texts = Array.from({ length: 25 }, (_, i) => `text ${i}`);
    const result = await mod.embedTexts(texts);
    expect(result).toHaveLength(25);
    // 1 warmup + 2 batch = 3 total fetch calls
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it("throws on non-ok API response", async () => {
    // Override: error on the actual call
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: () => Promise.resolve("rate limited"),
    });

    const mod = await import("../embedding");
    await new Promise((r) => setTimeout(r, 50));

    await expect(mod.embedText("test")).rejects.toThrow("OpenRouter API error 429");
  });

  it("throws when API returns empty data", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          object: "list",
          data: [],
          model: "test",
          usage: { prompt_tokens: 0, total_tokens: 0 },
        }),
    });

    const mod = await import("../embedding");
    await new Promise((r) => setTimeout(r, 50));

    await expect(mod.embedText("test")).rejects.toThrow("data 為空");
  });

  it("getDetectedDimensions returns number after warmup", async () => {
    const mod = await import("../embedding");
    await new Promise((r) => setTimeout(r, 50));
    const dims = mod.getDetectedDimensions();
    expect(dims).toBe(3); // warmup response had 3 elements
  });
});
