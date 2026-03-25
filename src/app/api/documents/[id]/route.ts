import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Document } from "@/models/Document";
import { Chunk } from "@/models/Chunk";
import { QuizAttempt } from "@/models/QuizAttempt";
import { guardDocumentId } from "@/lib/promptGuard";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * `DELETE /api/documents/[id]` — 刪除指定文件及其所有 chunks，並移除關聯嘅 QuizAttempt。
 */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    if (!guardDocumentId(id)) {
      return NextResponse.json(
        { error: "無效嘅文件 ID" },
        { status: 400 }
      );
    }

    await connectDB();

    const doc = await Document.findById(id).lean();
    if (!doc) {
      return NextResponse.json(
        { error: "搵唔到呢份文件" },
        { status: 404 }
      );
    }

    const chunkResult = await Chunk.deleteMany({ pdfId: id });
    await QuizAttempt.deleteMany({ documentId: id });
    await Document.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      deletedDocumentId: id,
      deletedChunks: chunkResult.deletedCount ?? 0,
    });
  } catch (err) {
    console.error("[Documents] delete error:", err);
    return NextResponse.json(
      { error: "無法刪除文件" },
      { status: 500 }
    );
  }
}
