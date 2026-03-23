**🌐 Language / 語言：** **English** | [中文](README.md)

# 📚 Bootcamp Revision App

> An AI-powered Bootcamp study material revision platform — supports PDF/Markdown upload, RAG chat, auto quiz generation, knowledge gap analysis, and summary generation.  
> Powered by OpenRouter paid models with free MongoDB Atlas and Vercel hosting.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 📄 **File Upload** | Upload PDF and Markdown files with automatic vectorized indexing |
| 💬 **RAG Chat** | Answer questions based on uploaded document content (streaming responses) |
| 📝 **Quiz Generator** | AI auto-generates multiple-choice questions from documents with instant grading |
| 🎯 **Knowledge Gap** | Analyzes quiz error rates to identify weak topics |
| 📋 **Summary** | AI-generated document outline summaries (streaming) |

---

## 🛠️ Tech Stack

| Layer | Technology | Version / Notes |
|-------|-----------|-----------------|
| **Framework** | Next.js | 16.1.6 (Turbopack) |
| **Language** | TypeScript | 5.7+ |
| **Frontend** | React | 19.x |
| **Styling** | Tailwind CSS | 3.4 |
| **Database** | MongoDB Atlas | M0 Free Cluster (512MB) |
| **ODM** | Mongoose | 8.8 |
| **LLM Chat** | OpenRouter → `google/gemini-2.5-flash-lite` | Paid (low-cost) |
| **Embedding** | OpenRouter → `qwen/qwen3-embedding-8b` | Paid (low-cost) |
| **RAG Chain** | LangChain (`@langchain/openai`, `@langchain/core`) | Prompt + Streaming |
| **Text Splitting** | `@langchain/textsplitters` | RecursiveCharacterTextSplitter |
| **PDF Parsing** | LlamaParse REST API | Multi-language, scanned PDF support |
| **Markdown Rendering** | `markdown-it` + highlight.js + DOMPurify | Syntax highlighting, XSS protection |

---

## 💰 Service Plans

| Service | Plan | Notes |
|---------|------|-------|
| MongoDB Atlas | M0 Free Cluster | 512MB storage, vector search supported |
| OpenRouter | Paid models | `gemini-2.5-flash-lite` (Chat), `qwen3-embedding-8b` (Embedding) |
| LlamaCloud | Free tier | Daily page parsing quota |
| Vercel | Free tier | Deployment hosting |

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

```bash
cp .env.example .env.local
```

