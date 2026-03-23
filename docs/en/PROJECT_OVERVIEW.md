# Bootcamp Revision App — Project Overview

> An AI-powered bootcamp study revision platform supporting PDF/Markdown upload, RAG chat, auto quiz generation, knowledge gap analysis, and summary outline generation.

## Project Positioning

This app is a **full-stack AI revision tool** targeting bootcamp students. Users upload course PDFs or Markdown notes, the system automatically vectorizes and indexes them, then provides multiple AI-powered revision methods.

## Core Features

| Feature | Description | Entry Point |
|---------|-------------|-------------|
| 📄 File Upload | Upload PDF or Markdown files with automatic indexing | `FileUpload` component |
| 💬 RAG Chat | Answer questions based on uploaded document content (streaming) | Chat Tab |
| 📝 Quiz Generator | AI auto-generates MCQ questions from documents | Quiz Tab |
| 🎯 Knowledge Gap | Analyze quiz error rates to identify weak topics | Quiz Tab sidebar |
| 📋 Summary | AI generates document outline summaries | Summary Tab |

## Architecture

```
┌──────────────────────────────────────────┐
│              Frontend (React 19)         │
│  page.tsx → TabNav → ChatBox / Quiz / …  │
└──────────────┬───────────────────────────┘
               │ HTTP / Streaming
┌──────────────▼───────────────────────────┐
│         Next.js 16 API Routes            │
│  /api/chat  /api/ingest  /api/quiz/…     │
└──────┬──────────────┬────────────────────┘
       │              │
┌──────▼──────┐ ┌─────▼──────────────────┐
│ MongoDB     │ │ OpenRouter API         │
│ Atlas (M0)  │ │ Chat: gemini-2.5-flash  │
│ Vector      │ │ Embed: qwen3-embed-8b  │
│ Search      │ └────────────────────────┘
└─────────────┘
       │
┌──────▼──────────────────────────────────┐
│ LlamaCloud (LlamaParse REST API)        │
│ PDF → Markdown (multilingual / scanned  │
│ PDF support)                            │
└─────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology | Version / Notes |
|-------|-----------|----------------|
| **Framework** | Next.js | 16.1.6 (Turbopack) |
| **Language** | TypeScript | 5.7+ |
| **Frontend** | React | 19.x |
| **Styling** | Tailwind CSS | 3.4 |
| **Database** | MongoDB Atlas | M0 Free Cluster (512MB) |
| **ODM** | Mongoose | 8.8 |
| **LLM Chat** | OpenRouter → `google/gemini-2.5-flash-lite` | Google Gemini 2.5 Flash Lite |
| **Embedding** | OpenRouter → `qwen/qwen3-embedding-8b` | Qwen3 8B, 4096 dims |
| **RAG Chain** | LangChain (`@langchain/openai`, `@langchain/core`) | Prompt + Streaming |
| **Text Splitting** | `@langchain/textsplitters` | RecursiveCharacterTextSplitter |
| **PDF Parsing** | LlamaParse REST API | Multilingual, scanned PDF support |
| **Markdown** | `react-markdown` + `remark-gfm` | Markdown rendering |

## Free Tier Summary

| Service | Plan | Limits |
|---------|------|--------|
| MongoDB Atlas | M0 Free Cluster | 512MB storage |
| OpenRouter | Free tier models | Rate limits vary by model |
| LlamaCloud | Free tier | Daily page parsing quota |
| Vercel | Free tier | Deployment hosting |

---

*Last updated: 2026-03-17*
