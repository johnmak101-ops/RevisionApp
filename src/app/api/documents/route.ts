import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Document } from "@/models/Document";

/**
 * `GET /api/documents` — 列出所有已上傳文件（按上傳時間倒序）。
 * @returns `IDocument[]` JSON array
 */
export async function GET() {
  try {
    await connectDB();
    const docs = await Document.find()
      .sort({ uploadedAt: -1 })
      .select("filename originalName chunkCount uploadedAt")
      .lean();

    return NextResponse.json(docs);
  } catch (err) {
    console.error("[Documents] list error:", err);
    return NextResponse.json(
      { error: "無法取得文件列表" },
      { status: 500 }
    );
  }
}
