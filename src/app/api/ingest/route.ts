import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Document } from "@/models/Document";
import { Chunk } from "@/models/Chunk";
import { extractPdfText } from "@/lib/pdf";
import { extractMdText } from "@/lib/md";
import { chunkText } from "@/lib/chunking";
import { embedTexts } from "@/lib/embedding";
import { guardChunkContent } from "@/lib/promptGuard";

/** 可接受的 PDF MIME types */
const PDF_TYPES = ["application/pdf", "application/x-pdf"];
/** 可接受的 Markdown MIME types */
const MD_TYPES = ["text/markdown", "text/x-markdown"];

/**
 * 檢查檔案是否為支援的格式（PDF / Markdown）。
 * 同時比對副檔名與 MIME type，以防部分瀏覽器不帶 type。
 */
function isAcceptedFile(file: File): boolean {
  const ext = "." + (file.name.split(".").pop() ?? "").toLowerCase();
  const extOk = [".pdf", ".md", ".markdown"].includes(ext);
  const typeOk = PDF_TYPES.includes(file.type) || MD_TYPES.includes(file.type);
  return extOk || typeOk;
}

/**
 * `POST /api/ingest` — 上傳 PDF/Markdown 並建立 embedding 索引。
 *
 * 流程：驗證 → 解析 → 切分 → embedding → 存入 MongoDB。
 *
 * @returns `{ success, documentId, chunkCount }` 或 error JSON
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file || !isAcceptedFile(file)) {
      return NextResponse.json(
        { error: "請上傳 PDF 或 Markdown (.md) 檔案" },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        { error: "檔案為空，請選擇有效的檔案" },
        { status: 400 }
      );
    }

    const MAX_SIZE_MB = 100;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return NextResponse.json(
        { error: `檔案過大，上限 ${MAX_SIZE_MB}MB` },
        { status: 413 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const isPdf = PDF_TYPES.includes(file.type) || file.name.toLowerCase().endsWith(".pdf");

    let pages: { text: string; pageNumber: number }[];
    try {
      pages = isPdf ? await extractPdfText(buffer, file.name) : await extractMdText(buffer);
    } catch (parseErr) {
      console.error("Parse error:", parseErr);
      return NextResponse.json(
        { error: isPdf ? "PDF 解析失敗，請確認檔案未損壞" : "Markdown 解析失敗" },
        { status: 400 }
      );
    }

    const rawChunks = await chunkText(pages);

    if (rawChunks.length === 0) {
      return NextResponse.json(
        {
          error: isPdf
            ? "無法從 PDF 提取文字（OCR 也未能識別），請確認檔案清晰可讀"
            : "無法從檔案中提取文字內容",
        },
        { status: 400 }
      );
    }

    // ── Indirect prompt injection 掃描 ──
    const { flagged, flaggedCount } = guardChunkContent(rawChunks);
    const textChunks = flaggedCount > 0
      ? rawChunks.filter((_, i) => !flagged.has(i))
      : rawChunks;

    if (textChunks.length === 0) {
      return NextResponse.json(
        { error: "所有內容被安全系統標記為可疑，無法處理此檔案" },
        { status: 422 }
      );
    }

    await connectDB();

    // 去重：同名文件已存在則拒絕
    const existing = await Document.findOne({ filename: file.name }).lean();
    if (existing) {
      return NextResponse.json(
        {
          error: `「${file.name}」已上傳過。請先喺下方「已索引文件」刪除該筆後再試。`,
        },
        { status: 409 }
      );
    }

    const doc = await Document.create({
      filename: file.name,
      originalName: file.name,
      chunkCount: textChunks.length,
    });

    const embeddings = await embedTexts(textChunks.map((c) => c.content));

    const chunks = textChunks.map((tc, i) => ({
      content: tc.content,
      embedding: embeddings[i],
      pdfId: doc._id,
      page: tc.page,
      chunkIndex: tc.chunkIndex,
      filename: file.name,
      chapter: tc.chapter,
    }));

    await Chunk.insertMany(chunks);

    return NextResponse.json({
      success: true,
      documentId: doc._id.toString(),
      chunkCount: chunks.length,
      ...(flaggedCount > 0 && {
        warning: `${flaggedCount} 個內容片段被安全系統標記並移除`,
        flaggedChunks: flaggedCount,
      }),
    });
  } catch (err) {
    console.error("Ingest error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Ingest failed" },
      { status: 500 }
    );
  }
}
