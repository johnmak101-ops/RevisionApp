import { connectDB } from "./db";
import { Chunk } from "@/models/Chunk";
import { embedText } from "./embedding";
import { toolLLM } from "./llm";

/** MongoDB Atlas vector search index 名稱 */
const VECTOR_INDEX = "chunk_vector_index";
/** ANN 候選數量，小型知識庫 50 已足夠精準 */
const NUM_CANDIDATES = 50;
/** 回傳的最大結果數 */
const LIMIT = 5;
/** Multi-query 每個子查詢的最大搜尋結果數 */
const SUBQUERY_LIMIT = 4;
/** Multi-query 合併後回傳的最大結果數 */
const MULTI_QUERY_LIMIT = 8;

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

// ─────────────────────────────────────────────
// Multi-Query Search
// ─────────────────────────────────────────────

/**
 * 用 LLM 把用戶問題拆成多個搜尋角度，並行搜尋後合併去重。
 *
 * 比喻：現在係用 3 個唔同方式問同一個問題，
 * 比只問一次搵到更多相關內容。
 *
 * @param question - 用戶原問題
 * @returns 合併去重後，按相關度排序的最佳 chunks
 */
export async function multiQuerySearch(question: string): Promise<SearchResult[]> {
  // ── Step 1: 用 LLM 生成 3 個搜尋角度 ────────
  let subQueries: string[] = [question]; // 預設只用原問題（fallback）

  try {
    const QUERY_GEN_PROMPT = `You are a search query optimizer for a document retrieval system.
Given a user question, generate exactly 3 alternative search queries that rephrase the question from different angles.

STRICT RULES:
- Stay strictly within the topic of the original question
- Do NOT introduce any programming languages, frameworks, or tools NOT explicitly mentioned
- Do NOT assume what kind of document the user has — work only from the question itself
- Use synonyms, broader phrasing, and more specific phrasing as your 3 angles

Return ONLY a JSON array of 3 strings, no explanation.
Example input: "explain variable naming"
Example output: ["rules for naming variables", "variable name conventions and restrictions", "what characters are allowed in variable names"]`;

    const msg = await toolLLM.invoke([
      { role: "system", content: QUERY_GEN_PROMPT },
      { role: "user", content: question },
    ]);

    const raw = typeof msg.content === "string" ? msg.content.trim() : "";
    const match = raw.match(/\[[\s\S]*\]/);
    if (match) {
      const parsed = JSON.parse(match[0]) as unknown[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        subQueries = parsed
          .filter((q): q is string => typeof q === "string" && q.length > 2)
          .slice(0, 3);
        console.info(`[MultiQuery] Generated ${subQueries.length} sub-queries:`, subQueries);
      }
    }
  } catch (err) {
    console.warn("[MultiQuery] LLM query generation failed, using original question:", err instanceof Error ? err.message : err);
  }

  // ── Step 2: 並行搜尋所有子查詢 ──────────────
  const allResults = await Promise.all(
    subQueries.map((q) => vectorSearch(q, SUBQUERY_LIMIT))
  );

  // ── Step 3: 合併 + 去重（content 相同 = 同一 chunk，保留最高分） ──
  const seen = new Map<string, SearchResult>();
  for (const results of allResults) {
    for (const r of results) {
      const key = r.content.slice(0, 100); // 用前 100 字作去重 key
      const existing = seen.get(key);
      if (!existing || (r.score ?? 0) > (existing.score ?? 0)) {
        seen.set(key, r);
      }
    }
  }

  // ── Step 4: 按分數排序，取最佳 MULTI_QUERY_LIMIT 條 ──
  const merged = [...seen.values()]
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, MULTI_QUERY_LIMIT);

  console.info(`[MultiQuery] Final merged results: ${merged.length} chunks`);
  return merged;
}
