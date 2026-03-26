**🌐 Language / 語言：** [English](README.en.md) | **中文**

# Revision App

**個人作品集** — 產品範圍、需求發現、用例／用戶故事、追蹤矩陣、測試與 UAT 門檻等 **BA／產品向文檔**，以及 **全端實作**，皆由本人整理與開發；細節見下文文檔導覽。

> Bootcamp 教材複習平台：提升 **單人溫書效率**——PDF／Markdown 上傳、RAG 聊天、自動 Quiz、知識缺口、AI 摘要。Next.js 16、MongoDB Atlas、OpenRouter、Vercel。

**Demo**：無公開託管連結，請跟下文 **「快速開始」** 自行部署；介面預覽見下文 **「截圖」** 一節。

**商業背景、痛點、KPI、MVP／Out of scope／UAT 門檻** → [`docs/PRODUCT_SCOPE.md`](docs/PRODUCT_SCOPE.md)  
**需求發現、優先級、~50% 時間假設（一頁）** → [`docs/DISCOVERY_AND_PRIORITIZATION.md`](docs/DISCOVERY_AND_PRIORITIZATION.md)  
**用例流程、Actor、防護細節** → [`docs/USE_CASES.md`](docs/USE_CASES.md) · [`docs/SEQUENCE_DIAGRAMS.md`](docs/SEQUENCE_DIAGRAMS.md)  
**安全架構（Vard、Chunk guard、rate limit）** → [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

---

## 核心功能

| 功能 | 說明 |
|------|------|
| 文件上傳／已索引列表 | PDF、Markdown；可刪單筆釋放索引或處理同名 409 |
| RAG 聊天 | 依已索引內容串流回答 |
| Quiz／知識缺口 | AI 選擇題、依 topic 弱項分析 |
| Summary | 文件大綱摘要 |
| 安全 | Prompt 防護、API 限流、輸入驗證 |

---

## 文檔導覽

| 讀者 | 連結 |
|------|------|
| **產品／BA** | [PRODUCT_SCOPE](docs/PRODUCT_SCOPE.md) · [DISCOVERY / 優先級](docs/DISCOVERY_AND_PRIORITIZATION.md) · [USE_CASES](docs/USE_CASES.md) · [USER_STORIES](docs/USER_STORIES.md) · [TRACEABILITY_MATRIX](docs/TRACEABILITY_MATRIX.md) · [TEST_PLAN](docs/TEST_PLAN.md) · [NFR](docs/NON_FUNCTIONAL_REQUIREMENTS.md) |
| **工程** | [DEVELOPER_GUIDE](docs/DEVELOPER_GUIDE.md) · [SETUP_GUIDE](docs/SETUP_GUIDE.md) · [ARCHITECTURE](docs/ARCHITECTURE.md) · [API_REFERENCE](docs/API_REFERENCE.md) · [SEQUENCE_DIAGRAMS](docs/SEQUENCE_DIAGRAMS.md) · [UI_FLOW_DIAGRAM](docs/UI_FLOW_DIAGRAM.md) · [MONGODB_VECTOR_SETUP](docs/MONGODB_VECTOR_SETUP.md) · [GLOSSARY](docs/GLOSSARY.md) |
| **品質** | [DEFINITION_OF_DONE](docs/DEFINITION_OF_DONE.md) |
| **英文** | [README.en.md](README.en.md) · `docs/en/` 下同名檔 |

---

## 截圖

以下為本地／自部署環境嘅介面截圖（Chat、Quiz、Summary）。

| Chat | Quiz | Summary |
|:----:|:----:|:-------:|
| ![Chat](docs/screenshots/screenshot-chat.png) | ![Quiz](docs/screenshots/screenshot-quiz.png) | ![Summary](docs/screenshots/screenshot-summary.png) |

---

## 技術棧（摘要）

Next.js **16**（Turbopack）· **Node.js 24**（`package.json` `engines.node`：`>=24.0.0`；開發型別 `@types/node` ^24）· MongoDB Atlas 向量搜尋 · OpenRouter（`gemini-2.5-flash-lite` 對話 + `qwen/qwen3-embedding-4b` 向量；**Gemini 在部分網路需 VPN**）· LlamaParse · `@andersmyrmel/vard`

---

## 快速開始

**前置**：Node.js **24.x LTS**（與 `package.json` `engines` 一致；可選根目錄 **`.nvmrc`** 配合 `nvm` / `fnm`）。

```bash
npm install
cp .env.example .env.local
```

填入 `MONGODB_URI`、`OPENROUTER_API_KEY`、`LLAMA_CLOUD_API_KEY` 等（見 [SETUP_GUIDE](docs/SETUP_GUIDE.md)）。預設對話用 Gemini 經 OpenRouter，**部分網路需開 VPN** 才能正常呼叫。

Atlas 建立向量索引：使用 [`scripts/vector-index.json`](scripts/vector-index.json)，步驟見 [MONGODB_VECTOR_SETUP](docs/MONGODB_VECTOR_SETUP.md)。

```bash
npm run dev
```

---

Created by **John Mak**  
*最後更新：2026-03-26*
