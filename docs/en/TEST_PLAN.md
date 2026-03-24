# Test Plan & Test Cases

## 1. Test Objectives

Ensure all Revision App features function correctly, covering:
- File upload and indexing pipeline
- RAG chat Q&A quality and stability
- Quiz generation, answering, and scoring complete flow
- Knowledge gap analysis accuracy
- Summary generation quality
- API error handling and edge cases

---

## 2. Test Scope

| Module | API Endpoint | Priority |
|--------|-------------|----------|
| File Upload (Ingest) | `POST /api/ingest` | P0 |
| Document List | `GET /api/documents` | P1 |
| RAG Chat | `POST /api/chat` | P0 |
| Quiz Generation | `POST /api/quiz/generate` | P0 |
| Quiz Submission | `POST /api/quiz/submit` | P0 |
| Knowledge Gap | `GET /api/quiz/stats` | P1 |
| Summary Generation | `POST /api/summary/generate` | P1 |

---

## 3. Test Environment

| Item | Specification |
|------|---------------|
| Runtime | Node.js 18+ |
| Framework | Next.js 16.x (Turbopack) |
| Database | MongoDB Atlas M0 (with Vector Search Index) |
| LLM | OpenRouter → `google/gemini-2.5-flash-lite` |
| Embedding | OpenRouter → `qwen/qwen3-embedding-8b` |
| Browser | Chrome 120+ / Firefox 120+ |

---

## 4. Test Cases

### TC-01: File Upload — Normal PDF

| Item | Content |
|------|---------|
| **ID** | TC-01 |
| **Maps to** | UC-01 / US-1.1 |
| **Precondition** | App running, MongoDB connection active |
| **Steps** | 1. Click upload area<br>2. Select a valid PDF file (< 100MB)<br>3. Observe upload progress |
| **Expected** | ✅ Shows success message with chunk count<br>✅ MongoDB creates Document and Chunk records<br>✅ Chunks contain embedding vectors |
| **Priority** | P0 |

### TC-02: File Upload — Normal Markdown

| Item | Content |
|------|---------|
| **ID** | TC-02 |
| **Maps to** | UC-01 / US-1.2 |
| **Precondition** | Same as above |
| **Steps** | 1. Upload a `.md` format file |
| **Expected** | ✅ Same as TC-01 |
| **Priority** | P0 |

### TC-03: File Upload — Format Validation

| Item | Content |
|------|---------|
| **ID** | TC-03 |
| **Maps to** | UC-01 |
| **Precondition** | Same as above |
| **Steps** | Upload `.txt`, `.docx`, `.jpg` or other unsupported formats |
| **Expected** | ❌ Returns 400 error, prompting only PDF/Markdown accepted |
| **Priority** | P0 |

### TC-04: File Upload — Empty File

| Item | Content |
|------|---------|
| **ID** | TC-04 |
| **Maps to** | UC-01 |
| **Steps** | Upload a 0-byte empty PDF |
| **Expected** | ❌ Returns 400 error, prompting invalid file |
| **Priority** | P1 |

### TC-05: File Upload — Size Limit Exceeded

| Item | Content |
|------|---------|
| **ID** | TC-05 |
| **Maps to** | UC-01 |
| **Steps** | Upload a file > 100MB |
| **Expected** | ❌ Returns 413 error |
| **Priority** | P1 |

### TC-06: File Upload — Duplicate File

| Item | Content |
|------|---------|
| **ID** | TC-06 |
| **Maps to** | UC-01 / US-1.1 |
| **Steps** | Upload the same-named file twice |
| **Expected** | ❌ Second upload returns 409 error, file already exists |
| **Priority** | P0 |

### TC-07: File Upload — Corrupted PDF

| Item | Content |
|------|---------|
| **ID** | TC-07 |
| **Maps to** | UC-01 |
| **Steps** | Upload a binary-corrupted PDF |
| **Expected** | ❌ Returns 400 error, file may be corrupted |
| **Priority** | P1 |

---

### TC-08: Document List — Normal Load

| Item | Content |
|------|---------|
| **ID** | TC-08 |
| **Maps to** | UC-07 / US-1.3 |
| **Precondition** | At least 1 file uploaded |
| **Steps** | Page load or refresh |
| **Expected** | ✅ Shows filename, chunk count, upload time<br>✅ Sorted by time descending |
| **Priority** | P1 |

