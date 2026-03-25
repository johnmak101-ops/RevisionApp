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

If the Chunk Content Guard strips fragments, the response may also include:

```json
{
  "success": true,
  "documentId": "665f...",
  "chunkCount": 40,
  "warning": "2 content fragments were flagged and removed by the security system",
  "flaggedChunks": 2
}
```

**Error** (400/409/413/422/500):

```json
{
  "error": "Error description"
}
```

| Status | Scenario |
|--------|----------|
| 422 | All content flagged as suspicious — nothing to index |

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

| Status | Scenario |
|--------|----------|
| 400 | `id` is not a valid ObjectId |
| 404 | Document not found |

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
| No user message found | 400 | `{"error": "Last user message required"}` |
| Rate limit exceeded | 429 | `{"error": "Too many requests..."}` |
| Prompt injection detected | 200 | Streaming text: `⚠️ Your message was flagged...` |
| Search system error | 200 | Streaming text: `⚠️ 搜尋系統暫時出錯...` |
| No relevant results | 200 | Streaming text: `⚠️ 冇搵到相關文件內容...` |

> ⚠️ Prompt guard / search errors return 200 streaming text via `textMessageResponse()` (displayed as an AI message by `useChat`), not JSON errors.

**Behavior**:
- Uses the last user message with **Multi-Query Search** strategy:
  1. LLM generates 3 sub-queries from different perspectives
  2. Runs parallel `$vectorSearch` (cosine, top 4 each)
  3. Merges and deduplicates (first 100 chars as key, keeps highest score)
  4. Returns top 8 results sorted by score
- Chat history: up to 10 prior messages, excluding the current last user message (`chat/route.ts`)
- **Two-stage score thresholds** (`search.ts` → `chat/route.ts`):
  1. In `vectorSearch()`, chunks whose **raw** Atlas cosine score is below **0.60** are dropped; remaining scores are **normalized to 0–1**
  2. Before building context, `chat/route.ts` drops chunks with **normalized score < 0.40**
- Returns a streaming text prompt when no relevant results remain
- Falls back to single-query search if LLM sub-query generation fails

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

> Note: `correctIndex`, `topic`, and `explanation` are hidden from the client response — they are stored server-side for grading.

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

On error:

```
{"error":"Summary failed"}
```

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
