import { connectDB } from "./db";
import { Chunk } from "@/models/Chunk";
import { embedText } from "./embedding";

/** MongoDB Atlas vector search index 名稱 */
const VECTOR_INDEX = "chunk_vector_index";
/** ANN 候選數量，小型知識庫 50 已足夠精準 */
const NUM_CANDIDATES = 50;
/** 回傳的最大結果數 */
const LIMIT = 5;

/** 向量搜尋結果的統一格式 */
export interface SearchResult {
  /** chunk 文字內容 */
  content: string;
  /** 來源頁碼 */
  page: number;
  /** 所屬文件 ID */
  pdfId: string;
  /** 向量相似度分數（0–1），關鍵字備援時固定為 0.5 */
  score?: number;
}

function mapResults(results: { content: string; page: number; pdfId: { toString?: () => string } | string; score?: number }[]): SearchResult[] {
  return results.map((r) => ({
    content: r.content,
    page: r.page,
    pdfId: typeof r.pdfId === "object" && r.pdfId?.toString ? r.pdfId.toString() : String(r.pdfId),
    score: r.score,
  }));
}

/**
 * 關鍵字備援搜尋：當向量搜尋無結果時，用 `$regex` 搜尋 content（任一關鍵字匹配）。
 *
 * @param query - 用戶查詢字串
 * @param limit - 最大回傳筆數
 * @returns 符合關鍵字的 chunk 結果
 * @internal
 */
async function keywordFallback(query: string, limit: number): Promise<SearchResult[]> {
  const words = query
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 1)
    .slice(0, 5);
  if (words.length === 0) return [];

  const conditions = words.map((w) => ({ content: { $regex: escapeRegex(w), $options: "i" } }));
  const results = await Chunk.find({ $or: conditions })
    .limit(limit)
    .select("content page pdfId")
    .lean();

  return mapResults(
    results.map((r) => ({
      content: r.content,
      page: r.page,
      pdfId: r.pdfId,
      score: 0.5,
    }))
  );
}

/** 跳脫 regex 特殊字元，用於安全建構 `$regex` 過濾器 */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * 執行向量搜尋（MongoDB Atlas `$vectorSearch`），失敗時自動 fallback 到關鍵字搜尋。
 *
 * @param query - 用戶查詢字串
 * @param limit - 最大回傳筆數（預設 5）
 * @returns 排序後的相似 chunk 結果
 */
export async function vectorSearch(
  query: string,
  limit = LIMIT
): Promise<SearchResult[]> {
  await connectDB();

  let results: SearchResult[] = [];

  try {
    const queryVector = await embedText(query);
    console.info(
      `[Search] Query vector: ${queryVector.length}d, query: "${query.slice(0, 50)}"`
    );
    const agg = await Chunk.aggregate([
      {
        $vectorSearch: {
          index: VECTOR_INDEX,
          path: "embedding",
          queryVector,
          numCandidates: NUM_CANDIDATES,
          limit,
        },
      },
      { $project: { content: 1, page: 1, pdfId: 1, score: { $meta: "vectorSearchScore" } } },
    ]);
    results = mapResults(agg);
    if (results.length > 0) {
      console.info(
        `[Search] Vector results: ${results.length}, scores: [${results.map((r) => r.score?.toFixed(3)).join(", ")}]`
      );
    } else {
      console.info("[Search] Vector search returned 0 results");
    }
  } catch (err) {
    console.error(
      "[Search] $vectorSearch failed:",
      err instanceof Error ? err.message : err
    );
    // 向量索引可能未建立或 embedding 出錯，改用關鍵字
  }

  if (results.length === 0) {
    results = await keywordFallback(query, limit);
  }

  return results;
}
