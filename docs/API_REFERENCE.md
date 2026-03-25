# API 參考文件

所有 API 端點位於 `/api/` 路徑下，由 Next.js API Routes 提供。

---

## POST `/api/ingest`

上傳 PDF 或 Markdown 文件，自動擷取文字、分割、embedding、存儲。

**Content-Type**: `multipart/form-data`

**Request Body**:

| 欄位 | 類型 | 描述 |
|------|------|------|
| `file` | File | PDF 或 Markdown 文件（上限 100MB） |

**Response** (200):

```json
{
  "success": true,
  "documentId": "665f...",
  "chunkCount": 42
}
```

若有片段被 Chunk Content Guard 移除，可額外出現：

```json
{
  "success": true,
  "documentId": "665f...",
  "chunkCount": 40,
  "warning": "2 個內容片段被安全系統標記並移除",
  "flaggedChunks": 2
}
```

**Error** (400/409/413/422/500):

```json
{
  "error": "描述信息"
}
```

| 狀態碼 | 情況 |
|--------|------|
| 422 | 所有內容被標記為可疑，無可索引片段 |

---

## GET `/api/documents`

列出所有已上傳文件。

**Response** (200):

```json
[
  {
    "_id": "665f...",
    "filename": "lecture01.pdf",
    "originalName": "Lecture 01 - Intro.pdf",
    "uploadedAt": "2026-03-13T05:00:00.000Z",
    "chunkCount": 42
  }
]
```

> 目前 `POST /api/ingest` 會將 `filename` 同 `originalName` 設為相同（上傳檔名）；若日後支援重新命名顯示，兩欄可能不同。

---

## DELETE `/api/documents/[id]`

刪除指定文件：一併刪除其 **所有 Chunks**（`pdfId` 相符）及 **`QuizAttempt`** 中 `documentId` 指向該文件嘅記錄，最後刪除 **`Document`**。⚠️ 不可還原。

**Path 參數**：

| 參數 | 描述 |
|------|------|
| `id` | 文件 MongoDB ObjectId（24 字元 hex，與 `GET /api/documents` 回傳嘅 `_id` 相同） |

**Response** (200):

```json
{
  "success": true,
  "deletedDocumentId": "665f...",
  "deletedChunks": 42
}
```

**Error** (400/404/500)：

```json
{
  "error": "描述信息"
}
```

| 狀態碼 | 情況 |
|--------|------|
| 400 | `id` 唔係有效 ObjectId |
| 404 | 搵唔到該文件 |

> 同名檔案上傳遇到 **409** 時，可先刪除對應文件再重新 ingest。

---

## POST `/api/chat`

RAG 聊天端點。以 **Vercel AI SDK streaming** 回傳（`createUIMessageStreamResponse` + `toUIMessageStream`）。

**Content-Type**: `application/json`

**Request Body**:

前端使用 Vercel AI SDK 嘅 `useChat` hook，自動以 `UIMessage[]` 格式傳送：

```json
{
  "messages": [
    {
      "id": "msg-1",
      "role": "user",
      "parts": [{ "type": "text", "text": "What is React hooks?" }]
    },
    {
      "id": "msg-2",
      "role": "assistant",
      "parts": [{ "type": "text", "text": "React hooks are..." }]
    },
    {
      "id": "msg-3",
      "role": "user",
      "parts": [{ "type": "text", "text": "Can you give more examples?" }]
    }
  ]
}
```

> 每條 message 嘅 `parts` 陣列可包含 `text`、`tool-call` 等類型。後端只提取 `type: "text"` 嘅內容。

**Response** (200, streaming):

使用 Vercel AI SDK 嘅 UI Message Stream 協議（非 NDJSON）。前端 `useChat` hook 自動解析，無需手動處理。

**錯誤處理**：

| 情況 | HTTP 狀態碼 | 回傳格式 |
|------|------------|---------|
| 缺少 messages | 400 | `{"error": "Messages required"}` |
| 冇找到 user message | 400 | `{"error": "Last user message required"}` |
| 超出 Rate Limit | 429 | `{"error": "Too many requests..."}` |
| Prompt injection 偵測 | 200 | Streaming text：`⚠️ Your message was flagged...` |
| 搜尋系統出錯 | 200 | Streaming text：`⚠️ 搜尋系統暫時出錯...` |
| 無相關結果 | 200 | Streaming text：`⚠️ 冇搵到相關文件內容...` |

> ⚠️ Prompt guard / search 錯誤以 `textMessageResponse()` 回傳 200 streaming text（令前端 `useChat` 顯示為 AI 訊息），而非 JSON error。

**行為**：
- 取最後一條 user message，用 **Multi-Query Search** 策略搜尋：
  1. LLM 將問題拆成 3 個唔同角度嘅子查詢
  2. 並行對每個子查詢執行 `$vectorSearch`（cosine，每個 top 4）
  3. 合併去重（content 前 100 字作 key，保留最高分）
  4. 按分數排序取最佳 8 條結果
