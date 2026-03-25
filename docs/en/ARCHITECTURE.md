# System Architecture

## Directory Structure

```
revision-app/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── chat/route.ts          # RAG Chat (Streaming)
│   │   │   ├── documents/route.ts     # Document list (GET)
│   │   │   ├── documents/[id]/route.ts # Delete one document (DELETE)
│   │   │   ├── ingest/route.ts        # PDF/MD Upload → Vectorization
│   │   │   ├── quiz/
│   │   │   │   ├── generate/route.ts  # AI Auto Quiz Generation
│   │   │   │   ├── submit/route.ts    # Submit Answers & Scoring
│   │   │   │   └── stats/route.ts     # Quiz Statistics
│   │   │   └── summary/
│   │   │       └── generate/route.ts  # AI Summary Outline
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx                   # Main Page (Tab Navigation)
│   ├── components/
│   │   ├── ChatBox.tsx                # Chat Interface (streaming)
│   │   ├── FileUpload.tsx             # File Upload
│   │   ├── DocumentList.tsx           # Indexed document list (delete)
│   │   ├── QuizPanel.tsx              # Quiz Generation & Answering
│   │   ├── KnowledgeGap.tsx           # Knowledge Gap Analysis
│   │   ├── SummaryPanel.tsx           # Summary Outline
│   │   ├── TabNav.tsx                 # Tab Navigation
│   │   ├── MarkdownRenderer.tsx       # Markdown Renderer (markdown-it + highlight.js + DOMPurify)
│   │   ├── MarkdownRendererDynamic.tsx # Dynamic import wrapper (next/dynamic)
│   │   └── UploadToast.tsx            # Upload Result Toast Notification
│   ├── lib/
│   │   ├── chunking.ts               # Header-aware Text Splitting (with header context prefix)
│   │   ├── db.ts                      # MongoDB Connection (Cached, global cache in dev to prevent HMR duplicates)
│   │   ├── embedding.ts              # OpenRouter Embedding API
│   │   ├── llm.ts                     # LLM Singleton (streamingLLM + toolLLM)
│   │   ├── md.ts                      # Markdown Parsing
│   │   ├── pdf.ts                     # PDF Text Extraction (LlamaParse REST API + parsing_instruction)
│   │   ├── promptGuard.ts            # Prompt Injection Protection (Vard)
│   │   ├── rateLimiter.ts            # In-memory IP Rate Limiter
│   │   └── search.ts                 # Vector Search + Multi-Query + Keyword Fallback
│   └── models/
│       ├── Chunk.ts                   # Text Chunk (with embedding)
│       ├── Document.ts              # Uploaded Document Record
│       └── QuizAttempt.ts           # Quiz Attempt Record
├── scripts/
│   └── vector-index.json             # Atlas Vector Index Definition
└── docs/
    └── ...
```

---

## Data Models

### Document

| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | Primary key |
| `filename` | String | Stored filename |
| `originalName` | String | Original filename |
| `uploadedAt` | Date | Upload timestamp |
| `chunkCount` | Number | Number of chunks |

### Chunk

| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | Primary key |
| `content` | String | Text content |
| `embedding` | Number[] | Vector (dimensions determined by model) |
| `pdfId` | ObjectId → Document | Associated document |
| `page` | Number | Page number |
| `chunkIndex` | Number | Chunk sequence number |
| `filename` | String | Source filename (`$vectorSearch` pre-filter) |
| `chapter` | String | H1 section (optional, pre-filter) |
| `metadata` | Mixed | Additional metadata |

**Indexes**: `pdfId: 1`, `filename: 1`, `chapter: 1` (standard indexes) + `chunk_vector_index` (Atlas vector index, cosine; see `scripts/vector-index.json`)

### QuizAttempt

| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | Primary key |
| `documentId` | ObjectId → Document | Associated document |
| `questions` | Question[] | Question list |
| `score` | Number | Score |
| `totalQuestions` | Number | Total questions |
| `submittedAt` | Date | Submission timestamp |

**Question subdocument**: `{ question, options[], correctIndex, userAnswer?, topic, explanation }`

**Indexes**: `documentId: 1`, `submittedAt: -1`

---

## Core Flows

### 1. File Upload (Ingest Pipeline)

