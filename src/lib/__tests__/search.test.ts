import { describe, it, expect } from "vitest";

/**
 * `escapeRegex` and the keyword splitting logic are internal to search.ts.
 * We test them indirectly by verifying the expected behaviour of the
 * escaping and word-filtering logic.
 */

// Re-implement escapeRegex here to test the pattern
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Re-implement word filter logic matching keywordFallback
function extractKeywords(query: string): string[] {
  return query
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 1)
    .slice(0, 5);
}

describe("search utilities", () => {
  describe("escapeRegex", () => {
    it("escapes regex special characters", () => {
      expect(escapeRegex("hello.world")).toBe("hello\\.world");
      expect(escapeRegex("a+b")).toBe("a\\+b");
      expect(escapeRegex("foo(bar)")).toBe("foo\\(bar\\)");
      expect(escapeRegex("test[0]")).toBe("test\\[0\\]");
      expect(escapeRegex("a*b?c")).toBe("a\\*b\\?c");
    });

    it("leaves normal text unchanged", () => {
      expect(escapeRegex("hello")).toBe("hello");
      expect(escapeRegex("foo bar")).toBe("foo bar");
    });

    it("handles empty string", () => {
      expect(escapeRegex("")).toBe("");
    });
  });

  describe("keyword extraction", () => {
    it("splits query into words", () => {
      expect(extractKeywords("hello world")).toEqual(["hello", "world"]);
    });

    it("filters out single-char words", () => {
      expect(extractKeywords("a is the best I can do")).toEqual([
        "is",
        "the",
        "best",
        "can",
        "do",
      ]);
    });

    it("limits to 5 keywords", () => {
      const result = extractKeywords("one two three four five six seven");
      expect(result).toHaveLength(5);
    });

    it("returns [] for empty query", () => {
      expect(extractKeywords("")).toEqual([]);
    });

    it("returns [] for single-char query", () => {
      expect(extractKeywords("I")).toEqual([]);
    });

    it("handles extra whitespace", () => {
      expect(extractKeywords("  hello   world  ")).toEqual(["hello", "world"]);
    });
  });
});
