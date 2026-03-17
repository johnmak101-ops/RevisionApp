import mongoose, { Schema, model, models } from "mongoose";

/** 單一文字區塊的 MongoDB document 型別定義 */
export interface IChunk {
  _id: mongoose.Types.ObjectId;
  /** 區塊文字內容 */
  content: string;
  /** 向量嵌入數值陣列 */
  embedding: number[];
  /** 關聯的 Document ID */
  pdfId: mongoose.Types.ObjectId;
  /** 來源頁碼 */
  page: number;
  /** 該文件內的 chunk 序號 */
  chunkIndex: number;
  /** 額外 metadata（如 OCR 信心度等） */
  metadata?: Record<string, unknown>;
}

const ChunkSchema = new Schema<IChunk>(
  {
    content: { type: String, required: true },
    embedding: {
      type: [Number],
      required: true,
      validate: {
        validator: (v: number[]) => Array.isArray(v) && v.length > 0,
        message: "Embedding must be a non-empty number array",
      },
    },
    pdfId: { type: Schema.Types.ObjectId, ref: "Document", required: true },
    page: { type: Number, required: true },
    chunkIndex: { type: Number, required: true, default: 0 },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

ChunkSchema.index({ pdfId: 1 });

export const Chunk = models.Chunk ?? model<IChunk>("Chunk", ChunkSchema);
