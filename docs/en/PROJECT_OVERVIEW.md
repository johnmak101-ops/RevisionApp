# Bootcamp Revision App — Project Overview

> An AI-powered bootcamp study revision platform supporting PDF/Markdown upload, RAG chat, auto quiz generation, knowledge gap analysis, and summary outline generation.

## Business Problem Statement

### Pain Points

Bootcamp students face critical challenges in intensive learning environments:

| Pain Point | Description | Impact |
|------------|-------------|--------|
| 📚 **Information Overload** | Receiving large volumes of PDF slides, notes, and code examples daily, making it hard to absorb effectively | Students spend more time *searching for content* than *understanding it* |
| 🔍 **Scattered Materials** | Course resources fragmented across Google Drive, Slack, LMS — no unified search entry point | Students waste time switching between platforms |
| ❓ **No Self-Assessment Tool** | Students don't know their weak areas until it's too late (exam / interview) | Knowledge gaps discovered too late to address |

### Solution Positioning

This app unifies scattered materials through AI-powered indexing and provides intelligent revision tools (RAG chat, auto quiz, knowledge gap analysis) — enabling students to **ask while learning, practice while doing, and improve while tracking**.

---

## Success Metrics (KPIs)

| KPI | Target | Measurement Method | Baseline |
|-----|--------|--------------------|----------|
| Student material retrieval time | Reduce by **30%** | RAG Chat vs manual lookup (user survey) | Pre-adoption survey |
| Core knowledge mastery rate | Improve by **20%** | Quiz correct rate tracking (`/api/quiz/stats`) | First attempt average score |
| Course file format coverage | **≥ 95%** | PDF (incl. scanned) + Markdown supported | Industry format benchmarks |
| AI answer relevance | **≥ 90%** document-based | RAG vector search score ≥ 0.4 hit rate | System log analysis |

---

## Project Positioning

This app is a **full-stack AI revision tool** built specifically for bootcamp students. Users upload course PDFs or Markdown notes, the system automatically vectorizes and indexes them, then provides multiple AI-powered revision methods to address scattered materials and the lack of self-assessment tools.

## Core Features

| Feature | Description | Entry Point |
|---------|-------------|-------------|
| 📄 File Upload | Upload PDF or Markdown files with automatic indexing | `FileUpload` component |
| 💬 RAG Chat | Answer questions based on uploaded document content (streaming) | Chat Tab |
| 📝 Quiz Generator | AI auto-generates MCQ questions from documents | Quiz Tab |
| 🎯 Knowledge Gap | Analyze quiz error rates to identify weak topics | Quiz Tab sidebar |
| 📋 Summary | AI generates document outline summaries | Summary Tab |
| 🛡️ Security | Vard prompt injection detection (Chat, Ingest), rate limiting, input validation | AI API endpoints (see ARCHITECTURE.md) |

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
│ Atlas (M0)  │ │ Chat: gemini-2.5-flash-lite │
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
| **Styling** | Tailwind CSS | 4.x |
| **Database** | MongoDB Atlas | M0 Free Cluster (512MB) |
| **ODM** | Mongoose | 8.8 |
| **LLM Chat** | OpenRouter → `google/gemini-2.5-flash-lite` | Google Gemini 2.5 Flash Lite |
| **Embedding** | OpenRouter → `qwen/qwen3-embedding-8b` | Qwen3 8B, 4096 dims |
| **RAG Chain** | LangChain (`@langchain/openai`, `@langchain/core`) | Prompt + Streaming |
| **Text Splitting** | `@langchain/textsplitters` | RecursiveCharacterTextSplitter |
| **PDF Parsing** | LlamaParse REST API | Multilingual, scanned PDF support |
| **Markdown** | `markdown-it` + plugins (emoji, task-lists, anchor, footnote, sub/sup, container) | Markdown rendering |
| **Security** | `@andersmyrmel/vard` | Prompt injection detection + sanitization |

## Free Tier Summary

| Service | Plan | Limits |
|---------|------|--------|
| MongoDB Atlas | M0 Free Cluster | 512MB storage |
| OpenRouter | Free tier models | Rate limits vary by model |
| LlamaCloud | Free tier | Daily page parsing quota |
| Vercel | Free tier | Deployment hosting |

---

*Last updated: 2026-03-24*
