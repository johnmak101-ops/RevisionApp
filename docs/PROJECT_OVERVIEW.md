# Bootcamp 複習 App — 項目總覽

> AI 驅動嘅 Bootcamp 教材複習平台，支援 PDF/Markdown 上傳、RAG 聊天、自動出題、知識缺口分析同大綱生成。

## 項目定位

呢個 App 係一個**全端 AI 複習工具**，目標用戶係 Bootcamp 學員。用戶上傳課程 PDF 或 Markdown，系統自動做向量化索引，然後透過 AI 提供多種複習方式。

## 核心功能

| 功能 | 描述 | 入口 |
|------|------|------|
| 📄 文件上傳 | 支援 PDF、Markdown 格式上傳並自動索引 | `FileUpload` 組件 |
| 💬 RAG 聊天 | 根據上傳文件內容回答問題（帶 streaming） | Chat Tab |
| 📝 Quiz 出題 | AI 自動根據文件生成多選題 | Quiz Tab |
| 🎯 知識缺口 | 分析 Quiz 錯誤率，識別弱項 Topic | Quiz Tab 側欄 |
| 📋 Summary | AI 生成文件大綱摘要 | Summary Tab |

## 技術架構

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

## 技術棧

| 層級 | 技術 | 版本/備註 |
|------|------|-----------|
| **Framework** | Next.js | 16.1.6（Turbopack） |
| **Language** | TypeScript | 5.7+ |
| **Frontend** | React | 19.x |
| **Styling** | Tailwind CSS | 3.4 |
| **Database** | MongoDB Atlas | M0 免費叢集（512MB） |
| **ODM** | Mongoose | 8.8 |
| **LLM Chat** | OpenRouter → `nvidia/nemotron-3-nano-30b-a3b:free` | 免費 |
| **Embedding** | OpenRouter → `nvidia/llama-nemotron-embed-vl-1b-v2:free` | 直接 fetch API |
| **RAG Chain** | LangChain (`@langchain/openai`, `@langchain/core`) | Prompt + Streaming |
| **Text Splitting** | `@langchain/textsplitters` | RecursiveCharacterTextSplitter |
| **PDF 擷取** | `pdf-parse` | 文字擷取 |
| **Markdown** | `react-markdown` + `remark-gfm` | 渲染 Markdown |
| **OCR** | `tesseract.js` | 圖片 PDF 備用 |

## 免費方案總覽

| 服務 | 方案 | 限制 |
|------|------|------|
| MongoDB Atlas | M0 免費叢集 | 512MB 儲存 |
| OpenRouter | Free tier models | Rate limit 因模型不同 |
| Vercel | Free tier | 部署託管 |

---

*更新日期：2026-03-17*
