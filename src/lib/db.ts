import mongoose from "mongoose";

/**
 * 從環境變數讀取並驗證 MongoDB 連線字串。
 * 會自動移除多餘引號（`.env` 常見問題）。
 *
 * @returns 驗證後的 MongoDB URI
 * @throws {Error} 若 `MONGODB_URI` 未設定或格式不正確
 */
function getMongoUri(): string {
  let uri = process.env.MONGODB_URI?.trim() ?? "";
  uri = uri.replace(/^["']|["']$/g, "");
  if (!uri) {
    throw new Error("Please define MONGODB_URI in .env.local");
  }
  if (!uri.startsWith("mongodb://") && !uri.startsWith("mongodb+srv://")) {
    throw new Error('MONGODB_URI must start with "mongodb://" or "mongodb+srv://"');
  }
  return uri;
}

/** 快取 mongoose 連線，避免 Next.js HMR 時重複建立連線 */
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongoose: MongooseCache | undefined;
}

const cached = global.mongoose ?? { conn: null, promise: null };

if (process.env.NODE_ENV !== "production") {
  global.mongoose = cached;
}

/**
 * 取得共用的 MongoDB 連線（cached connection pattern）。
 * 開發模式下會快取到 `global` 避免 HMR 重複連線；
 * Production（Vercel serverless）每個 instance 各自持有連線。
 *
 * @returns mongoose 實例
 */
export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(getMongoUri());
  }
  cached.conn = await cached.promise;
  return cached.conn;
}