### TC-09: Document List — No Documents

| Item | Content |
|------|---------|
| **ID** | TC-09 |
| **Maps to** | UC-07 |
| **Precondition** | No files in database |
| **Steps** | Page load |
| **Expected** | ✅ Shows empty list, no errors |
| **Priority** | P2 |

---

### TC-10: RAG Chat — Normal Q&A

| Item | Content |
|------|---------|
| **ID** | TC-10 |
| **Maps to** | UC-02 / US-2.1 |
| **Precondition** | Files uploaded, embeddings active |
| **Steps** | 1. Switch to Chat tab<br>2. Enter a question related to uploaded documents<br>3. Wait for response |
| **Expected** | ✅ Streaming token-by-token response<br>✅ Answer based on uploaded document content<br>✅ Response language matches input |
| **Priority** | P0 |

### TC-11: RAG Chat — No Relevant Content

| Item | Content |
|------|---------|
| **ID** | TC-11 |
| **Maps to** | UC-02 / US-2.2 |
| **Steps** | Ask a completely unrelated question (e.g., "How far is the moon?") |
| **Expected** | ✅ Vector search score < 0.4, triggers prompt<br>✅ Or degrades to keyword fallback |
| **Priority** | P1 |

### TC-12: RAG Chat — Empty Message

| Item | Content |
|------|---------|
| **ID** | TC-12 |
| **Maps to** | UC-02 |
| **Steps** | Send a blank message |
| **Expected** | ❌ Returns 400 error |
| **Priority** | P1 |

### TC-13: RAG Chat — Conversation History

| Item | Content |
|------|---------|
| **ID** | TC-13 |
| **Maps to** | UC-02 / US-2.1 |
| **Steps** | Ask 4 related questions consecutively; 4th references 1st answer |
| **Expected** | ✅ AI correctly understands context<br>✅ Most recent 10 conversation history included |
| **Priority** | P1 |

### TC-13B: RAG Chat — Code Block Rendering

| Item | Content |
|------|---------|
| **ID** | TC-13B |
| **Maps to** | UC-02 / REV-3 |
| **Precondition** | Uploaded a PDF containing code content (e.g. Java notes) |
| **Steps** | 1. Switch to Chat tab<br>2. Ask a code-related question (e.g. "What's the difference between char and String?")<br>3. Check code snippets in the response |
| **Expected** | ✅ Code displayed in fenced code block (with background color, syntax highlighting)<br>✅ Not rendered inline like `char x = '2';`<br>✅ Code block has copy button |
| **Priority** | P1 |

---

### TC-14: Quiz Generation — Normal Generation

| Item | Content |
|------|---------|
| **ID** | TC-14 |
| **Maps to** | UC-03 / US-3.1 |
| **Precondition** | Files uploaded |
| **Steps** | 1. Switch to Quiz tab<br>2. Select document<br>3. Set question count = 5<br>4. Click "Generate" |
| **Expected** | ✅ Shows 5 MCQ questions<br>✅ Each with 4 options<br>✅ Correct answers hidden<br>✅ QuizAttempt created |
| **Priority** | P0 |

### TC-15: Quiz Generation — No Chunks Document

| Item | Content |
|------|---------|
| **ID** | TC-15 |
| **Maps to** | UC-03 |
| **Steps** | Use a documentId with no chunks |
| **Expected** | ❌ Returns 404 error |
| **Priority** | P1 |

### TC-16: Quiz Generation — Question Range

| Item | Content |
|------|---------|
| **ID** | TC-16 |
| **Maps to** | UC-03 / US-3.1 |
| **Steps** | Test with `numQuestions` = 3, 10, 15 respectively |
| **Expected** | ✅ Generated question count matches setting<br>✅ Does not exceed 15 |
| **Priority** | P1 |

---

### TC-17: Quiz Submission — Normal Submission

| Item | Content |
|------|---------|
| **ID** | TC-17 |
| **Maps to** | UC-04 / US-3.2 |
| **Precondition** | Quiz generated (after TC-14) |
| **Steps** | 1. Select answer for each question<br>2. Click "Submit" after all answered |
| **Expected** | ✅ Shows score and percentage<br>✅ Each question shows: correct answer, user answer, right/wrong, explanation, topic<br>✅ QuizAttempt updated to submitted |
| **Priority** | P0 |

