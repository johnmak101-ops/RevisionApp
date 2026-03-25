/**
 * @module embedding
 *
 * 文字向量化模組 — 直接 fetch OpenRouter `/v1/embeddings`。
 * 繞過 LangChain `OpenAIEmbeddings`，避免 response 格式不相容問題。
 *
 * 啟動時會自動 warmup 並偵測 embedding 維度（{@link getDetectedDimensions}）。
 */

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY ?? "";
const EMBED_MODEL =
  process.env.OPENROUTER_EMBED_MODEL ??
  "qwen/qwen3-embedding-4b";
const OPENROUTER_BASE = "https://openrouter.ai/api/v1";

if (!OPENROUTER_API_KEY) {
  console.error("[Embeddings] ⚠️ OPENROUTER_API_KEY not set!");
}

// ─── OpenRouter /v1/embeddings response 型別 ──
interface EmbeddingResponseData {
  object: string;
  index: number;
  embedding: number[];
}

interface EmbeddingResponse {
  object: string;
  data: EmbeddingResponseData[];
  model: string;
  usage: { prompt_tokens: number; total_tokens: number };
}

/**
 * 呼叫 OpenRouter embedding API。
 *
 * @param input - 單一或批次文字
 * @returns 按 index 排序的 embedding 向量陣列
 * @throws {Error} API 回傳非 2xx 或 data 為空時
 * @internal
 */
async function callEmbeddingAPI(
  input: string | string[]
): Promise<number[][]> {
  const res = await fetch(`${OPENROUTER_BASE}/embeddings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "http://localhost:3000",
    },
    body: JSON.stringify({ model: EMBED_MODEL, input }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(
      `[Embeddings] OpenRouter API error ${res.status}: ${errBody}`
    );
  }

  const json = (await res.json()) as EmbeddingResponse;

  if (!json.data || !Array.isArray(json.data) || json.data.length === 0) {
    throw new Error(
      `[Embeddings] 無效 response — data 為空 (model: ${EMBED_MODEL})。` +
        ` Response: ${JSON.stringify(json).slice(0, 300)}`
    );
  }

  // 按 index 排序確保順序正確
  const sorted = [...json.data].sort((a, b) => a.index - b.index);
  return sorted.map((d) => d.embedding);
}

// ─── Warmup + dimension detection ────────────
/** 啟動時偵測到的 embedding 維度，未 warmup 前為 `null` */
let detectedDimensions: number | null = null;

(async () => {
  try {
    const result = await callEmbeddingAPI("warmup");
    detectedDimensions = result[0].length;
    console.info(
      `[Embeddings] Warmup OK — OpenRouter (${EMBED_MODEL}), ${detectedDimensions}d`
    );
  } catch (err) {
    console.error(
      "[Embeddings] ⚠️ OpenRouter embedding warmup failed:",
      err instanceof Error ? err.message : err
    );
  }
})();

// ─── Public API ──────────────────────────────

/**
 * 將單一文字轉換為 embedding 向量。
 *
 * @param text - 要向量化的文字
 * @returns embedding 數值陣列
 */
export async function embedText(text: string): Promise<number[]> {
  const results = await callEmbeddingAPI(text);
  return results[0];
}

/**
 * 批次將多段文字轉換為 embedding 向量。
 * 自動按 `BATCH_SIZE`（20）分批，避免 API 限流。
 *
 * @param texts - 要向量化的文字陣列
 * @returns 對應順序的 embedding 陣列
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const BATCH_SIZE = 20;
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const batchResults = await callEmbeddingAPI(batch);
    allEmbeddings.push(...batchResults);
  }

  return allEmbeddings;
}

/**
 * 取得 warmup 後偵測到的 embedding 維度。
 * 若 warmup 尚未完成或失敗，回傳 `null`。
 *
 * @returns embedding 維度數（如 4096）或 `null`
 */
export function getDetectedDimensions(): number | null {
  return detectedDimensions;
}