```
PDF/MD Upload
    ↓
PDF → LlamaParse REST API (upload with parsing_instruction for table accuracy + polling → Markdown)
MD → direct parsing
    ↓
Per-page text
    ↓
Header-aware splitting (splitByHeaders: split by #/##/###, track header hierarchy)
    ↓
RecursiveCharacterTextSplitter sub-split (512 chars, 100 overlap)
    ↓
Prepend header context prefix per chunk (e.g. "Java > Data Types")
    ↓
OpenRouter Embedding API (batch 20)
    ↓
MongoDB stores Document + Chunks (with embedding)
```

### 2. RAG Chat (Chat Pipeline)

```
User question
    ↓
Multi-Query Search (multiQuerySearch):
  1. toolLLM generates 3 sub-queries (different perspectives)
  2. Parallel embedText → $vectorSearch (cosine, top 4 each)
  3. Merge and deduplicate (first 100 chars as key, keep highest score)
  4. Sort by score, take top 8
    ↓
`vectorSearch`: drop raw cosine < 0.60 → normalize rest to 0–1 → `chat/route`: drop normalized < 0.40 → keyword fallback when no results
    ↓
LangChain ChatPromptTemplate + History (most recent 10)
    ↓
LangChain RunnableSequence.stream()
    ↓
Vercel AI SDK: toUIMessageStream → createUIMessageStreamResponse
    ↓
Frontend useChat (@ai-sdk/react) auto-receives + markdown-it rendering
```

### 3. Quiz Generation Flow

```
Select Document → Retrieve relevant Chunks
    ↓
AI generates MCQ questions (with topic, explanation)
    ↓
User answers → submit → scoring
    ↓
QuizAttempt stored → stats aggregation
    ↓
KnowledgeGap analyzes weak topics
```

---

## Security

### Business Risk & Protection Goals

Security protections are not purely technical — they directly impact product trust and learning quality:

| Protection Layer | Goal | Business Risk (if absent) |
|-----------------|------|---------------------------|
| **Vard Guard** | Detect and block Prompt Injection attacks (instruction override, role manipulation, system prompt leak) | Attackers could inject malicious instructions, causing AI to produce misleading content that harms student learning quality |
| **Chunk Content Guard** | Scan each chunk from uploaded documents to ensure input data integrity | Malicious documents carrying indirect injection patterns could contaminate the RAG context, affecting all users' query results |
| **Rate Limiting** | Control API request frequency to prevent abuse | Excessive requests consume OpenRouter API quota, causing service interruption or unexpected costs |
| **Input Sanitization** | Strip delimiter injection and encoding attacks | Bypasses other protection layers to directly manipulate LLM behaviour |

### Prompt Injection Protection

Different endpoints use different protection strategies depending on user input type:

**Ingest (file upload):**

```
File Upload
    ↓
Format Validation (.pdf / .md / .markdown) → 400
    ↓
Empty File Check → 400
    ↓
Size Limit (100MB) → 413
    ↓
Duplicate Filename Check → 409
    ↓
Chunk Injection Scan (guardChunkContent) → strip suspicious chunks
    ↓
All flagged → 422 / Partial flagged → continue + warning
    ↓
Embedding → Store
```

> ⚠️ `/api/ingest` currently has no rate limiting. Bulk uploads may exhaust LlamaParse / Embedding API quota.

**Chat (free-text user input):**

```
Incoming Request
    ↓
Rate Limit Check → 429 if exceeded
    ↓
Vard Guard Detection → Warning on injection attack
    ↓
Sanitized text → LLM
```

**Quiz / Summary (documentId input only):**

```
Incoming Request
    ↓
Rate Limit Check → 429 if exceeded
    ↓
DocumentId Format Validation (24-char hex ObjectId)
    ↓
ChatPromptTemplate Role Separation → LLM
```

| Layer | Applies To | Description |
|-------|------------|-------------|
| **File Format Validation** | Ingest | Only accepts .pdf / .md / .markdown |
| **Size Limit (100MB)** | Ingest | Returns 413 if exceeded |
| **Duplicate Filename Check** | Ingest | Returns 409 on duplicate; delete via `DELETE /api/documents/[id]` or **Indexed documents** UI, then re-upload |
| **Chunk Content Guard** | Ingest | Vard scans each chunk, strips content with injection patterns (indirect prompt injection protection) |
| **Vard Guard** | Chat | Detects instruction override, role manipulation, system prompt leak |
| **Custom Patterns** | Chat | Additional blocking for DAN jailbreak, prompt leak variants |
| **Input Sanitization** | Chat | Cleans delimiter injection, encoding attacks |
| **ChatPromptTemplate** | Quiz, Summary | System/user role separation to prevent context injection |
| **DocumentId Validation** | Quiz, Summary | Only accepts valid 24-char hex MongoDB ObjectId |