### TC-18: Quiz Submission — Duplicate Submission

| Item | Content |
|------|---------|
| **ID** | TC-18 |
| **Maps to** | UC-04 / US-3.2 |
| **Steps** | Submit same quizId twice |
| **Expected** | ❌ Second submission returns 409 error |
| **Priority** | P0 |

### TC-19: Quiz Submission — Non-existent Quiz

| Item | Content |
|------|---------|
| **ID** | TC-19 |
| **Maps to** | UC-04 |
| **Steps** | Submit with a fake quizId |
| **Expected** | ❌ Returns 404 error |
| **Priority** | P1 |

---

### TC-20: Knowledge Gap — Normal Analysis

| Item | Content |
|------|---------|
| **ID** | TC-20 |
| **Maps to** | UC-05 / US-3.3 |
| **Precondition** | At least one quiz completed |
| **Steps** | Switch to Quiz tab, observe knowledge gap panel |
| **Expected** | ✅ Shows total questions, correct count, percentage<br>✅ Topics sorted by accuracy ascending<br>✅ Weak topics at top |
| **Priority** | P1 |

### TC-21: Knowledge Gap — No Quiz Records

| Item | Content |
|------|---------|
| **ID** | TC-21 |
| **Maps to** | UC-05 |
| **Precondition** | No submitted quizzes |
| **Steps** | Access stats endpoint |
| **Expected** | ✅ Returns empty statistics (0 questions, 0 correct), no errors |
| **Priority** | P2 |

### TC-22A: Knowledge Gap — Reset All Records

| Item | Content |
|------|---------|
| **ID** | TC-22A |
| **Maps to** | UC-05 |
| **Precondition** | At least one quiz submitted |
| **Steps** | Call `DELETE /api/quiz/stats` |
| **Expected** | ✅ Returns `{ deleted: N }` with count of removed records<br>✅ Subsequent `GET /api/quiz/stats` returns empty statistics |
| **Priority** | P1 |

---

### TC-22: Summary — Normal Generation

| Item | Content |
|------|---------|
| **ID** | TC-22 |
| **Maps to** | UC-06 / US-4.1 |
| **Precondition** | Files uploaded |
| **Steps** | 1. Switch to Summary tab<br>2. Select document<br>3. Click "Generate Summary" |
| **Expected** | ✅ Streaming progressive Markdown summary<br>✅ Contains chapters, key points, highlights<br>✅ Language matches source document |
| **Priority** | P1 |

### TC-23: Summary — No Chunks Document

| Item | Content |
|------|---------|
| **ID** | TC-23 |
| **Maps to** | UC-06 |
| **Steps** | Use a documentId with no chunks |
| **Expected** | ❌ Returns 404 error |
| **Priority** | P1 |

---

## 5. Non-Functional Tests

### TC-NF-01: API Response Time

| Item | Content |
|------|---------|
| **ID** | TC-NF-01 |
| **Type** | Performance |
| **Steps** | Measure each API using DevTools Network tab |
| **Expected** | `/api/documents` < 500ms<br>`/api/chat` first token < 5s<br>`/api/ingest` 10-page PDF < 60s |

### TC-NF-02: Streaming Stability

| Item | Content |
|------|---------|
| **ID** | TC-NF-02 |
| **Type** | Reliability |
| **Steps** | Send 5 consecutive chat requests |
| **Expected** | ✅ All streaming completes normally<br>✅ No stream breaks or garbled text |

### TC-NF-03: Error Message Quality

| Item | Content |
|------|---------|
| **ID** | TC-NF-03 |
| **Type** | UX |
| **Steps** | Trigger all known error scenarios |
| **Expected** | ✅ User-friendly error messages<br>✅ No stack trace exposed |

---

## 6. Test Execution Summary

| Category | Total | P0 | P1 | P2 |
|----------|-------|----|----|-----|
| File Upload | 7 | 3 | 4 | 0 |
| RAG Chat | 5 | 1 | 4 | 0 |
| Quiz | 6 | 3 | 3 | 0 |
| Knowledge Gap | 3 | 0 | 2 | 1 |
| Summary | 2 | 0 | 2 | 0 |
| Non-Functional | 3 | 0 | 3 | 0 |
| **Total** | **26** | **7** | **18** | **1** |

---

*Last updated: 2026-03-24*
