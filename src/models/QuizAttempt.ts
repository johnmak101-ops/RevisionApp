import mongoose, { Schema, model, models } from "mongoose";

/** 單一選擇題的型別定義 */
export interface IQuestion {
  /** 題目文字 */
  question: string;
  /** 選項陣列（A–D） */
  options: string[];
  /** 正確答案索引（0-based） */
  correctIndex: number;
  /** 用戶的答案索引（提交後才有） */
  userAnswer?: number;
  /** 題目所屬主題標籤 */
  topic: string;
  /** 正確答案的解釋 */
  explanation: string;
}

/** 一次測驗的 MongoDB document 型別定義 */
export interface IQuizAttempt {
  _id: mongoose.Types.ObjectId;
  /** 關聯的文件 ID */
  documentId: mongoose.Types.ObjectId;
  /** 題目陣列 */
  questions: IQuestion[];
  /** 得分（提交後才有） */
  score?: number;
  /** 總題數 */
  totalQuestions: number;
  /** 提交時間 */
  submittedAt?: Date;
}

const QuestionSchema = new Schema<IQuestion>(
  {
    question: { type: String, required: true },
    options: { type: [String], required: true },
    correctIndex: { type: Number, required: true },
    userAnswer: { type: Number },
    topic: { type: String, required: true, default: "General" },
    explanation: { type: String, required: true, default: "" },
  },
  { _id: false }
);

const QuizAttemptSchema = new Schema<IQuizAttempt>(
  {
    documentId: { type: Schema.Types.ObjectId, ref: "Document", required: true },
    questions: { type: [QuestionSchema], required: true },
    score: { type: Number },
    totalQuestions: { type: Number, required: true },
    submittedAt: { type: Date },
  },
  { timestamps: true }
);

QuizAttemptSchema.index({ documentId: 1 });
QuizAttemptSchema.index({ submittedAt: -1 });

export const QuizAttempt =
  models.QuizAttempt ?? model<IQuizAttempt>("QuizAttempt", QuizAttemptSchema);
