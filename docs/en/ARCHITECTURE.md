# System Architecture

## Directory Structure

```
revision-app/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── chat/route.ts          # RAG Chat (Streaming)
│   │   │   ├── documents/route.ts     # Document List Management
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
│   │   ├── QuizPanel.tsx              # Quiz Generation & Answering
│   │   ├── KnowledgeGap.tsx           # Knowledge Gap Analysis
│   │   ├── SummaryPanel.tsx           # Summary Outline
│   │   ├── TabNav.tsx                 # Tab Navigation
│   │   ├── MarkdownRenderer.tsx       # Markdown Renderer (markdown-it + highlight.js + DOMPurify)
│   │   ├── MarkdownRendererDynamic.tsx # Dynamic import wrapper (next/dynamic)
│   │   └── UploadToast.tsx            # Upload Result Toast Notification
│   ├── lib/
│   │   ├── chunking.ts               # Header-aware Text Splitting (with header context prefix)
│   │   ├── db.ts                      # MongoDB Connection (Singleton)
│   │   ├── embedding.ts              # OpenRouter Embedding API
│   │   ├── llm.ts                     # LLM Singleton (streamingLLM + toolLLM)
│   │   ├── md.ts                      # Markdown Parsing
│   │   ├── pdf.ts                     # PDF Text Extraction (LlamaParse REST API)
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
| `metadata` | Mixed | Additional metadata |

**Indexes**: `pdfId: 1` (standard index) + `chunk_vector_index` (Atlas vector index, cosine)

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
PDF → LlamaParse REST API (cloud extraction, multilingual + scanned PDF support)
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
Score filter (≥ 0.4) → Keyword fallback when no results
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
| **Duplicate Filename Check** | Ingest | Returns 409 on duplicate |
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

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/ingest` | Upload PDF/MD file |
| GET | `/api/documents` | Get uploaded document list |
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
| LlamaParse replaces pdf-parse + tesseract.js | Cloud API handles complex layouts, multilingual text, and scanned PDFs without local OCR |
| Direct fetch to OpenRouter instead of LangChain Embeddings | Avoids compatibility issues with OpenRouter response format differences |
| Warmup + dimension detection | Detects vector dimensions at startup, ensures match with Atlas index |
| Keyword fallback | Uses regex backup when vector search returns no results, improves fault tolerance |
| Vercel AI SDK streaming (Chat) | Uses `createUIMessageStreamResponse` + `toUIMessageStream` for Chat streaming; frontend uses `useChat` to auto-receive |
| Streaming NDJSON (Summary) | Summary uses NDJSON for token-by-token response, improving experience |
| Batch embedding (20/batch) | OpenRouter may limit batch size |
| Score filter (≥ 0.4) | Filters low-relevance results to prevent hallucination |
| Multi-Query Search | LLM splits question into 3 perspectives for parallel search, improving recall |
| toolLLM (non-streaming) | Lightweight low-temperature LLM dedicated to tool calls (multi-query generation) |
| Header-aware chunking | Splits by Markdown headers, prepends header context prefix per chunk (e.g. "Java > Data Types") for improved embedding accuracy |
| MongoDB singleton | Prevents duplicate connections in Next.js dev mode |
| System prompt enforces fenced code | Explicitly requires code with = ; {} to use fenced code blocks |
| Vard prompt guard | Uses `@andersmyrmel/vard` to detect + block prompt injection (instruction override, role manipulation, system prompt leak) |
| In-memory rate limiter | Sliding-window rate limiting without Redis, suitable for Vercel serverless deployment |
| ChatPromptTemplate role separation | Quiz/Summary use LangChain ChatPromptTemplate to separate system instructions from user context, preventing user-injected system roles |
| Chunk Content Guard (Ingest) | Vard scans each chunk at upload time, strips content with indirect injection patterns to prevent malicious documents from polluting RAG context |

---

*Last updated: 2026-03-23*
