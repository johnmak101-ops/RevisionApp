# 系統架構文件

## 目錄結構

```
revision-app/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── chat/route.ts          # RAG 聊天（Streaming）
│   │   │   ├── documents/route.ts     # 文件列表管理
│   │   │   ├── ingest/route.ts        # PDF/MD 上傳 → 向量化
│   │   │   ├── quiz/
│   │   │   │   ├── generate/route.ts  # AI 自動出題
│   │   │   │   ├── submit/route.ts    # 提交答案 & 評分
│   │   │   │   └── stats/route.ts     # 答題統計
│   │   │   └── summary/
│   │   │       └── generate/route.ts  # AI 大綱摘要
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx                   # 主頁（Tab 切換）
│   ├── components/
│   │   ├── ChatBox.tsx                # 聊天界面（streaming）
│   │   ├── FileUpload.tsx             # 文件上傳
│   │   ├── QuizPanel.tsx              # Quiz 出題 & 作答
│   │   ├── KnowledgeGap.tsx           # 知識缺口分析
│   │   ├── SummaryPanel.tsx           # 大綱摘要
│   │   ├── TabNav.tsx                 # Tab 導航
│   │   └── UploadToast.tsx            # 上傳結果 Toast 通知
│   ├── lib/
│   │   ├── chunking.ts               # LangChain 文本分割（含 table 保留）
│   │   ├── db.ts                      # MongoDB 連線（Singleton）
│   │   ├── embedding.ts              # OpenRouter Embedding API
│   │   ├── llm.ts                     # LLM Singleton（streamingLLM + toolLLM）
│   │   ├── md.ts                      # Markdown 解析
│   │   ├── pdf.ts                     # PDF 文字擷取（LlamaParse REST API）
│   │   └── search.ts                 # 向量搜尋 + Multi-Query + 關鍵字備援
│   └── models/
│       ├── Chunk.ts                   # 文本 Chunk（含 embedding）
│       ├── Document.ts              # 上傳文件記錄
│       └── QuizAttempt.ts           # Quiz 答題記錄
├── scripts/
│   └── vector-index.json             # Atlas 向量索引定義
└── docs/
    └── ...
```

---

## 數據模型

### Document

| 欄位 | 類型 | 描述 |
|------|------|------|
| `_id` | ObjectId | 主鍵 |
| `filename` | String | 存儲檔名 |
| `originalName` | String | 原始檔名 |
| `uploadedAt` | Date | 上傳時間 |
| `chunkCount` | Number | Chunk 數量 |

### Chunk

| 欄位 | 類型 | 描述 |
|------|------|------|
| `_id` | ObjectId | 主鍵 |
| `content` | String | 文本內容 |
| `embedding` | Number[] | 向量（維度由模型決定） |
| `pdfId` | ObjectId → Document | 關聯文件 |
| `page` | Number | 頁碼 |
| `chunkIndex` | Number | Chunk 序號 |
| `metadata` | Mixed | 額外元數據 |

**索引**：`pdfId: 1`（一般索引）+ `chunk_vector_index`（Atlas 向量索引，cosine）

### QuizAttempt

| 欄位 | 類型 | 描述 |
|------|------|------|
| `_id` | ObjectId | 主鍵 |
| `documentId` | ObjectId → Document | 關聯文件 |
| `questions` | Question[] | 題目列表 |
| `score` | Number | 得分 |
| `totalQuestions` | Number | 題目數量 |
| `submittedAt` | Date | 提交時間 |

**Question subdocument**：`{ question, options[], correctIndex, userAnswer?, topic, explanation }`

**索引**：`documentId: 1`, `submittedAt: -1`

---

## 核心流程

### 1. 文件上傳 (Ingest Pipeline)

```
PDF/MD 上傳
    ↓
PDF → LlamaParse REST API（上傳 → 輪詢 → 取得 Markdown）
MD → 直接解析
    ↓
按頁文字
    ↓
RecursiveCharacterTextSplitter (512 chars, 100 overlap)
    ↓
OpenRouter Embedding API (batch 20)
    ↓
MongoDB 存儲 Document + Chunks (含 embedding)
```

### 2. RAG 聊天 (Chat Pipeline)

```
用戶問題
    ↓
Multi-Query Search (multiQuerySearch)：
  1. toolLLM 將問題拆成 3 個子查詢（唔同角度）
  2. 並行對每個子查詢執行 embedText → $vectorSearch (cosine, top 4)
  3. 合併去重（content 前 100 字作 key，保留最高分）
  4. 按分數排序取最佳 8 條
    ↓
Score filter (≥ 0.4) → 無結果時 keyword fallback
    ↓
LangChain ChatPromptTemplate + History (最近 10 條)
    ↓
OpenRouter ChatOpenAI streaming → ReadableStream
    ↓
Frontend NDJSON streaming 渲染
```

### 3. Quiz 生成流程

```
選擇文件 → 檢索相關 Chunks
    ↓
AI 生成 MCQ 題目 (含 topic, explanation)
    ↓
用戶作答 → submit → 評分
    ↓
QuizAttempt 存儲 → stats 統計
    ↓
KnowledgeGap 分析弱項 topic
```

---

## API 端點

| 方法 | 路徑 | 描述 |
|------|------|------|
| POST | `/api/ingest` | 上傳 PDF/MD 文件 |
| GET | `/api/documents` | 取得已上傳文件列表 |
| POST | `/api/chat` | RAG 聊天（streaming NDJSON） |
| POST | `/api/quiz/generate` | AI 生成 Quiz 題目 |
| POST | `/api/quiz/submit` | 提交 Quiz 答案 |
| GET | `/api/quiz/stats` | Quiz 統計數據 |
| DELETE | `/api/quiz/stats` | 重置所有 Quiz 記錄 |
| POST | `/api/summary/generate` | AI 生成文件摘要 |

---

## 關鍵設計決策

| 決策 | 理由 |
|------|------|
| LlamaParse 取代 pdf-parse + tesseract.js | 原生支援多語言、掃描 PDF，毋需本地 OCR 依賴 |
| 直接 fetch OpenRouter 而非 LangChain Embeddings | OpenRouter response 格式差異，避免兼容問題 |
| Warmup + dimension detection | 啟動時檢測向量維度，確保與 Atlas 索引匹配 |
| Keyword fallback | 向量搜尋無結果時用 regex 備援，提高容錯 |
| Streaming NDJSON | 改善聊天體驗，逐 token 回傳 |
| Batch embedding (20/batch) | OpenRouter 可能限制 batch size |
| Score filter (≥ 0.4) | 過濾低相關性結果，避免幻覺 |
| Multi-Query Search | 用 LLM 拆問題成 3 個角度並行搜尋，提高召回率 |
| toolLLM (非 streaming) | 輕量低溫度 LLM 專用於工具呼叫（multi-query 生成） |
| Table-aware chunking | 自動偵測 pipe table，整塊保留唔切割 |
| MongoDB singleton | 避免 Next.js dev 模式重複連線 |

---

*更新日期：2026-03-20*