Fill in the following variables (see [`.env.example`](.env.example)):

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `OPENROUTER_API_KEY` | [OpenRouter](https://openrouter.ai/keys) API Key |
| `OPENROUTER_MODEL` | Chat LLM model (default: `google/gemini-2.5-flash-lite`) |
| `OPENROUTER_EMBED_MODEL` | Embedding model (default: `qwen/qwen3-embedding-8b`) |
| `LLAMA_CLOUD_API_KEY` | [LlamaCloud](https://cloud.llamaindex.ai/api-key) API Key (PDF parsing) |

### 3. MongoDB Atlas Vector Index

Create a vector search index for the `chunks` collection in Atlas:

1. Atlas → Your Cluster → **Search** → **Create Index**
2. Select **JSON Editor**, paste the content from [`scripts/vector-index.json`](scripts/vector-index.json):

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 2048,
      "similarity": "cosine"
    }
  ]
}
```

> 📖 See detailed steps in [`docs/en/MONGODB_VECTOR_SETUP.md`](docs/en/MONGODB_VECTOR_SETUP.md)

### 4. Start Dev Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 📖 How to Use

1. **Upload Documents** — Upload Bootcamp PDF or Markdown materials from the left panel
2. **Chat Review** — In the Chat tab, ask questions and AI responds based on document content in real time
3. **Quiz** — In the Quiz tab, select a document and AI auto-generates questions with instant grading
4. **Knowledge Gap** — After completing quizzes, review weak area analysis
5. **Summary** — In the Summary tab, generate a document outline with one click

---

## 🏗️ Project Structure

```
revision-app/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── chat/route.ts          # RAG Chat (Streaming)
│   │   │   ├── documents/route.ts     # Document List API
│   │   │   ├── ingest/route.ts        # PDF/MD Upload → Vectorization
│   │   │   ├── quiz/
│   │   │   │   ├── generate/route.ts  # AI Quiz Generation
│   │   │   │   ├── submit/route.ts    # Submit Answers & Grading
│   │   │   │   └── stats/route.ts     # Quiz Statistics
│   │   │   └── summary/
│   │   │       └── generate/route.ts  # AI Summary (Streaming)
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx                   # Main Page (Tab Navigation)
│   ├── components/
│   │   ├── ChatBox.tsx                # Chat Interface (Streaming)
│   │   ├── FileUpload.tsx             # File Upload
│   │   ├── KnowledgeGap.tsx           # Knowledge Gap Analysis
│   │   ├── MarkdownRenderer.tsx       # Markdown Rendering (Syntax Highlighting)
│   │   ├── MarkdownRendererDynamic.tsx # Dynamic Markdown Renderer Loader
│   │   ├── QuizPanel.tsx              # Quiz Generation & Answering
│   │   ├── SummaryPanel.tsx           # Summary Panel
│   │   ├── TabNav.tsx                 # Tab Navigation
│   │   └── UploadToast.tsx            # Upload Notification Toast
│   ├── context/
│   │   └── UploadContext.tsx          # Upload State Global Context
│   ├── hooks/
│   │   ├── useQuiz.ts                 # Quiz Logic Hook
│   │   ├── useStats.ts                # Statistics Data Hook
│   │   └── useToast.ts                # Toast Notification Hook
│   ├── lib/
│   │   ├── __tests__/                 # Unit Tests
│   │   ├── chunking.ts               # LangChain Text Splitting
│   │   ├── db.ts                      # MongoDB Connection (Singleton)
│   │   ├── embedding.ts              # OpenRouter Embedding API
│   │   ├── llm.ts                     # LLM Client Configuration
│   │   ├── md.ts                      # Markdown Parsing
│   │   ├── pdf.ts                     # PDF Text Extraction
│   │   └── search.ts                 # Vector Search + Keyword Fallback
│   └── models/
│       ├── Chunk.ts                   # Text Chunk (with embedding)
│       ├── Document.ts              # Uploaded Document Record
│       └── QuizAttempt.ts           # Quiz Attempt Record
├── scripts/
│   └── vector-index.json             # Atlas Vector Index Definition
└── docs/                             # 📖 Project Documentation
```

---

## 📚 Project Documentation

All documentation is available in both **Chinese** ([`docs/`](docs/)) and **English** ([`docs/en/`](docs/en/)), and also on [📘 Confluence Wiki](https://johnmak101.atlassian.net/wiki/spaces/REV):

### 📋 Project Planning

| Document | Description |
|----------|-------------|
| [📄 PROJECT_OVERVIEW.md](docs/en/PROJECT_OVERVIEW.md) | Project Overview — Core features, tech stack, free tier plan |
| [📄 ARCHITECTURE.md](docs/en/ARCHITECTURE.md) | System Architecture — Directory structure, data models, core flows, design decisions |
| [📄 GLOSSARY.md](docs/en/GLOSSARY.md) | Glossary — Technical term definitions |

### 📐 Requirements & Design

| Document | Description |
|----------|-------------|
| [📄 USE_CASES.md](docs/en/USE_CASES.md) | Use Cases — System use case descriptions (with pre/post conditions) |
| [📄 USER_STORIES.md](docs/en/USER_STORIES.md) | User Stories — Agile user story listing |
| [📄 DEFINITION_OF_DONE.md](docs/en/DEFINITION_OF_DONE.md) | Definition of Done — DoD criteria for each feature |
| [📄 NON_FUNCTIONAL_REQUIREMENTS.md](docs/en/NON_FUNCTIONAL_REQUIREMENTS.md) | Non-Functional Requirements — Performance, security, usability requirements |

### 🎨 UI/UX

| Document | Description |
|----------|-------------|
| [📄 UI_FLOW_DIAGRAM.md](docs/en/UI_FLOW_DIAGRAM.md) | UI Flow Diagram — Tab navigation, user flow diagrams (Mermaid) |

### 🔌 API

| Document | Description |
|----------|-------------|
| [📄 API_REFERENCE.md](docs/en/API_REFERENCE.md) | API Reference — Request/response format for all endpoints |

### 🧪 Testing & Traceability

| Document | Description |
|----------|-------------|
| [📄 TEST_PLAN.md](docs/en/TEST_PLAN.md) | Test Plan — Testing strategy and specific test cases |
| [📄 TRACEABILITY_MATRIX.md](docs/en/TRACEABILITY_MATRIX.md) | Traceability Matrix — Use Case ↔ User Story ↔ Test Case mapping |

### ⚙️ Deployment & Setup

| Document | Description |
|----------|-------------|
| [📄 SETUP_GUIDE.md](docs/en/SETUP_GUIDE.md) | Setup Guide — Detailed development environment setup steps |
| [📄 MONGODB_VECTOR_SETUP.md](docs/en/MONGODB_VECTOR_SETUP.md) | MongoDB Vector Search Setup — Atlas index creation tutorial |

---

## 🌐 Deploy to Vercel

1. Push to GitHub
2. Import the project on [Vercel](https://vercel.com)
3. Set environment variables: `MONGODB_URI`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `OPENROUTER_EMBED_MODEL`, `LLAMA_CLOUD_API_KEY`
4. Deploy

---

Created by **John Mak** 🚀

*Last updated: 2026-03-23*
