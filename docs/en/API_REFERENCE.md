# API Reference

All API endpoints are located under the `/api/` path, served by Next.js API Routes.

---

## POST `/api/ingest`

Upload a PDF or Markdown file with automatic text extraction, chunking, embedding, and storage.

**Content-Type**: `multipart/form-data`

**Request Body**:

| Field | Type | Description |
|-------|------|-------------|
| `file` | File | PDF or Markdown file |

**Response** (200):

```json
{
  "documentId": "665f...",
  "filename": "lecture01.pdf",
  "chunkCount": 42,
  "message": "Ingestion complete"
}
```

**Error** (400/500):

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
- Uses the last user message for vector search
- Retains the most recent 6 history messages
- Results with score < 0.4 are filtered out
- Returns a prompt message when no relevant results found

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

**Response** (200):

```json
{
  "quizId": "666a...",
  "questions": [
    {
      "question": "Which of the following...",
      "options": ["A", "B", "C", "D"],
      "topic": "React Hooks"
    }
  ]
}
```

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
  "score": 4,
  "total": 5,
  "results": [
    {
      "question": "Which of the following...",
      "correct": true,
      "correctIndex": 0,
      "userAnswer": 0,
      "explanation": "..."
    }
  ]
}
```

---

## GET `/api/quiz/stats`

Get quiz statistics.

**Query Parameters**: `?documentId=665f...` (optional)

**Response** (200):

```json
{
  "totalAttempts": 10,
  "averageScore": 72.5,
  "weakTopics": [
    { "topic": "Closures", "errorRate": 0.6 },
    { "topic": "Promises", "errorRate": 0.4 }
  ]
}
```

---

## POST `/api/summary/generate`

Generate an AI summary outline for a specified document.

**Request Body**:

```json
{
  "documentId": "665f..."
}
```

**Response** (200):

```json
{
  "summary": "## Document Outline\n\n### Chapter 1 ..."
}
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
| 409 | Conflict (e.g., duplicate submission) |
| 500 | Internal server error |

---

*Last updated: 2026-03-17*
