# API Reference

All API endpoints are located under the `/api/` path, served by Next.js API Routes.

---

## POST `/api/ingest`

Upload a PDF or Markdown file with automatic text extraction, chunking, embedding, and storage.

**Content-Type**: `multipart/form-data`

**Request Body**:

| Field | Type | Description |
|-------|------|-------------|
| `file` | File | PDF or Markdown file (max 100MB) |

**Response** (200):

```json
{
  "success": true,
  "documentId": "665f...",
  "chunkCount": 42
}
```

If **Chunk Content Guard** (`guardChunkContent` in `src/lib/promptGuard.ts`) removes chunks, the response may also include `warning` and `flaggedChunks`. Both reflect the **actual number of flagged chunks** (`flaggedCount`). The **2** below is an example only.

The server builds `warning` as Traditional Chinese (see `src/app/api/ingest/route.ts`): `` `${flaggedCount} 個內容片段被安全系統標記並移除` ``. `chunkCount` is the count **after** removal.

```json
{
  "success": true,
  "documentId": "665f...",
  "chunkCount": 40,
  "warning": "2 個內容片段被安全系統標記並移除",
  "flaggedChunks": 2
}
```

**Errors** (JSON `{"error":"..."}` unless noted):

| Status | Scenario (matches `ingest/route.ts`) |
|--------|--------------------------------------|
| 400 | Wrong type, empty file, parse failure, no extractable text / chunks, etc. |
| 413 | File larger than 100MB |
| 409 | Duplicate filename (delete indexed doc first) |
| 422 | Every chunk flagged by Chunk Guard: `所有內容被安全系統標記為可疑，無法處理此檔案` |
| 500 | `Ingest failed` or `err.message` |

---

## GET `/api/documents`

List all uploaded documents.

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

> Today `POST /api/ingest` sets both `filename` and `originalName` to the uploaded file name; they may diverge if display renaming is added later.

**Error** (500): `{"error":"無法取得文件列表"}`

---

## DELETE `/api/documents/[id]`

Deletes one indexed document: removes **all Chunks** with matching `pdfId`, all **`QuizAttempt`** rows with matching `documentId`, then the **`Document`**. ⚠️ Irreversible.

**Path parameters**:

| Parameter | Description |
|-----------|-------------|
| `id` | MongoDB ObjectId of the document (24 hex chars, same as `_id` from `GET /api/documents`) |

**Response** (200):

```json
{
  "success": true,
  "deletedDocumentId": "665f...",
  "deletedChunks": 42
}
```

**Error** (400/404/500):

```json
{
  "error": "Error description"
}
```

| Status | `error` (as returned; Traditional Chinese) |
|--------|-----------------------------------------------|
| 400 | `無效嘅文件 ID` |
| 404 | `搵唔到呢份文件` |
| 500 | `無法刪除文件` |

> If **409** on re-upload (duplicate filename), delete the existing document first, then ingest again.

---

## POST `/api/chat`

RAG chat endpoint. Returns **Vercel AI SDK streaming** response (`createUIMessageStreamResponse` + `toUIMessageStream`).

**Content-Type**: `application/json`

**Request Body**:

The frontend uses the Vercel AI SDK `useChat` hook, which automatically sends messages in `UIMessage[]` format:

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

> Each message's `parts` array can contain `text`, `tool-call`, and other types. The backend only extracts `type: "text"` content.

**Response** (200, streaming):

Uses Vercel AI SDK's UI Message Stream protocol (not NDJSON). The frontend `useChat` hook automatically parses the stream — no manual handling required.

**Error Handling**:

| Scenario | HTTP Status | Response Format |
|----------|------------|-----------------|
| Missing messages | 400 | `{"error": "Messages required"}` |
| Last user message has no text | 400 | `{"error": "Last user message required"}` |
| Rate limit exceeded | 429 | `{"error": "Too many requests. Please try again later."}` (includes `Retry-After`) |
| Message too long (>2000 chars) / Vard blocks injection | 200 | Streaming text: `⚠️ ` + `reason` from `guardUserMessage` (English; see `promptGuard.ts`) |
| Search system error | 200 | Streaming text: `⚠️ 搜尋系統暫時出錯，請稍後再試。` |
| No usable chunks after merged retrieval (see `chat/route` 0.40 gate below) | 200 | Streaming text: `⚠️ 冇搵到相關文件內容。請先上傳相關嘅 PDF 或 Markdown 檔案，再問呢個問題。` |

> ⚠️ Guard / search / empty-context paths use **200** streaming via `textMessageResponse()` so `useChat` shows an assistant message, not a JSON error. Default injection `reason`: `Your message was flagged by our safety system. Please rephrase your question about the course material.`

**Behavior** (`multiQuerySearch` in `search.ts` + `chat/route.ts`):

