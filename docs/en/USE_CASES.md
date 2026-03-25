# Use Cases

## Actor Definitions

| Actor | Description |
|-------|-------------|
| **Student** | Bootcamp student who needs to revise course materials |
| **System** | Revision App backend services |
| **OpenRouter AI** | External LLM & Embedding services |
| **MongoDB Atlas** | Cloud database + vector search engine |
| **LlamaCloud** | LlamaParse REST API — PDF text extraction service (multilingual, scanned PDF support, custom `parsing_instruction` for table accuracy) |

---
## Use Case Overview

The core of this project revolves around the **"Revision"** workflow, covering the entire journey from material upload to knowledge consolidation:

1.  **UC-01 Upload Document**: Supports PDF/Markdown parsing and vector indexing.
2.  **UC-02 RAG Chat**: Intelligent Q&A based on document content, supporting multi-query and guards.
3.  **UC-03 Generate Quiz**: AI automatically extracts key points to generate multiple-choice questions.
4.  **UC-04 Submit Quiz**: Automatic scoring and tracking of learning progress.
5.  **UC-05 Knowledge Gap**: Analyzes weak areas and provides improvement suggestions.
6.  **UC-06 Generate Summary**: One-click extraction of chapter highlights and outlines.
7.  **UC-07 List Documents**: View the list of all uploaded revision materials.
8.  **UC-09 Delete Document**: Remove an indexed document (chunks + related quiz attempts) to allow re-uploading the same filename.
9.  **UC-08 Reset Records**: Clear all quiz history and start fresh.

---

## UC-01: Upload Course Document

| Field | Details |
|-------|---------|
| **ID** | UC-01 |
| **Name** | Upload Course Document |
| **Actor** | Student |
| **Precondition** | App is running, OpenRouter API is available, LlamaCloud API is available |
| **Trigger** | Student clicks upload button and selects a file |

**Main Flow**:

1. Student selects a PDF or Markdown file
2. System validates file format (`.pdf`, `.md`, `.markdown`)
3. System validates file size (≤ 100MB) and non-empty
4. System checks for duplicate filenames
5. System extracts text content (PDF → LlamaParse Cloud API + `parsing_instruction`, MD → direct parsing)
6. System splits text by Markdown headers, then sub-splits into Chunks (512 chars, 100 overlap) with header context prefix per chunk
7. System runs **PromptGuard security scan** on all chunks — flagged chunks are removed; if all chunks flagged, returns 422
8. System batch-calls OpenRouter Embedding API (20 per batch)
9. System saves `Document` and `Chunk` records to MongoDB
10. System returns success response (with `id`, `chunkCount`); if some chunks were flagged by PromptGuard, also returns `warning` + `flaggedChunks` count

**Alternative Flows**:

| Condition | Handling |
|-----------|----------|
| Unsupported format | Return 400 error: only PDF/Markdown accepted |
| Empty file | Return 400 error: invalid file |
| File too large (>100MB) | Return 413 error |
| Duplicate filename | Return 409: remove the file from **Indexed documents** first, or call `DELETE /api/documents/[id]` |
| PDF extraction fails | Return 400 error: LlamaParse failed or timed out, retry or reduce PDF size |
| All chunks flagged by PromptGuard | Return 422 error: content rejected by security |
| Empty chunks | Return 400 error: unable to extract text |
| Embedding API failure | Return 500 error |

**Postcondition**: Document is indexed and available for Chat, Quiz, Summary

---

## UC-02: AI Chat Revision (RAG Chat)

| Field | Details |
|-------|---------|
| **ID** | UC-02 |
| **Name** | AI Chat Revision (RAG Chat) |
| **Actor** | Student |
| **Precondition** | At least one document uploaded and indexed |
| **Trigger** | Student enters a question in Chat Tab |

**Main Flow**:

1. Student enters a question
2. System runs **Rate Limiting** check (IP-based sliding window, max 20 req/min)
3. System runs **PromptGuard check** — validates message length (≤ 2000 chars) + detects injection attacks; if unsafe returns warning, if safe returns sanitized text
4. System uses Multi-Query Search strategy to find relevant content:
   - toolLLM generates 3 sub-queries (different perspectives)
   - Runs parallel `$vectorSearch` (cosine, top 4 each)
   - Merges and deduplicates, sorts by score, takes top 8
