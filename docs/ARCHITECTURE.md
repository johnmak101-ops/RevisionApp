# 系統架構文件

## 目錄結構

```
revision-app/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── chat/route.ts          # RAG 聊天（Streaming）
│   │   │   ├── documents/route.ts     # 文件列表（GET）
│   │   │   ├── documents/[id]/route.ts # 刪除單一文件（DELETE）
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
│   │   ├── ChatBox.tsx                # 聊天介面（streaming）
│   │   ├── FileUpload.tsx             # 檔案上傳
│   │   ├── DocumentList.tsx           # 已索引文件清單（刪除）
│   │   ├── QuizPanel.tsx              # Quiz 出題 & 作答
│   │   ├── KnowledgeGap.tsx           # 知識缺口分析
│   │   ├── SummaryPanel.tsx           # 大綱摘要
│   │   ├── TabNav.tsx                 # Tab 導航
│   │   ├── MarkdownRenderer.tsx       # Markdown 渲染器（markdown-it + highlight.js + DOMPurify）
│   │   ├── MarkdownRendererDynamic.tsx # 動態載入包裝器（next/dynamic）
│   │   └── UploadToast.tsx            # 上傳結果 Toast 通知
│   ├── lib/
│   │   ├── chunking.ts               # Header-aware 文本分割（含 header context prefix）
│   │   ├── db.ts                      # MongoDB 連線（Cached，Dev 用 global 防 HMR 重複連線）
│   │   ├── embedding.ts              # OpenRouter Embedding API
│   │   ├── llm.ts                     # LLM Singleton（streamingLLM + toolLLM）
│   │   ├── md.ts                      # Markdown 解析
│   │   ├── pdf.ts                     # PDF 文字擷取（LlamaParse REST API + parsing_instruction）
│   │   ├── promptGuard.ts            # Prompt Injection 防護（Vard）
│   │   ├── rateLimiter.ts            # In-memory IP Rate Limiter
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
| `chunkIndex` | Number | chunk 序號 |
| `filename` | String | 來源檔名（`$vectorSearch` pre-filter） |
| `chapter` | String | 所屬 h1 章節（可選，pre-filter） |
| `metadata` | Mixed | 額外 metadata（如 OCR 信心度等） |

**Indexes**: `pdfId: 1`、`filename: 1`、`chapter: 1`（標準索引）+ `chunk_vector_index`（Atlas 向量索引，cosine；定義見 `scripts/vector-index.json`）

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

**Indexes**：`documentId: 1`, `submittedAt: -1`

---

## 核心流程

### 1. 文件上傳 (Ingest Pipeline)

```
PDF/MD 上傳
    ↓
PDF → LlamaParse REST API（上傳 + parsing_instruction 表格格式指引 + 輪詢 → 取得 Markdown）
MD → 直接解析
    ↓
按頁文字
    ↓
Header-aware 分段（splitByHeaders：按 #/##/### 切段，追蹤 header hierarchy）
    ↓
RecursiveCharacterTextSplitter sub-split (512 chars, 100 overlap)
    ↓
每 chunk 加 header context prefix（例："Java > Data Types"）
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
`vectorSearch`: raw cosine < 0.60 丟棄 → 其餘正規化到 0–1 → `chat/route`: normalized < 0.40 丟棄 → 無結果時 keyword fallback
    ↓
LangChain ChatPromptTemplate + History (最近 10 條)
    ↓
LangChain RunnableSequence.stream()
    ↓
Vercel AI SDK：toUIMessageStream → createUIMessageStreamResponse
    ↓
前端 useChat（@ai-sdk/react）自動接收 + markdown-it 渲染
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

## 安全防護

### 商業風險與防護目標

安全防護唔係純技術考量，而係直接影響產品可信度同用戶體驗：

