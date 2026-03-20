import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

// ─── Chunking 常數 ────────────────────────────
/** 每個 chunk 的最大字元數 */
const CHUNK_SIZE = 512;
/** 相鄰 chunk 的重疊字元數，確保語義連貫 */
const CHUNK_OVERLAP = 100;
/** 短於此長度的 chunk 會被丟棄（避免噪音） */
const MIN_CHUNK_LENGTH = 20;
/**
 * 一個 block 被視為 table 所需的最少 pipe (`|`) 行數比例。
 * 超過此比例的行以 `|` 開頭或包含 `|`，即視為 table block。
 */
const TABLE_PIPE_RATIO = 0.5;

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
 * 判斷一個文字 block 是否為 table。
 *
 * 判斷邏輯（heuristic）：
 * - 至少 2 行
 * - 超過 TABLE_PIPE_RATIO 比例的行包含 `|` 字元
 *
 * 可識別：
 * - Markdown pipe tables（`| col | col |`）
 * - ASCII divider tables（`+---+---+`）
 * - 簡單 column-separated lines
 */
function isTableBlock(block: string): boolean {
  const lines = block.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length < 2) return false;

  const pipeLines = lines.filter((l) => l.includes("|")).length;
  return pipeLines / lines.length >= TABLE_PIPE_RATIO;
}

/**
 * 將多頁文字切分成適合 embedding 的小區塊。
 *
 * 流程：
 * 1. 每頁文字按雙換行切成多個 block。
 * 2. Table block → 直接作為一個 chunk 保留（不分拆）。
 * 3. 非 table block → 交給 RecursiveCharacterTextSplitter 正常切分。
 *
 * @param pages - 從 PDF / Markdown 提取的頁面陣列
 * @returns 過濾過短內容後的 {@link TextChunk} 陣列
 */
export async function chunkText(
  pages: { text: string; pageNumber: number }[]
): Promise<TextChunk[]> {
  const allChunks: TextChunk[] = [];

  for (const page of pages) {
    // 分成 block（以雙換行為段落邊界）
    const blocks = page.text
      .split(/\n{2,}/)
      .map((b) => b.trim())
      .filter((b) => b.length >= MIN_CHUNK_LENGTH);

    for (const block of blocks) {
      if (isTableBlock(block)) {
        // Table block：整個保留，唔分拆
        allChunks.push({
          content: block,
          page: page.pageNumber,
          chunkIndex: allChunks.length,
        });
      } else {
        // 非 table：正常 recursive split
        const docs = await splitter.createDocuments([block]);
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
    }
  }

  return allChunks;
}
