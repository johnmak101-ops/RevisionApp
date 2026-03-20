import { describe, it, expect } from "vitest";
import { chunkText } from "../chunking";

describe("chunkText", () => {
  it("returns [] for empty pages array", async () => {
    expect(await chunkText([])).toEqual([]);
  });

  it("returns [] when all pages are empty", async () => {
    const pages = [{ text: "", pageNumber: 1 }];
    expect(await chunkText(pages)).toEqual([]);
  });

  it("filters out chunks shorter than 20 chars", async () => {
    const pages = [{ text: "short", pageNumber: 1 }];
    const result = await chunkText(pages);
    // "short" is 5 chars → should be filtered
    expect(result).toEqual([]);
  });

  it("keeps chunks with 20+ chars", async () => {
    const text = "This is a sentence with enough characters to pass the minimum.";
    const pages = [{ text, pageNumber: 1 }];
    const result = await chunkText(pages);
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0].content.length).toBeGreaterThanOrEqual(20);
  });

  it("preserves correct page numbers", async () => {
    const pages = [
      { text: "A".repeat(100), pageNumber: 3 },
      { text: "B".repeat(100), pageNumber: 7 },
    ];
    const result = await chunkText(pages);
    expect(result.length).toBeGreaterThanOrEqual(2);
    const page3Chunks = result.filter((c) => c.page === 3);
    const page7Chunks = result.filter((c) => c.page === 7);
    expect(page3Chunks.length).toBeGreaterThanOrEqual(1);
    expect(page7Chunks.length).toBeGreaterThanOrEqual(1);
  });

  it("assigns sequential chunkIndex across pages", async () => {
    const pages = [
      { text: "First page content that is definitely long enough to be kept.", pageNumber: 1 },
      { text: "Second page content that is also long enough to be retained.", pageNumber: 2 },
    ];
    const result = await chunkText(pages);
    result.forEach((chunk, i) => {
      expect(chunk.chunkIndex).toBe(i);
    });
  });

  it("splits long text into multiple chunks", async () => {
    // 512 * 3 = 1536 chars → should produce multiple chunks
    const longText = "Lorem ipsum dolor sit amet. ".repeat(80);
    const pages = [{ text: longText, pageNumber: 1 }];
    const result = await chunkText(pages);
    expect(result.length).toBeGreaterThan(1);
  });

  it("chunk content does not exceed ~CHUNK_SIZE characters", async () => {
    const longText = "The quick brown fox jumps over the lazy dog. ".repeat(50);
    const pages = [{ text: longText, pageNumber: 1 }];
    const result = await chunkText(pages);
    for (const chunk of result) {
      // Allow some tolerance since splitter can overshoot slightly
      expect(chunk.content.length).toBeLessThanOrEqual(600);
    }
  });

  it("keeps a pipe table block as a single chunk", async () => {
    const table = [
      "| Type     | Use             | State       |",
      "|----------|-----------------|-------------|",
      "| Server   | Data fetching   | None        |",
      "| Client   | Interactivity   | useState    |",
      "| Presentational | UI display | Props only |",
    ].join("\n");
    const pages = [{ text: table, pageNumber: 1 }];
    const result = await chunkText(pages);
    // The entire table must be in exactly one chunk
    expect(result).toHaveLength(1);
    expect(result[0].content).toContain("| Server");
    expect(result[0].content).toContain("| Client");
  });

  it("does not split a table row across chunks", async () => {
    const table = [
      "| Column A | Column B | Column C |",
      "|----------|----------|----------|",
      "| val1     | val2     | val3     |",
      "| val4     | val5     | val6     |",
      "| val7     | val8     | val9     |",
    ].join("\n");
    const pages = [{ text: table, pageNumber: 1 }];
    const result = await chunkText(pages);
    for (const chunk of result) {
      // Every pipe line inside the chunk must be intact (not cut mid-row)
      const pipeLines = chunk.content.split("\n").filter((l) => l.includes("|"));
      for (const line of pipeLines) {
        // A valid table row has at least 2 `|` characters
        expect((line.match(/\|/g) ?? []).length).toBeGreaterThanOrEqual(2);
      }
    }
  });
});
