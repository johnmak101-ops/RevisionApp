# Use Cases

## Actor Definitions

| Actor | Description |
|-------|-------------|
| **Student** | Bootcamp student who needs to revise course materials |
| **System** | Revision App backend services |
| **OpenRouter AI** | External LLM & Embedding services |
| **MongoDB Atlas** | Cloud database + vector search engine |

---

## UC-01: Upload Course Document

| Field | Details |
|-------|---------|
| **ID** | UC-01 |
| **Name** | Upload Course Document |
| **Actor** | Student |
| **Precondition** | App is running, OpenRouter API is available |
| **Trigger** | Student clicks upload button and selects a file |

**Main Flow**:

1. Student selects a PDF or Markdown file
2. System validates file format (`.pdf`, `.md`, `.markdown`)
3. System validates file size (≤ 100MB) and non-empty
4. System checks for duplicate filenames
5. System extracts text content (PDF → `pdf-parse`, MD → direct parsing)
6. System splits text into Chunks (512 chars, 100 overlap)
7. System batch-calls OpenRouter Embedding API (20 per batch)
8. System saves `Document` and `Chunk` records to MongoDB
9. System returns success response (with `documentId`, `chunkCount`)

**Alternative Flows**:

| Condition | Handling |
|-----------|----------|
| Unsupported format | Return 400 error: only PDF/Markdown accepted |
| Empty file | Return 400 error: invalid file |
| File too large (>100MB) | Return 413 error |
| Duplicate filename | Return 409 error: file already exists |
| PDF extraction fails | Return 400 error: file may be corrupted |
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
2. System converts the question to an embedding vector
3. System runs `$vectorSearch` on MongoDB (cosine, top 50 candidates → 5 results)
4. System filters out results with score < 0.4
5. System combines context + last 6 conversation messages
6. System calls OpenRouter Chat LLM (streaming)
7. Frontend renders response token by token (NDJSON streaming)

**Alternative Flows**:

| Condition | Handling |
|-----------|----------|
| Vector search fails | Falls back to keyword search (regex) |
| No relevant results (all scores < 0.4) | Returns prompt: "No relevant content found, please upload documents" |
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
3. System retrieves document Chunks (sorted by page + chunkIndex)
4. System assembles context (max 12,000 chars)
5. System calls LLM to generate MCQs (question, 4 options, correctIndex, topic, explanation)
6. System validates and filters invalid questions
7. System creates `QuizAttempt` record (unsubmitted state)
8. System returns questions (**hiding correctIndex and explanation**)

**Alternative Flows**:

| Condition | Handling |
|-----------|----------|
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

**Postcondition**: Student sees score and per-question details

**Business Rules**:
- ≥ 80% → "🎉 Excellent! Keep it up!"
- ≥ 60% → "💪 Not bad, room for improvement"
- < 60% → "📚 Keep going, review your weak areas"

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
2. System retrieves Chunks (sorted by page + chunkIndex, max 20,000 chars)
3. System calls LLM to generate structured Markdown summary (streaming)
4. Frontend renders summary token by token

**Alternative Flows**:

| Condition | Handling |
|-----------|----------|
| Document has no Chunks | Return 404 error |
| LLM streaming error | Return error chunk |

**Postcondition**: Student sees a structured study outline

---

## UC-07: View Uploaded Documents

| Field | Details |
|-------|---------|
| **ID** | UC-07 |
| **Name** | View Uploaded Document List |
| **Actor** | Student |
| **Precondition** | None |
| **Trigger** | Auto-called on page load |

**Main Flow**:

1. System queries all `Document` records (sorted by upload time descending)
2. Returns document list (filename, chunkCount, uploadedAt)

**Postcondition**: Components can use the document list (Quiz, Summary file selectors)

---

*Last updated: 2026-03-17*