1. **Multi-query**: `toolLLM` tries to emit up to 3 sub-queries; on failure `subQueries` is **only the original question** (each still goes through `vectorSearch`).
2. **Per sub-query `vectorSearch()`**:
   - After `$vectorSearch`, drop rows with **raw cosine < 0.60**; **normalize** surviving scores to 0–1 (`normalizeScore`).
   - If **no chunks remain after that filter**, run **keyword fallback** **inside** `vectorSearch` (`$regex`, fixed `score` 0.5). This is **not** deferred to `chat/route`.
3. **Merge**: dedupe by first **100** chars of `content`, keep higher score, sort, take up to **8** chunks.
4. **`chat/route.ts` (second gate)**: drop merged chunks with **normalized score < 0.40** (`MIN_VECTOR_SCORE`). If **none** left, return the “no relevant content…” stream above; **no** keyword fallback at this stage.
5. **History**: up to **10** messages before the final user turn (see `chat/route.ts`).

**Security**:
- Vard (`@andersmyrmel/vard`) prompt injection detection (instruction override / role manipulation / system prompt leak)
- Rate limit: 20 req/min per IP

---

## POST `/api/quiz/generate`

Generate MCQ questions based on a specified document.

**Request Body**:

```json
{
  "documentId": "665f...",
  "count": 5
}
```

> `count` is clamped between 3–15, defaults to 5.

**Security**:
- `documentId` must be a valid 24-character hex ObjectId
- ChatPromptTemplate system/user role separation
- Rate limit: 10 req/min per IP

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

> Note: `correctIndex`, `topic`, and `explanation` are omitted from the **generate** response — stored server-side for grading.  
> `totalQuestions` is the count of **validated** questions (exactly 4 options and `correctIndex` in 0–3); it may be **less than** requested `count` if some LLM rows fail validation.

**Errors**:

| Status | Scenario |
|--------|----------|
| 400 | `請提供有效嘅文件 documentId` |
| 404 | `搵唔到呢份文件嘅內容` (no chunks) |
| 429 | `Too many requests. Please try again later.` |
| 502 | Invalid JSON / no questions / all questions failed validation (Traditional Chinese messages in code) |
| 500 | `生成練習題失敗` or `err.message` |

---

## POST `/api/quiz/submit`

Submit quiz answers.

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

**Errors**:

| Status | Scenario |
|--------|----------|
| 400 | `需要 quizId 同 answers`; or answer count ≠ `totalQuestions` (message includes expected vs received) |
| 404 | `搵唔到呢份 quiz` |
| 409 | `呢份 quiz 已經交咗` |
| 500 | `提交失敗` or `err.message` |

---

## GET `/api/quiz/stats`

Get quiz statistics (Knowledge Gap Analysis).

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

> Topics are sorted by accuracy (ascending) — weakest topics appear first.

**Error** (500): `{"error":"無法取得統計資料"}`

---

## DELETE `/api/quiz/stats`

Delete all Quiz records (⚠️ irreversible).

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

> ⚠️ This endpoint deletes **all** QuizAttempt records. Please confirm before use.

---

## POST `/api/summary/generate`

Generate an AI summary outline for a specified document. Returns **streaming NDJSON** response.

**Request Body**:

```json
{
  "documentId": "665f..."
}
```

**Response** (200, streaming):

One JSON object per line:

```
{"token":"## Document"}
{"token":" Outline"}
{"token":"\n\n### Chapter 1 ..."}
{"done":true}
```

Mid-stream failure (still HTTP 200, `Content-Type: text/plain`, one JSON object per line):

```
{"error":"<Error.message>"}
```

`<Error.message>` is the thrown exception text — not necessarily the literal string `Summary failed`.

**Non-stream errors** (JSON, before the stream starts):

| Status | Scenario |
|--------|----------|
| 400 | `請提供有效嘅文件 documentId` |
| 404 | `搵唔到呢份文件嘅內容` |
| 429 | `Too many requests. Please try again later.` |
| 500 | `生成大綱失敗` or `err.message` |

**Security**:
- `documentId` must be a valid 24-character hex ObjectId
- ChatPromptTemplate system/user role separation
- Rate limit: 10 req/min per IP

---

## Common Error Format

All API errors return a unified format:

```json
{
  "error": "Error description"
}
```

Common HTTP status codes:

| Status Code | Description |
|-------------|-------------|
| 400 | Missing or invalid parameters |
| 422 | Unprocessable (e.g. ingest when every chunk is security-flagged) |
| 404 | Resource not found |
| 409 | Conflict (e.g., duplicate file upload or quiz submission) |
| 413 | File too large (exceeds 100MB limit) |
| 429 | Too many requests (rate limit exceeded) |
| 502 | AI generation format error (LLM returned invalid output) |
| 500 | Internal server error |

---

*Last updated: 2026-03-25*
