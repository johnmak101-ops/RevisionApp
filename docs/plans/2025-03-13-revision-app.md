# Bootcamp Revision App Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a revision app that ingests Bootcamp PDFs, stores them in MongoDB Atlas Vector Search, and provides an AI chat interface for Q&A over the content—all on free tier services.

**Architecture:** Next.js 16 full-stack app with API routes. PDFs are extracted (pdf-parse), chunked, embedded locally (Transformers.js), stored in MongoDB Atlas with vector index. Chat uses RAG: embed query → vector search → inject context → Gemini API response.

**Tech Stack:** Next.js 16.1.6, TypeScript, MongoDB Atlas (M0 free), Mongoose, pdf-parse, Ollama (nomic-embed-text), LangChain, Tailwind CSS

**Free Tier Services:**
| Service | Free Tier |
|---------|-----------|
| MongoDB Atlas | M0 cluster, 512MB, vector search |
| Vercel | Next.js hosting |
| Google AI Studio | Gemini API, 15 RPM |
| Embeddings | Ollama nomic-embed-text (local GPU) |

---

## Task 1: Bootstrap Project

**Files:**
- Create: `revision-app/package.json`
- Create: `revision-app/tsconfig.json`
- Create: `revision-app/next.config.js`
- Create: `revision-app/tailwind.config.ts`
- Create: `revision-app/postcss.config.js`
- Create: `revision-app/.env.example`
- Create: `revision-app/.gitignore`

**Step 1:** Create Next.js app with TypeScript, Tailwind, App Router

Run: `npx create-next-app@16 revision-app --ts --tailwind --app --turbopack`

**Step 2:** Install dependencies

```bash
cd revision-app
npm install mongoose pdf-parse @langchain/ollama @langchain/core @langchain/textsplitters
```

**Step 3:** Create .env.example

```
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/revision?retryWrites=true
GOOGLE_AI_API_KEY=your_gemini_api_key
```

---

## Task 2: MongoDB Schema and Vector Index

**Files:**
- Create: `revision-app/src/lib/db.ts`
- Create: `revision-app/src/models/Document.ts`
- Create: `revision-app/src/models/Chunk.ts`

**Chunk schema:** `{ content, embedding: [Number], pdfId, page, metadata }`
**Vector index:** Create on `embedding` field with cosine similarity

---

## Task 3: PDF Extraction Service

**Files:**
- Create: `revision-app/src/lib/pdf.ts`

Use pdf-parse to extract text per page. Return `{ text, pageNumber }[]`.

---

## Task 4: Chunking Service

**Files:**
- Create: `revision-app/src/lib/chunking.ts`

Split text by paragraphs/sentences, chunk size ~500 chars, overlap 50 chars. Preserve page metadata.

---

## Task 5: Embedding Service (Transformers.js)

**Files:**
- Create: `revision-app/src/lib/embedding.ts`

Use Ollama `nomic-embed-text` via `@langchain/ollama`. Output 768-dim vectors.

---

## Task 6: Ingestion API

**Files:**
- Create: `revision-app/src/app/api/ingest/route.ts`

POST multipart/form-data with PDF file. Extract → chunk → embed → upsert to MongoDB.

---

## Task 7: Vector Search

**Files:**
- Create: `revision-app/src/lib/search.ts`

MongoDB `$vectorSearch` aggregation. Return top-k chunks with metadata.

---

## Task 8: Chat API (RAG)

**Files:**
- Create: `revision-app/src/app/api/chat/route.ts`

POST `{ messages }`. Embed last user message → search → build context → call Gemini API.

---

## Task 9: Frontend Chat UI

**Files:**
- Create: `revision-app/src/app/page.tsx`
- Create: `revision-app/src/components/ChatBox.tsx`
- Create: `revision-app/src/components/FileUpload.tsx`

Chat interface with message history, file upload for PDFs.

---

## Task 10: README and Setup

**Files:**
- Create: `revision-app/README.md`

---
