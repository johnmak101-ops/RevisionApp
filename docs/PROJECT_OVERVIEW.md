# Bootcamp 複習 App — 項目總覽

> AI 驅動嘅 Bootcamp 教材複習平台，支援 PDF/Markdown 上傳、RAG 聊天、自動出題、知識缺口分析同大綱生成。

## 商業問題陳述 (Business Problem Statement)

### 痛點分析

Bootcamp 學員喺密集課程中面對以下核心挑戰：

| 痛點 | 描述 | 影響 |
|------|------|------|
| 📚 資訊爆炸 | 每日接收大量 PDF 講義、筆記、代碼範例，難以有效消化 | 學員花費過多時間喺「搵資料」而非「理解內容」 |
| 🔍 教材分散 | 課程資源散落喺唔同平台（Google Drive、Slack、LMS），缺乏統一檢索入口 | 學員需要逐個平台翻查，效率極低 |
| ❓ 缺乏自測工具 | 學員唔知自己邊度弱，冇針對性嘅練習機制 | 到考試/面試先發現知識缺口，為時已晚 |

### 解決方案定位

呢個 App 透過 AI 技術將分散嘅教材統一索引，並提供智能複習功能（RAG 聊天、自動出題、知識缺口分析），令學員可以「問住學、做住練、睇住改」。

---

## 成功指標 (Success Metrics / KPIs)

| KPI | 目標值 | 量度方式 | 基準線 |
|-----|--------|----------|--------|
| 學員檢索教材時間 | 減少 30% | 上傳後透過 RAG Chat 搵答案 vs 手動翻查教材嘅時間對比 | 用戶調查 |
| 核心知識點掌握率 | 提升 20% | Quiz 模組正確率追蹤（`/api/quiz/stats`） | 首次 Quiz 平均正確率 |
| 課程常見檔案格式覆蓋率 | ≥ 95% | 支援 PDF（含掃描件）+ Markdown 格式 | 業界常用格式佔比 |
| AI 回答相關性 | ≥ 90% 基於教材 | RAG 向量搜尋 score ≥ 0.4 嘅命中率 | 系統日誌分析 |

---

## 項目定位

呢個 App 係一個**全端 AI 複習工具**，專為 Bootcamp 學員打造。用戶上傳課程 PDF 或 Markdown，系統自動做向量化索引，然後透過 AI 提供多種複習方式，解決教材分散同缺乏自測工具嘅問題。

## 核心功能

| 功能 | 描述 | 入口 |
|------|------|------|
| 📄 文件上傳 | 支援 PDF、Markdown 格式上傳並自動索引 | `FileUpload` 組件 |
| 💬 RAG 聊天 | 根據上傳文件內容回答問題（帶 streaming） | Chat Tab |
| 📝 Quiz 出題 | AI 自動根據文件生成多選題 | Quiz Tab |
| 🎯 知識缺口 | 分析 Quiz 錯誤率，識別弱項 Topic | Quiz Tab 側欄 |
| 📋 Summary | AI 生成文件大綱摘要 | Summary Tab |
| 🛡️ 安全防護 | Vard prompt injection 偵測（Chat、Ingest）、rate limiting、輸入驗證 | AI API 端點（詳見 ARCHITECTURE.md） |

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
│ Atlas (M0)  │ │ Chat: gemini-2.5-flash-lite │
│ Vector      │ │ Embed: qwen3-embed-8b  │
│ Search      │ └────────────────────────┘
└─────────────┘
       │
┌──────▼──────────────────────────────────┐
│ LlamaCloud (LlamaParse REST API)        │
│ PDF → Markdown（多語言 / 掃描 PDF 支援） │
└─────────────────────────────────────────┘
```

## 技術棧

| 層級 | 技術 | 版本/備註 |
|------|------|-----------|
| **Framework** | Next.js | 16.1.6（Turbopack） |
| **Language** | TypeScript | 5.7+ |
| **Frontend** | React | 19.x |
| **Styling** | Tailwind CSS | 4.x |
| **Database** | MongoDB Atlas | M0 免費叢集（512MB） |
| **ODM** | Mongoose | 8.8 |
| **LLM Chat** | OpenRouter → `google/gemini-2.5-flash-lite` | Google Gemini 2.5 Flash Lite |
| **Embedding** | OpenRouter → `qwen/qwen3-embedding-8b` | Qwen3 8B，4096 維 |
| **RAG Chain** | LangChain (`@langchain/openai`, `@langchain/core`) | Prompt + Streaming |
| **Text Splitting** | `@langchain/textsplitters` | RecursiveCharacterTextSplitter |
| **PDF 解析** | LlamaParse REST API | 多語言、掃描 PDF 支援 |
| **Markdown** | `markdown-it` + plugins (emoji, task-lists, anchor, footnote, sub/sup, container) | 渲染 Markdown |
| **安全** | `@andersmyrmel/vard` | Prompt injection 偵測 + 清洗 |

## 免費方案總覽

| 服務 | 方案 | 限制 |
|------|------|------|
| MongoDB Atlas | M0 免費叢集 | 512MB 儲存 |
| OpenRouter | Free tier models | Rate limit 因模型不同 |
| LlamaCloud | Free tier | 每日解析頁數限額 |
| Vercel | Free tier | 部署託管 |

---

*更新日期：2026-03-24*
