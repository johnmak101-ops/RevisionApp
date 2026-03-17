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
  /** 區塊文字內容 */
  content: string;
  /** 來源頁碼（1-based） */
  page: number;
  /** 該區塊的全域序號 */
  chunkIndex: number;
}

/** LangChain splitter — 按語義邊界（段落 → 句號 → 空格）遞迴分割 */
const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: CHUNK_SIZE,
  chunkOverlap: CHUNK_OVERLAP,
  separators: ["\n\n", "\n", ". ", "! ", "? ", ", ", " ", ""],
});

/**
 * 將多頁文字切分成適合 embedding 的小區塊。
 *
 * @param pages - 從 PDF / Markdown 提取的頁面陣列
 * @returns 過濾過短內容後的 {@link TextChunk} 陣列
 */
export async function chunkText(
  pages: { text: string; pageNumber: number }[]
): Promise<TextChunk[]> {
  const allChunks: TextChunk[] = [];

  for (const page of pages) {
    const docs = await splitter.createDocuments([page.text]);

    for (const doc of docs) {
      const trimmed = doc.pageContent.trim();
      if (trimmed.length >= MIN_CHUNK_LENGTH) {
        allChunks.push({
          content: trimmed,
          page: page.pageNumber,
          chunkIndex: allChunks.length,
        });
      }
    }
  }

  return allChunks;
}