| 防護層 | 防護目標 | 商業風險（如果冇呢層防護） |
|--------|----------|---------------------------|
| **Vard Guard** | 偵測並阻止 Prompt Injection 攻擊（instruction override、role manipulation、system prompt leak） | 攻擊者可能注入惡意指令，令 AI 回答偏離教材內容，產生誤導性資訊，影響學員學習品質 |
| **Chunk Content Guard** | 掃描上傳文件中每個 chunk 嘅內容，確保輸入數據潔淨度 | 惡意文件可能夾帶 indirect prompt injection pattern，污染 RAG 上下文後所有用戶嘅查詢結果都會受影響 |
| **Rate Limiting** | 限制 API 請求頻率，防止濫用 | 過量請求消耗 OpenRouter API quota，導致服務中斷或產生非預期費用 |
| **Input Sanitization** | 清理 delimiter injection、encoding 攻擊 | 繞過防護層後直接操控 LLM 行為 |

### Prompt Injection 防護

唔同端點有唔同嘅防護策略，取決於用戶輸入類型：

**Ingest（檔案上傳）：**

```
檔案上傳
    ↓
格式驗證（.pdf / .md / .markdown）→ 400
    ↓
空檔案檢查 → 400
    ↓
大小上限（100MB）→ 413
    ↓
同名去重 → 409
    ↓
Chunk Injection 掃描（guardChunkContent）→ strip 可疑 chunks
    ↓
全部 flagged → 422 / 部分 flagged → 繼續 + warning
    ↓
Embedding → 存儲
```

> ⚠️ `/api/ingest` 目前冇 rate limiting，大量上傳可能消耗 LlamaParse / Embedding API quota。

**Chat（有 free-text 用戶輸入）：**

```
請求進入
    ↓
Rate Limit 檢查 → 超限回傳 429
    ↓
Vard Guard 偵測 → 注入攻擊回傳警告
    ↓
已清洗文字 → LLM
```

**Quiz / Summary（只有 documentId 輸入）：**

```
請求進入
    ↓
Rate Limit 檢查 → 超限回傳 429
    ↓
DocumentId 格式驗證（24 字元 hex ObjectId）
    ↓
ChatPromptTemplate role 分離 → LLM
```

| 防護層 | 適用端點 | 描述 |
|--------|----------|------|
| **檔案格式驗證** | Ingest | 只接受 .pdf / .md / .markdown |
| **大小上限 (100MB)** | Ingest | 超限回傳 413 |
| **同名去重** | Ingest | 重複檔名回傳 409；可用 `DELETE /api/documents/[id]` 或頁面「已索引文件」刪除後再上傳 |
| **Chunk Content Guard** | Ingest | Vard 掃描每個 chunk，strip 含 injection pattern 嘅內容（indirect prompt injection 防護） |
| **Vard Guard** | Chat | 偵測 instruction override、role manipulation、system prompt leak |
| **Custom Patterns** | Chat | 額外攔截 DAN jailbreak、prompt leak 變體 |
| **Input Sanitization** | Chat | 清理 delimiter injection、encoding 攻擊 |
| **ChatPromptTemplate** | Quiz, Summary | system/user role 分離，防止 context injection |
| **DocumentId 驗證** | Quiz, Summary | 只接受有效 24 字元 hex MongoDB ObjectId |

### Rate Limiting

| 端點 | 上限 |
|------|------|
| `/api/chat` | 20 req/min per IP |
| `/api/quiz/generate` | 10 req/min per IP |
| `/api/summary/generate` | 10 req/min per IP |

---

## 擴展性與限制 (Scalability & Constraints)

### 技術選型商業理由

| 技術決策 | 商業驅動 | 技術替代方案 | 點解唔用替代方案 |
|----------|----------|-------------|------------------|
| **LlamaParse** 處理 PDF | Bootcamp 教材經常包含掃描件（手寫筆記、投影片截圖），需要高準確度 OCR。透過 `parsing_instruction` 提供表格格式指引，確保教材中資料型態對照表、代碼片段正確保留 | `pdf-parse` + `tesseract.js` | 本地 OCR 多語言支援差，掃描件準確度低，影響 RAG 回答品質 |
| **OpenRouter** 統一 API | 一個端點存取多個 LLM 模型，降低供應商鎖定風險 | 直接用 OpenAI / Google API | 免費 tier 選擇少，切換模型需要改代碼 |
| **MongoDB Atlas M0** | 免費叢集 512MB 足夠存儲 Bootcamp 課程教材量級嘅 chunks | PostgreSQL + pgvector | MongoDB 原生向量搜尋 + 免費叢集，零成本啟動 |

