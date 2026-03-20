/**
 * @module pdf
 *
 * PDF 文字提取模組 — 使用 LlamaParse Cloud API。
 * 相比 pdf-parse，LlamaParse 能正確處理複雜排版、表格、
 * 以及 glyph 定位問題（無斷詞 artifact）。
 *
 * 流程：Upload PDF → 等待解析完成 → 取得 Markdown → 按頁分割
 */

const LLAMA_CLOUD_API_KEY = process.env.LLAMA_CLOUD_API_KEY ?? "";
const LLAMA_BASE = "https://api.cloud.llamaindex.ai/api/parsing";

/** Poll 間隔（ms） */
const POLL_INTERVAL_MS = 2500;
/** 最多等 75 秒（30 × 2.5s） */
const MAX_POLL_ATTEMPTS = 30;

export interface PdfPage {
  text: string;
  pageNumber: number;
}

// ─── LlamaParse REST Helpers ──────────────────────────────────────────────────

/** 上傳 PDF buffer，返回 job ID */
async function uploadPdf(buffer: Buffer, filename: string): Promise<string> {
  if (!LLAMA_CLOUD_API_KEY) {
    throw new Error(
      "[LlamaParse] LLAMA_CLOUD_API_KEY 未設定，請加入 .env.local"
    );
  }

  // Convert Buffer → Uint8Array so Blob constructor receives a proper ArrayBufferView
  const blob = new Blob([new Uint8Array(buffer)], { type: "application/pdf" });
  const form = new FormData();
  form.append("file", blob, filename);

  const res = await fetch(`${LLAMA_BASE}/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${LLAMA_CLOUD_API_KEY}` },
    body: form,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`[LlamaParse] Upload failed ${res.status}: ${body}`);
  }

  const data = (await res.json()) as { id: string };
  return data.id;
}

/** 輪詢 job 狀態直至 SUCCESS 或 ERROR */
async function waitForJob(jobId: string): Promise<void> {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

    const res = await fetch(`${LLAMA_BASE}/job/${jobId}`, {
      headers: { Authorization: `Bearer ${LLAMA_CLOUD_API_KEY}` },
    });

    if (!res.ok) {
      throw new Error(`[LlamaParse] Status check failed ${res.status}`);
    }

    const data = (await res.json()) as { status: string; error?: string };

    if (data.status === "SUCCESS") return;
    if (data.status === "ERROR") {
      throw new Error(`[LlamaParse] Job error: ${data.error ?? "unknown"}`);
    }
    // PENDING / PROCESSING — keep polling
  }

  throw new Error(
    `[LlamaParse] Job ${jobId} timed out after ${(MAX_POLL_ATTEMPTS * POLL_INTERVAL_MS) / 1000}s`
  );
}

/** 取得解析結果（Markdown）*/
async function fetchMarkdown(jobId: string): Promise<string> {
  const res = await fetch(`${LLAMA_BASE}/job/${jobId}/result/markdown`, {
    headers: { Authorization: `Bearer ${LLAMA_CLOUD_API_KEY}` },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`[LlamaParse] Result fetch failed ${res.status}: ${body}`);
  }

  const data = (await res.json()) as { markdown: string };
  return data.markdown ?? "";
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * 使用 LlamaParse 提取 PDF 文字，返回按頁分割嘅 `PdfPage[]`。
 *
 * LlamaParse 以 `---` 分隔頁面，本函數將其還原為頁碼陣列。
 *
 * @param buffer - PDF 檔案 buffer
 * @param filename - 原始檔名（送給 LlamaParse 顯示用，影響解析提示）
 */
export async function extractPdfText(
  buffer: Buffer,
  filename = "document.pdf"
): Promise<PdfPage[]> {
  console.info(`[LlamaParse] Uploading "${filename}"...`);
  const jobId = await uploadPdf(buffer, filename);

  console.info(`[LlamaParse] Job ${jobId} — processing...`);
  await waitForJob(jobId);

  console.info(`[LlamaParse] Fetching result for job ${jobId}...`);
  const markdown = await fetchMarkdown(jobId);

  // LlamaParse 以 "\n---\n" 分頁
  const pages: PdfPage[] = markdown
    .split(/\n---\n/)
    .map((text, i) => ({ text: text.trim(), pageNumber: i + 1 }))
    .filter((p) => p.text.length > 0);

  console.info(`[LlamaParse] ✅ Extracted ${pages.length} page(s)`);
  return pages;
}