### Rate Limiting

| Endpoint | Limit |
|----------|-------|
| `/api/chat` | 20 req/min per IP |
| `/api/quiz/generate` | 10 req/min per IP |
| `/api/summary/generate` | 10 req/min per IP |

---

## Scalability & Constraints

### Technology Selection Rationale

| Decision | Business Driver | Alternative | Why Not Alternative |
|----------|-----------------|-------------|---------------------|
| **LlamaParse** for PDF | Bootcamp materials frequently contain scanned content (handwritten notes, slide screenshots) requiring high-accuracy OCR. Custom `parsing_instruction` ensures data-type comparison tables and code snippets are preserved accurately | `pdf-parse` + `tesseract.js` | Local OCR has poor multilingual support and low accuracy for scans, degrading RAG answer quality |
| **OpenRouter** unified API | Single endpoint for multiple LLMs, reducing vendor lock-in risk | Direct OpenAI / Google API | Fewer free-tier options; switching models requires code changes |
| **MongoDB Atlas M0** | Free 512MB cluster is sufficient for bootcamp-scale document chunks | PostgreSQL + pgvector | MongoDB native vector search + free cluster = zero-cost startup |

### Known Limitations

| Limitation | Impact | Current Mitigation |
|------------|--------|-------------------|
| LlamaParse free tier daily page quota | Large PDF batches may exceed quota | Frontend error prompt + specific API error messages |
| OpenRouter free model rate limits | May hit throttling during peak usage | In-memory rate limiter to control request frequency |
| In-memory rate limiter has no persistence | Vercel serverless restarts reset counters | Acceptable risk: bootcamp usage is low-traffic |

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/ingest` | Upload PDF/MD file |
| GET | `/api/documents` | Get uploaded document list |
| DELETE | `/api/documents/[id]` | Delete document, chunks, related QuizAttempts |
| POST | `/api/chat` | RAG chat (Vercel AI SDK streaming) |
| POST | `/api/quiz/generate` | AI generate quiz questions |
| POST | `/api/quiz/submit` | Submit quiz answers |
| GET | `/api/quiz/stats` | Quiz statistics |
| DELETE | `/api/quiz/stats` | Reset all Quiz records |
| POST | `/api/summary/generate` | AI generate document summary |

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| LlamaParse replaces pdf-parse + tesseract.js | Cloud API handles complex layouts, multilingual text, and scanned PDFs without local OCR. Custom `parsing_instruction` improves table parsing accuracy |
| Direct fetch to OpenRouter instead of LangChain Embeddings | Avoids compatibility issues with OpenRouter response format differences |
| Warmup + dimension detection | Detects vector dimensions at startup, ensures match with Atlas index |
| Keyword fallback | Uses regex backup when vector search returns no results, improves fault tolerance |
| Vercel AI SDK streaming (Chat) | Uses `createUIMessageStreamResponse` + `toUIMessageStream` for Chat streaming; frontend uses `useChat` to auto-receive |
| Streaming NDJSON (Summary) | Summary uses NDJSON for token-by-token response, improving experience |
| Batch embedding (20/batch) | OpenRouter may limit batch size |
| Two-stage score thresholds | `search.ts` drops raw cosine < 0.60, normalizes scores; `chat/route.ts` then drops normalized < 0.40 before building context |
| Multi-Query Search | LLM splits question into 3 perspectives for parallel search, improving recall |
| toolLLM (non-streaming) | Lightweight low-temperature LLM dedicated to tool calls (multi-query generation) |
| Header-aware chunking | Splits by Markdown headers, prepends header context prefix per chunk (e.g. "Java > Data Types") for improved embedding accuracy |
| MongoDB cached connection | Dev mode uses `global` cache to prevent HMR duplicate connections; Production (Vercel serverless) each instance holds its own connection |
| System prompt enforces fenced code | Explicitly requires code with = ; {} to use fenced code blocks |
| Vard prompt guard | Uses `@andersmyrmel/vard` to detect + block prompt injection (instruction override, role manipulation, system prompt leak) |
| In-memory rate limiter | Sliding-window rate limiting without Redis, suitable for Vercel serverless deployment |
| ChatPromptTemplate role separation | Quiz/Summary use LangChain ChatPromptTemplate to separate system instructions from user context, preventing user-injected system roles |
| Chunk Content Guard (Ingest) | Vard scans each chunk at upload time, strips content with indirect injection patterns to prevent malicious documents from polluting RAG context |

---

*Last updated: 2026-03-25*
