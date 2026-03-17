import { describe, it, expect } from "vitest";
import { extractMdText } from "../md";

describe("extractMdText", () => {
  it("returns [] for empty buffer", async () => {
    const buf = Buffer.from("");
    expect(await extractMdText(buf)).toEqual([]);
  });

  it("returns [] for whitespace-only buffer", async () => {
    const buf = Buffer.from("   \n\n   ");
    expect(await extractMdText(buf)).toEqual([]);
  });

  it("returns single section when no headings present", async () => {
    const buf = Buffer.from("Just some plain text without any headings.");
    const result = await extractMdText(buf);
    expect(result).toHaveLength(1);
    expect(result[0].pageNumber).toBe(1);
    expect(result[0].text).toBe("Just some plain text without any headings.");
  });

  it("splits on ## headings", async () => {
    const md = `## Section One\nContent A\n\n## Section Two\nContent B`;
    const result = await extractMdText(Buffer.from(md));
    expect(result).toHaveLength(2);
    expect(result[0].text).toContain("Section One");
    expect(result[1].text).toContain("Section Two");
    expect(result[0].pageNumber).toBe(1);
    expect(result[1].pageNumber).toBe(2);
  });

  it("splits on mixed heading levels", async () => {
    const md = `# Title\nIntro\n## Sub\nBody\n### Deep\nDetail`;
    const result = await extractMdText(Buffer.from(md));
    expect(result.length).toBeGreaterThanOrEqual(3);
  });

  it("trims whitespace from sections", async () => {
    const md = `## A \n  content  \n\n## B \n  more  `;
    const result = await extractMdText(Buffer.from(md));
    for (const section of result) {
      expect(section.text).toBe(section.text.trim());
    }
  });

  it("assigns sequential pageNumbers starting at 1", async () => {
    const md = `## X\na\n## Y\nb\n## Z\nc`;
    const result = await extractMdText(Buffer.from(md));
    result.forEach((s, i) => {
      expect(s.pageNumber).toBe(i + 1);
    });
  });
});
