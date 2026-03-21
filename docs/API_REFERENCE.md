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

**Error** (400/409/413/500):

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
- 取最後一條 user message，用 **Multi-Query Search** 策略搜尋：
  1. LLM 將問題拆成 3 個唔同角度嘅子查詢
  2. 並行對每個子查詢執行 `$vectorSearch`（cosine，每個 top 4）
  3. 合併去重（content 前 100 字作 key，保留最高分）
  4. 按分數排序取最佳 8 條結果
- 保留最近 10 條 history（`messages.slice(-10)`）
- Score < 0.4 嘅結果會被過濾
- 無相關結果時回傳提示信息
- LLM 子查詢生成失敗時，自動 fallback 到原問題單次搜尋

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

> `count` 會限制喺 1–15 之間，預設為 5。

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
  "error": "Failed to reset quiz data"
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
| 409 | 衝突（如重複上傳文件或重複提交 Quiz） |
| 413 | 檔案過大（超過 100MB 上限） |
| 502 | AI 生成格式錯誤（LLM 輸出唔合格） |
| 500 | 伺服器內部錯誤 |

---

*更新日期：2026-03-17*