5. System applies dual-layer relevance filtering:
   - Layer 1: `search.ts` discards chunks with raw cosine < 0.60
   - Layer 2: `chat/route.ts` discards results with normalized score < 0.40 (`search.ts` `normalizeScore` maps raw scores to 0–1 with fixed endpoints — not per-query min-max)
6. System combines context + last 10 conversation messages
7. System calls OpenRouter Chat LLM (streaming)
8. System streams response via Vercel AI SDK (`createUIMessageStreamResponse` + `toUIMessageStream`)
9. Frontend receives via `useChat` (@ai-sdk/react) and renders with markdown-it

**Alternative Flows**:

| Condition | Handling |
|-----------|----------|
| Rate limit exceeded (20/min) | Return 429 + `Retry-After` header |
| Message exceeds 2000 chars | Return warning message (PromptGuard) |
| Prompt injection detected | Returns warning message (PromptGuard) |
| Vector search fails | Falls back to keyword search (regex) |
| No relevant results (empty after dual-layer filter) | Returns prompt: "No relevant content found, please upload documents" |
| LLM streaming error | Returns error chunk |
| Empty messages | Returns 400 error |

**Postcondition**: Student sees an answer based on document content

---

## UC-03: Generate Quiz Questions

| Field | Details |
|-------|---------|
| **ID** | UC-03 |
| **Name** | Generate Quiz Questions |
| **Actor** | Student |
| **Precondition** | At least one document uploaded |
| **Trigger** | Student selects a document and clicks "Generate Quiz" |

**Main Flow**:

1. Student selects target document
2. Student sets question count (3-15, default 5)
3. System runs **Rate Limiting** check (max 10 req/min)
4. System validates `documentId` format (`guardDocumentId`: 24 hex chars, MongoDB ObjectId)
5. System retrieves document Chunks (sorted by page + chunkIndex)
6. System assembles context (max 12,000 chars)
7. System calls LLM to generate MCQs (question, 4 options, correctIndex, topic, explanation)
8. System validates and filters invalid questions
9. System creates `QuizAttempt` record (unsubmitted state)
10. System returns questions (**hiding correctIndex and explanation**)

**Alternative Flows**:

| Condition | Handling |
|-----------|----------|
| Rate limit exceeded (10/min) | Return 429 + `Retry-After` header |
| Invalid documentId format | Return 400 error |
| Document has no Chunks | Return 404 error |
| LLM returns invalid JSON | Return 502 error: please retry |
| All questions invalid | Return 502 error |

**Postcondition**: Student sees unanswered Quiz

---

## UC-04: Submit Quiz Answers

| Field | Details |
|-------|---------|
| **ID** | UC-04 |
| **Name** | Submit Quiz Answers |
| **Actor** | Student |
| **Precondition** | Quiz fully completed (after UC-03) |
| **Trigger** | Student clicks "Submit Answers" |

**Main Flow**:

1. Student selects answers for each question
2. After completing all questions, student submits
3. System compares `userAnswer` with `correctIndex`
4. System calculates score and percentage
5. System updates `QuizAttempt` (records answers, score, submission time)
6. System returns per-question results (with correct answer, explanation, topic label)

**Alternative Flows**:

| Condition | Handling |
|-----------|----------|
| Quiz already submitted | Return 409 error: already submitted |
| QuizId not found | Return 404 error |
| Answer count mismatch | Return 400 error: must answer all questions |

**Postcondition**: Student sees score and per-question details

**Business Rules**:
- ≥ 80% → "🎉 好掂！繼續保持！"
- ≥ 60% → "💪 唔錯，仲有進步空間"
- < 60% → "📚 加油，建議重溫弱項"

---

## UC-05: View Knowledge Gap Analysis

