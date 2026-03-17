import mongoose, { Schema, model, models } from "mongoose";

/** 上傳文件的 MongoDB document 型別定義 */
export interface IDocument {
  _id: mongoose.Types.ObjectId;
  /** 顯示檔名 */
  filename: string;
  /** 原始上傳檔名 */
  originalName: string;
  /** 上傳時間 */
  uploadedAt: Date;
  /** 切分後的 chunk 總數 */
  chunkCount: number;
}

const DocumentSchema = new Schema<IDocument>(
  {
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
    chunkCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Document =
  models.Document ?? model<IDocument>("Document", DocumentSchema);
