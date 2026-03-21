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
│   │   └── UploadToast.tsx            # Upload Result Toast Notification
│   ├── lib/
│   │   ├── chunking.ts               # LangChain Text Splitting (with table preservation)
│   │   ├── db.ts                      # MongoDB Connection (Singleton)
│   │   ├── embedding.ts              # OpenRouter Embedding API
│   │   ├── llm.ts                     # LLM Singleton (streamingLLM + toolLLM)
│   │   ├── md.ts                      # Markdown Parsing
│   │   ├── pdf.ts                     # PDF Text Extraction
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
pdf-parse (text extraction) → if no text found → pdf-to-img + tesseract.js (OCR)
MD → direct parsing
    ↓
Per-page text
    ↓
RecursiveCharacterTextSplitter (512 chars, 100 overlap)
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
OpenRouter ChatOpenAI streaming → ReadableStream
    ↓
Frontend NDJSON streaming rendering
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

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/ingest` | Upload PDF/MD file |
| GET | `/api/documents` | Get uploaded document list |
| POST | `/api/chat` | RAG chat (streaming NDJSON) |
| POST | `/api/quiz/generate` | AI generate quiz questions |
| POST | `/api/quiz/submit` | Submit quiz answers |
| GET | `/api/quiz/stats` | Quiz statistics |
| DELETE | `/api/quiz/stats` | Reset all Quiz records |
| POST | `/api/summary/generate` | AI generate document summary |

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Direct fetch to OpenRouter instead of LangChain Embeddings | Avoids compatibility issues with OpenRouter response format differences |
| Warmup + dimension detection | Detects vector dimensions at startup, ensures match with Atlas index |
| Keyword fallback | Uses regex backup when vector search returns no results, improves fault tolerance |
| Streaming NDJSON | Improves chat experience with token-by-token response |
| Batch embedding (20/batch) | OpenRouter may limit batch size |
| Score filter (≥ 0.4) | Filters low-relevance results to prevent hallucination |
| Multi-Query Search | LLM splits question into 3 perspectives for parallel search, improving recall |
| toolLLM (non-streaming) | Lightweight low-temperature LLM dedicated to tool calls (multi-query generation) |
| Table-aware chunking | Auto-detects pipe tables and preserves them as single chunks |
| MongoDB singleton | Prevents duplicate connections in Next.js dev mode |

---

*Last updated: 2026-03-17*