### 已知限制

| 限制 | 影響 | 目前處理方式 |
|------|------|-------------|
| LlamaParse 免費 tier 每日頁數配額 | 大量 PDF 上傳時可能超額 | 前端錯誤提示 + API 回傳具體錯誤訊息 |
| OpenRouter 免費模型 rate limit | 高峰期可能遇到限流 | in-memory rate limiter 控制請求頻率 |
| In-memory rate limiter 無持久化 | Vercel serverless 重啟後計數器歸零 | 可接受風險：Bootcamp 使用場景低流量 |

---

## API 端點

| 方法 | 路徑 | 描述 |
|------|------|------|
| POST | `/api/ingest` | 上傳 PDF/MD 文件 |
| GET | `/api/documents` | 取得已上傳文件列表 |
| DELETE | `/api/documents/[id]` | 刪除文件、chunks、關聯 QuizAttempt |
| POST | `/api/chat` | RAG 聊天（Vercel AI SDK streaming） |
| POST | `/api/quiz/generate` | AI 生成 Quiz 題目 |
| POST | `/api/quiz/submit` | 提交 Quiz 答案 |
| GET | `/api/quiz/stats` | Quiz 統計數據 |
| DELETE | `/api/quiz/stats` | 重置所有 Quiz 記錄 |
| POST | `/api/summary/generate` | AI 生成文件摘要 |

---

## 關鍵設計決策

| 決策 | 理由 |
|------|------|
| LlamaParse 取代 pdf-parse + tesseract.js | 原生支援多語言、掃描 PDF，毋需本地 OCR 依賴。配合 `parsing_instruction` 提升表格處理準確度 |
| 直接 fetch OpenRouter 而非 LangChain Embeddings | OpenRouter response 格式差異，避免兼容問題 |
| Warmup + dimension detection | 啟動時檢測向量維度，確保與 Atlas 索引匹配 |
| Keyword fallback | 向量搜尋無結果時用 regex 備援，提高容錯 |
| Vercel AI SDK streaming (Chat) | 用 `createUIMessageStreamResponse` + `toUIMessageStream` 做 Chat streaming，前端用 `useChat` 自動接收 |
| Streaming NDJSON (Summary) | Summary 用 NDJSON 逐 token 回傳，改善體驗 |
| Batch embedding (20/batch) | OpenRouter 可能限制 batch size |
| 兩段式 score 門檻 | `search.ts` 先丟棄 raw cosine < 0.60，正規化後 `chat/route.ts` 再丟棄 normalized < 0.40，避免低相關 context |
| Multi-Query Search | 用 LLM 拆問題成 3 個角度並行搜尋，提高召回率 |
| toolLLM (非 streaming) | 輕量低溫度 LLM 專用於工具呼叫（multi-query 生成） |
| Header-aware chunking | 按 Markdown headers 分段，每 chunk 帶 header context prefix（例："Java > Data Types"），提升 embedding 語義準確度 |
| MongoDB cached connection | Dev 模式用 `global` 快取避免 HMR 重複連線；Production（Vercel serverless）每個 instance 各自持有連線 |
| System prompt 強制 fenced code | 明確要求含 = ; {} 嘅 code 必須用 fenced code block |
| Vard prompt guard | 用 `@andersmyrmel/vard` 偵測 + 阻擋 prompt injection（instruction override、role manipulation、system prompt leak） |
| In-memory rate limiter | 滑動窗口 rate limiting，無需 Redis，適合 Vercel serverless 部署 |
| ChatPromptTemplate role 分離 | Quiz/Summary 改用 LangChain ChatPromptTemplate 將 system 指令同 user context 分開，防止用戶注入系統角色 |
| Chunk Content Guard (Ingest) | 上傳時用 Vard 掃描每個 chunk，strip 含 indirect injection pattern 嘅內容，防止惡意文件污染 RAG context |

---

*更新日期：2026-03-25*
