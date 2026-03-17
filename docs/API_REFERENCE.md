# API 參考文件

所有 API 端點位於 `/api/` 路徑下，由 Next.js API Routes 提供。

---

## POST `/api/ingest`

上傳 PDF 或 Markdown 文件，自動擷取文字、分割、embedding、存儲。

**Content-Type**: `multipart/form-data`

**Request Body**:

| 欄位 | 類型 | 描述 |
|------|------|------|
| `file` | File | PDF 或 Markdown 文件 |

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
  "error": "描述信息"
}
```

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

---

## POST `/api/chat`

RAG 聊天端點。以 streaming NDJSON 回傳。

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

每行一個 JSON object：

```
{"token":"React"}
{"token":" hooks"}
{"token":" are ..."}
{"done":true}
```

錯誤時：

```
{"error":"Chat failed"}
```

**行為**：
- 取最後一條 user message 做向量搜尋
- 保留最近 6 條 history
- Score < 0.4 嘅結果會被過濾
- 無相關結果時回傳提示信息

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

取得 Quiz 統計數據。

**Query Parameters**: `?documentId=665f...`（可選）

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

根據指定文件生成 AI 摘要大綱。

**Request Body**:

```json
{
  "documentId": "665f..."
}
```

**Response** (200):

```json
{
  "summary": "## 文件大綱\n\n### 第一章 ..."
}
```

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
| 404 | 資源不存在 |
| 500 | 伺服器內部錯誤 |

---

*更新日期：2026-03-17*
