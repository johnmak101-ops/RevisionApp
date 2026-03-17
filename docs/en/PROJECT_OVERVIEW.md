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
│ Atlas (M0)  │ │ Chat: nemotron-3-nano  │
│ Vector      │ │ Embed: nemotron-embed  │
│ Search      │ └────────────────────────┘
└─────────────┘
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
| **LLM Chat** | OpenRouter → `nvidia/nemotron-3-nano-30b-a3b:free` | Free |
| **Embedding** | OpenRouter → `nvidia/llama-nemotron-embed-vl-1b-v2:free` | Direct fetch API |
| **RAG Chain** | LangChain (`@langchain/openai`, `@langchain/core`) | Prompt + Streaming |
| **Text Splitting** | `@langchain/textsplitters` | RecursiveCharacterTextSplitter |
| **PDF Extraction** | `pdf-parse` | Text extraction |
| **PDF to Image** | `pdf-to-img` | PDF to image (OCR preprocessing) |
| **Markdown** | `react-markdown` + `remark-gfm` | Markdown rendering |
| **OCR** | `tesseract.js` | Fallback for image-based PDFs |

## Free Tier Summary

| Service | Plan | Limits |
|---------|------|--------|
| MongoDB Atlas | M0 Free Cluster | 512MB storage |
| OpenRouter | Free tier models | Rate limits vary by model |
| Vercel | Free tier | Deployment hosting |

---

*Last updated: 2026-03-17*
