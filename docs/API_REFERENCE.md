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

若有片段被 Chunk Content Guard（`guardChunkContent`）移除，可額外出現 `warning` 與 `flaggedChunks`。兩者皆等於 **實際被標記嘅 chunk 數**（`src/lib/promptGuard.ts` 內 `flaggedCount`）；下面數字 **2** 僅為示例。

```json
{
  "success": true,
  "documentId": "665f...",
  "chunkCount": 40,
  "warning": "2 個內容片段被安全系統標記並移除",
  "flaggedChunks": 2
}
```

對應實作：`src/app/api/ingest/route.ts` 使用 `` `${flaggedCount} 個內容片段被安全系統標記並移除` ``；`chunkCount` 為移除後剩低嘅數量。

**Error**（皆為 JSON `{"error":"..."}`，除非另有說明）：

| 狀態碼 | 情況（與程式對應） |
|--------|-------------------|
| 400 | 非 PDF/MD、檔案為空、解析失敗、無法提取文字／chunk 為空等（見 `ingest/route.ts` 各分支） |
| 413 | 檔案超過 100MB |
| 409 | 同名文件已存在（提示先刪「已索引文件」） |
| 422 | 所有 chunk 被 Chunk Guard 標記：`所有內容被安全系統標記為可疑，無法處理此檔案` |
| 500 | `Ingest failed` 或 `err.message` |

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

**Error** (500)：`{"error":"無法取得文件列表"}`

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

| 狀態碼 | `error`（繁中，與程式一致） |
|--------|------------------------------|
| 400 | `無效嘅文件 ID` |
| 404 | `搵唔到呢份文件` |
| 500 | `無法刪除文件` |

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
| 最後一則 user 訊息無文字 | 400 | `{"error": "Last user message required"}` |
| 超出 Rate Limit | 429 | `{"error": "Too many requests. Please try again later."}`（含 `Retry-After` 標頭） |
| 訊息過長（>2000 字）／Vard 擋 injection | 200 | Streaming text：`⚠️ ` + `guardUserMessage` 嘅 `reason`（英文，見 `promptGuard.ts`） |
| 搜尋系統出錯 | 200 | Streaming text：`⚠️ 搜尋系統暫時出錯，請稍後再試。` |
| 合併檢索後無可用人片段（見下文「`chat/route` 0.40 門檻」） | 200 | Streaming text：`⚠️ 冇搵到相關文件內容。請先上傳相關嘅 PDF 或 Markdown 檔案，再問呢個問題。` |

> ⚠️ Guard／搜尋／無結果以 `textMessageResponse()` 回傳 **200** streaming（前端 `useChat` 當作 assistant 訊息），**唔係** JSON error。Injection 時完整 `reason` 預設為：`Your message was flagged by our safety system. Please rephrase your question about the course material.`

**行為**（`search.ts` 嘅 `multiQuerySearch` + `chat/route.ts`）：

1. **Multi-query**：`toolLLM` 嘗試產生最多 3 條子查詢；失敗則 `subQueries` 只有 **原問題**（仍逐條走 `vectorSearch`）。
2. **每個子查詢嘅 `vectorSearch()`**（同一函數亦畀單次搜尋用）：
   - `$vectorSearch` 拉候選後，丟棄 **raw cosine < 0.60** 嘅列；其餘分數 **正規化到 0–1**（`normalizeScore`）。
   - 若經 **0.60 過濾後** 已無任何 chunk，先喺 **`vectorSearch` 內** 做 **keyword fallback**（`$regex`，結果 `score` 固定 0.5）。**唔會**留待後面先做。
3. **合併**：各子查詢結果以 content **前 100 字**去重、保留較高分，再排序取最多 **8** 條。
4. **`chat/route.ts`（第二道門檻）**：對上一步合併結果再丟棄 **正規化分數 < 0.40**（`MIN_VECTOR_SCORE`）。若 **清空**，回傳上表「冇搵到相關…」streaming；**此階段唔會**再跑 keyword fallback。
5. **對話歷史**：除本輪最後一則 user 訊息外，最多保留最近 **10** 則。

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

> 注意：`correctIndex`、`topic`、`explanation` 唔會喺 generate 嘅 client response 出現 — 儲存喺 server 用嚟評分。  
> `totalQuestions` 為 **通過驗證** 嘅題數（恰好 4 選項且 `correctIndex` 在 0–3）；可以 **少於** 請求嘅 `count`（若 LLM 輸出部分唔合格會被丟棄）。

**Error**：

| 狀態碼 | 情況 |
|--------|------|
| 400 | `請提供有效嘅文件 documentId` |
| 404 | `搵唔到呢份文件嘅內容`（無 chunks） |
| 429 | `Too many requests. Please try again later.` |
| 502 | `AI 生成嘅題目格式有誤，請重試`／`AI 冇生成到題目，請重試`／`AI 生成嘅題目全部唔合格，請重試` |
| 500 | `生成練習題失敗` 或 `err.message` |

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

**Error**：

| 狀態碼 | 情況 |
|--------|------|
| 400 | `需要 quizId 同 answers`；或答案數量 ≠ `totalQuestions`（繁中提示內含預期／實際數量） |
| 404 | `搵唔到呢份 quiz` |
| 409 | `呢份 quiz 已經交咗` |
| 500 | `提交失敗` 或 `err.message` |

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

**Error** (500)：`{"error":"無法取得統計資料"}`

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

串流中途錯誤時（仍為 200、`Content-Type: text/plain`，一行一個 JSON）：

```
{"error":"<Error.message>"}
```

`<Error.message>` 為實際例外訊息（例如 LLM 失敗），**唔一定**係字面 `Summary failed`。

**非串流錯誤**（請求階段，JSON）：

| 狀態碼 | 情況 |
|--------|------|
| 400 | `請提供有效嘅文件 documentId` |
| 404 | `搵唔到呢份文件嘅內容` |
| 429 | `Too many requests. Please try again later.` |
| 500 | `生成大綱失敗` 或 `err.message` |

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
