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

**Error** (400/409/413/500):

```json
{
  "error": "Error description"
}
```

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

---

## POST `/api/chat`

RAG chat endpoint. Returns streaming NDJSON response.

**Content-Type**: `application/json`

**Request Body**:

```json
{
  "messages": [
    { "role": "user", "content": "What is React hooks?" },
    { "role": "assistant", "content": "React hooks are..." },
    { "role": "user", "content": "Can you give more examples?" }
  ]
}
```

**Response** (200, streaming):

One JSON object per line:

```
{"token":"React"}
{"token":" hooks"}
{"token":" are ..."}
{"done":true}
```

On error:

```
{"error":"Chat failed"}
```

**Behavior**:
- Uses the last user message with **Multi-Query Search** strategy:
  1. LLM generates 3 sub-queries from different perspectives
  2. Runs parallel `$vectorSearch` (cosine, top 4 each)
  3. Merges and deduplicates (first 100 chars as key, keeps highest score)
  4. Returns top 8 results sorted by score
- Retains the most recent 10 history messages (`messages.slice(-10)`)
- Results with score < 0.4 are filtered out
- Returns a prompt message when no relevant results found
- Falls back to single-query search if LLM sub-query generation fails

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

> `count` is clamped between 1–15, defaults to 5.

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
  "error": "Failed to reset quiz data"
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
| 404 | Resource not found |
| 409 | Conflict (e.g., duplicate file upload or quiz submission) |
| 413 | File too large (exceeds 100MB limit) |
| 502 | AI generation format error (LLM returned invalid output) |
| 500 | Internal server error |

---

*Last updated: 2026-03-17*
