import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

// ─── Chunking 常數 ────────────────────────────
/** 每個 chunk 的最大字元數 */
const CHUNK_SIZE = 512;
/** 相鄰 chunk 的重疊字元數，確保語義連貫 */
const CHUNK_OVERLAP = 100;
/** 短於此長度的 chunk 會被丟棄（避免噪音） */
const MIN_CHUNK_LENGTH = 20;

/** 從文件頁面切分出來的單一文字區塊 */
export interface TextChunk {
  /** 區塊文字內容（已含 header context prefix） */
  content: string;
  /** 來源頁碼（1-based） */
  page: number;
  /** 該區塊的全域序號 */
  chunkIndex: number;
  /** 所屬章節（h1 header 文字），供 MongoDB metadata filter 用 */
  chapter?: string;
}

/** LangChain splitter — 按語義邊界（段落 → 句號 → 空格）遞迴分割 */
const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: CHUNK_SIZE,
  chunkOverlap: CHUNK_OVERLAP,
  separators: ["\n\n", "\n", ". ", "! ", "? ", ", ", " ", ""],
});

// ─── Markdown Header 分段 ────────────────────────
// 仿 LangChain MarkdownHeaderTextSplitter：
// 按 #/##/### headers 分段，每段帶 header hierarchy metadata

interface HeaderSection {
  /** 該段落的文字內容（不含 header 行本身） */
  content: string;
  /** header 層級 breadcrumb，例 { h1: "Java", h2: "Data Types" } */
  headers: Record<string, string>;
}

const HEADER_REGEX = /^(#{1,3})\s+(.+)$/;

/**
 * 按 Markdown headers 分段，追蹤 header hierarchy。
 *
 * 例如：
 * ```
 * # Java Data Types
 * ## Primitive Types
 * some content here
 * ```
 * 會產生 { content: "some content here", headers: { h1: "Java Data Types", h2: "Primitive Types" } }
 */
function splitByHeaders(text: string): HeaderSection[] {
  const lines = text.split("\n");
  const sections: HeaderSection[] = [];

  // 追蹤當前 header hierarchy
  const currentHeaders: Record<string, string> = {};
  let currentLines: string[] = [];

  for (const line of lines) {
    const match = line.match(HEADER_REGEX);
    if (match) {
      // 遇到新 header → 先 flush 之前累積的內容
      if (currentLines.length > 0) {
        const content = currentLines.join("\n").trim();
        if (content.length >= MIN_CHUNK_LENGTH) {
          sections.push({ content, headers: { ...currentHeaders } });
        }
        currentLines = [];
      }

      // 更新 header hierarchy
      const level = match[1].length; // 1 = h1, 2 = h2, 3 = h3
      const headerText = match[2].trim();
      currentHeaders[`h${level}`] = headerText;

      // 清除更低層級的 headers（例如遇到新 h2 就清除 h3）
      for (let i = level + 1; i <= 3; i++) {
        delete currentHeaders[`h${i}`];
      }
    } else {
      currentLines.push(line);
    }
  }

  // Flush 最後一段
  if (currentLines.length > 0) {
    const content = currentLines.join("\n").trim();
    if (content.length >= MIN_CHUNK_LENGTH) {
      sections.push({ content, headers: { ...currentHeaders } });
    }
  }

  // 如果整份文件冇 headers，就將全文作為一個 section
  if (sections.length === 0 && text.trim().length >= MIN_CHUNK_LENGTH) {
    sections.push({ content: text.trim(), headers: {} });
  }

  return sections;
}

/**
 * 從 header hierarchy 建構 context prefix。
 *
 * 例：headers = { h1: "Java Data Types", h2: "Primitive Types" }
 * → "Java Data Types > Primitive Types\n\n"
 *
 * 呢個 prefix prepend 到每個 chunk 之前，令 embedding 模型
 * 理解到呢個 chunk 屬於邊個 section。
 */
function buildHeaderPrefix(headers: Record<string, string>): string {
  const parts: string[] = [];
  if (headers.h1) parts.push(headers.h1);
  if (headers.h2) parts.push(headers.h2);
  if (headers.h3) parts.push(headers.h3);
  if (parts.length === 0) return "";
  return parts.join(" > ") + "\n\n";
}

/**
 * 將多頁文字切分成適合 embedding 的小區塊。
 *
 * 流程：
 * 1. 每頁文字先用 splitByHeaders 按 markdown headers 分段。
 * 2. 每段帶 header metadata（h1 / h2 / h3 breadcrumb）。
 * 3. RecursiveCharacterTextSplitter 對過長段落做 sub-split。
 * 4. 每個 chunk 前加 header context prefix（例 "Java Data Types > Primitive Types"）。
 *
 * @param pages - 從 PDF / Markdown 提取的頁面陣列
 * @returns 過濾過短內容後的 {@link TextChunk} 陣列
 */
export async function chunkText(
  pages: { text: string; pageNumber: number }[]
): Promise<TextChunk[]> {
  const allChunks: TextChunk[] = [];

  for (const page of pages) {
    // Step 1: 按 markdown headers 分段
    const sections = splitByHeaders(page.text);

    // Step 2: 每段 sub-split + prepend header context
    for (const section of sections) {
      const headerPrefix = buildHeaderPrefix(section.headers);
      const subDocs = await textSplitter.createDocuments([section.content]);

      for (const subDoc of subDocs) {
        const trimmed = subDoc.pageContent.trim();
        if (trimmed.length >= MIN_CHUNK_LENGTH) {
          allChunks.push({
            content: headerPrefix + trimmed,
            page: page.pageNumber,
            chunkIndex: allChunks.length,
            chapter: section.headers.h1,
          });
        }
      }
    }
  }

  return allChunks;
}