- 對話歷史：除本輪最後一則 user 訊息外，最多保留最近 10 則（見 `chat/route.ts`）
- **兩段式分數門檻**（見 `search.ts` → `chat/route.ts`）：
  1. `$vectorSearch` 回傳嘅 **raw cosine** 低於 **0.60** 嘅結果會喺 `vectorSearch()` 丟棄，其餘會 **正規化到 0–1**
  2. 組合 context 前，`chat/route.ts` 再丟棄 **正規化分數 < 0.40** 嘅結果
- 無相關結果時回傳提示信息（streaming text）
- LLM 子查詢生成失敗時，自動 fallback 到原問題單次搜尋

**安全防護**：
- Vard（`@andersmyrmel/vard`）prompt injection 偵測（instruction override / role manipulation / system prompt leak）
- Rate limit：20 req/min per IP

---

## POST `/api/quiz/generate`

根據指定文件生成 MCQ 題目。

**Request Body**:

```json
{
  "documentId": "665f...",
  "count": 5
}
```

> `count` 會限制喺 3–15 之間，預設為 5。

**安全防護**：
- `documentId` 必須為有效 24 字元 hex ObjectId
- ChatPromptTemplate system/user role 分離
- Rate limit：10 req/min per IP

**Response** (200):

```json
{
  "quizId": "666a...",
  "questions": [
    {
      "index": 0,
      "question": "Which of the following...",
      "options": ["A", "B", "C", "D"]
    }
  ],
  "totalQuestions": 5
}
```

> 注意：`correctIndex`、`topic`、`explanation` 唔會喺 client response 中出現 — 佢哋儲存喺 server 端用嚟評分。

---

## POST `/api/quiz/submit`

提交 Quiz 答案。

**Request Body**:

```json
{
  "quizId": "666a...",
  "answers": [0, 2, 1, 3, 0]
}
```

**Response** (200):

```json
{
  "quizId": "666a...",
  "score": 4,
  "totalQuestions": 5,
  "percentage": 80,
  "results": [
    {
      "index": 0,
      "question": "Which of the following...",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 0,
      "userAnswer": 0,
      "isCorrect": true,
      "topic": "React Hooks",
      "explanation": "..."
    }
  ]
}
```

---

## GET `/api/quiz/stats`

取得 Quiz 統計數據（知識缺口分析）。

**Response** (200):

```json
{
  "topics": [
    {
      "name": "Closures",
      "totalQuestions": 10,
      "correct": 4,
      "accuracy": 40
    },
    {
      "name": "Promises",
      "totalQuestions": 8,
      "correct": 6,
      "accuracy": 75
    }
  ],
  "overall": {
    "totalAttempts": 5,
    "totalQuestions": 18,
    "totalCorrect": 10,
    "accuracy": 56
  }
}
```

> Topics 以正確率升序排列 — 最弱嘅 Topic 排喺最前面。

---

## DELETE `/api/quiz/stats`

刪除所有 Quiz 記錄（⚠️ 不可還原）。

**Response** (200):

```json
{
  "deleted": 5
}
```

**Error** (500):

```json
{
  "error": "無法重置記錄"
}
```

> ⚠️ 此端點會刪除 **所有** QuizAttempt 記錄。操作前請確認。

---

## POST `/api/summary/generate`

根據指定文件生成 AI 摘要大綱。回傳 **streaming NDJSON**。

**Request Body**:

```json
{
  "documentId": "665f..."
}
```

**Response** (200, streaming):

每行一個 JSON object：

```
{"token":"## 文件大綱"}
{"token":"\n\n### 第一章 ..."}
{"done":true}
```

錯誤時：

```
{"error":"Summary failed"}
```

**安全防護**：
- `documentId` 必須為有效 24 字元 hex ObjectId
- ChatPromptTemplate system/user role 分離
- Rate limit：10 req/min per IP

---

## 通用錯誤格式

所有 API 錯誤回傳統一格式：

```json
{
  "error": "描述信息"
}
```

常見 HTTP 狀態碼：

| 狀態碼 | 描述 |
|--------|------|
| 400 | 參數缺失或無效 |
| 422 | 無法處理（例如 ingest 時全部 chunk 被安全標記） |
| 404 | 資源不存在 |
| 409 | 衝突（如重複上傳文件或重複提交 Quiz） |
| 413 | 檔案過大（超過 100MB 上限） |
| 429 | 請求過於頻繁（超過 Rate Limit） |
| 502 | AI 生成格式錯誤（LLM 輸出唔合格） |
| 500 | 伺服器內部錯誤 |

---

*更新日期：2026-03-25*