| Field | Details |
|-------|---------|
| **ID** | UC-05 |
| **Name** | Knowledge Gap Analysis |
| **Actor** | Student |
| **Precondition** | At least one Quiz submitted |
| **Trigger** | Switch to Quiz Tab (auto-loads) |

**Main Flow**:

1. System queries all submitted `QuizAttempt` records
2. System groups by topic and calculates accuracy rate per topic
3. System sorts by accuracy **ascending** (weakest topics first)
4. Frontend displays overall stats + topic breakdown

**Postcondition**: Student identifies which topics need reinforcement

---

## UC-06: Generate Document Summary

| Field | Details |
|-------|---------|
| **ID** | UC-06 |
| **Name** | AI-Generated Document Summary |
| **Actor** | Student |
| **Precondition** | At least one document uploaded |
| **Trigger** | Student selects a document in Summary Tab and clicks Generate |

**Main Flow**:

1. Student selects target document
2. System runs **Rate Limiting** check (max 10 req/min)
3. System validates `documentId` format (`guardDocumentId`: 24 hex chars)
4. System retrieves Chunks (sorted by page + chunkIndex, max 20,000 chars)
5. System calls LLM to generate structured Markdown summary (streaming)
6. System streams response in NDJSON format (each line `{ token }` → final `{ done: true }`)
7. Frontend renders summary token by token

**Alternative Flows**:

| Condition | Handling |
|-----------|----------|
| Rate limit exceeded (10/min) | Return 429 + `Retry-After` header |
| Invalid documentId format | Return 400 error |
| Document has no Chunks | Return 404 error |
| LLM streaming error | Return NDJSON `{ error }` chunk |

**Postcondition**: Student sees a structured study outline

---

## UC-07: View Uploaded Documents

| Field | Details |
|-------|---------|
| **ID** | UC-07 |
| **Name** | View Uploaded Document List |
| **Actor** | Student |
| **Precondition** | None |
| **Trigger** | Page load or `["documents"]` cache invalidation (`DocumentList`, `useQuiz`, `SummaryPanel`) |

**Main Flow**:

1. Frontend calls `GET /api/documents`
2. System queries all `Document` records (sorted by upload time descending)
3. Returns document list (filename, originalName, chunkCount, uploadedAt)

**Postcondition**: Home **Indexed documents** list and Quiz/Summary selectors share the same data source

---

## UC-09: Delete Indexed Document

| Field | Details |
|-------|---------|
| **ID** | UC-09 |
| **Name** | Delete Indexed Document |
| **Actor** | Student |
| **Precondition** | At least one indexed document exists |
| **Trigger** | Student clicks **Delete** under **Indexed documents** and confirms |

**Main Flow**:

1. Frontend calls `DELETE /api/documents/{id}` (`id` is `_id` from `GET /api/documents`)
2. System validates `id` as a 24-character hex ObjectId
3. System deletes all `Chunk` documents with `pdfId` = id
4. System deletes all `QuizAttempt` documents with `documentId` = id
5. System deletes the `Document`
6. Returns `{ success, deletedDocumentId, deletedChunks }`; frontend invalidates the shared `documents` cache (Quiz, Summary, list)

**Alternative Flows**:

| Condition | Handling |
|-----------|----------|
| Invalid id | 400 |
| Document not found | 404 |

**Postcondition**: The file no longer appears in RAG / Quiz / Summary; the same filename can be ingested again.

---

## UC-08: Reset Quiz Records

| Field | Details |
|-------|---------|
| **ID** | UC-08 |
| **Name** | Reset Quiz Records |
| **Actor** | Student |
| **Precondition** | At least one Quiz submitted |
| **Trigger** | Student clicks "Reset Records" button |

**Main Flow**:

1. Student confirms clearing all quiz records
2. System deletes all documents in `QuizAttempt` collection
3. System returns deleted count `{ deleted: number }`
4. Frontend clears Knowledge Gap stats

**Alternative Flows**:

| Condition | Handling |
|-----------|----------|
| No records to delete | Return `{ deleted: 0 }` |
| DB operation fails | Return 500 error |

**Postcondition**: All quiz records cleared, Knowledge Gap reset to zero

---

*Last updated: 2026-03-25*
