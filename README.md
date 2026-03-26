<div align="center">

# Revision App

**Bootcamp 教材複習平台** — PDF／Markdown、RAG 聊天、Quiz、知識缺口、AI 摘要

[English](README.en.md) · **中文**

</div>

---

## 關於

**個人作品集** — 產品範圍、需求發現、用例／用戶故事、追蹤矩陣、測試與 UAT 門檻等 **BA／產品向文檔**，以及 **全端實作**，皆由本人整理與開發。

| 項目 | 說明 |
|------|------|
| **Demo** | 無公開託管連結；請依下方 **快速開始** 自行部署，介面預覽見 **截圖**。 |
| **技術** | Next.js 16、MongoDB Atlas、OpenRouter、Vercel |

### 深度文檔（精選）

| 主題 | 連結 |
|------|------|
| 商業背景、痛點、KPI、MVP／Out of scope／UAT | [`docs/PRODUCT_SCOPE.md`](docs/PRODUCT_SCOPE.md) |
| 需求發現、優先級、~50% 時間假設 | [`docs/DISCOVERY_AND_PRIORITIZATION.md`](docs/DISCOVERY_AND_PRIORITIZATION.md) |
| 用例、Actor、防護 | [`docs/USE_CASES.md`](docs/USE_CASES.md) · [`docs/SEQUENCE_DIAGRAMS.md`](docs/SEQUENCE_DIAGRAMS.md) |
| 安全架構（Vard、Chunk guard、rate limit） | [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) |

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

### 產品／BA

[`PRODUCT_SCOPE`](docs/PRODUCT_SCOPE.md) · [`DISCOVERY / 優先級`](docs/DISCOVERY_AND_PRIORITIZATION.md) · [`USE_CASES`](docs/USE_CASES.md) · [`USER_STORIES`](docs/USER_STORIES.md) · [`TRACEABILITY_MATRIX`](docs/TRACEABILITY_MATRIX.md) · [`TEST_PLAN`](docs/TEST_PLAN.md) · [`NFR`](docs/NON_FUNCTIONAL_REQUIREMENTS.md)

### 工程

[`DEVELOPER_GUIDE`](docs/DEVELOPER_GUIDE.md) · [`SETUP_GUIDE`](docs/SETUP_GUIDE.md) · [`ARCHITECTURE`](docs/ARCHITECTURE.md) · [`API_REFERENCE`](docs/API_REFERENCE.md) · [`SEQUENCE_DIAGRAMS`](docs/SEQUENCE_DIAGRAMS.md) · [`UI_FLOW_DIAGRAM`](docs/UI_FLOW_DIAGRAM.md) · [`MONGODB_VECTOR_SETUP`](docs/MONGODB_VECTOR_SETUP.md) · [`GLOSSARY`](docs/GLOSSARY.md)

### 品質與其他語言

[`DEFINITION_OF_DONE`](docs/DEFINITION_OF_DONE.md) · 英文：[README.en.md](README.en.md) · `docs/en/` 同名檔

---

## 截圖

本地／自部署環境（Chat、Quiz、Summary）。

<table align="center">
  <tr>
    <th align="center">Chat</th>
    <th align="center">Quiz</th>
    <th align="center">Summary</th>
  </tr>
  <tr>
    <td align="center"><img src="docs/screenshots/screenshot-chat.png" alt="Chat" width="260"/></td>
    <td align="center"><img src="docs/screenshots/screenshot-quiz.png" alt="Quiz" width="260"/></td>
    <td align="center"><img src="docs/screenshots/screenshot-summary.png" alt="Summary" width="260"/></td>
  </tr>
</table>

---

## 技術棧

| 類別 | 選型 |
|------|------|
| 框架 | Next.js **16**（Turbopack） |
| Runtime | **Node.js 24**（`engines.node`：`>=24.0.0`；`@types/node` ^24） |
| 資料庫 | MongoDB Atlas **向量搜尋** |
| LLM／Embedding | OpenRouter：`gemini-2.5-flash-lite` 對話、`qwen/qwen3-embedding-4b` 向量 |
| 網路 | 預設對話經 Gemini：**部分網路需 VPN** 方能穩定呼叫 |
| PDF | LlamaParse |
| 安全 | `@andersmyrmel/vard` |

---

## 快速開始

1. **環境**：Node.js **24.x LTS**（與 `package.json` `engines` 一致；可選根目錄 **`.nvmrc`** 配合 `nvm`／`fnm`）。

   ```bash
   npm install
   cp .env.example .env.local
   ```

2. **環境變數**：填入 `MONGODB_URI`、`OPENROUTER_API_KEY`、`LLAMA_CLOUD_API_KEY` 等，詳見 [`SETUP_GUIDE`](docs/SETUP_GUIDE.md)。

   > **提示**：預設對話走 Gemini（經 OpenRouter）；若連線失敗，可嘗試開啟 **VPN**。

3. **向量索引**：依 [`scripts/vector-index.json`](scripts/vector-index.json) 在 Atlas 建立索引，步驟見 [`MONGODB_VECTOR_SETUP`](docs/MONGODB_VECTOR_SETUP.md)。

   ```bash
   npm run dev
   ```

---

<div align="center">

**John Mak** · *最後更新：2026-03-26*

</div>
