# 開發者導覽（技術）

> **目的**：新人同維護者 **10 分鐘內** 知去邊份文件搵咩、用咩環境、點從 log 排錯。

---

## 1. 按需求搵文件（單一導航）

| 你想… | 開邊份 |
|--------|--------|
| REST 路徑、狀態碼、Request/Response 範例 | `API_REFERENCE.md` |
| 目錄結構、模組職責、安全層、設計決策 | `ARCHITECTURE.md` |
| 元件同 API 嘅時序 | `SEQUENCE_DIAGRAMS.md` |
| 畫面與錯誤節點（Mermaid） | `UI_FLOW_DIAGRAM.md` |
| Actor／前置條件／主與替代流程（偏需求語言） | `USE_CASES.md` |
| 驗收句式（As a / I want） | `USER_STORIES.md` |
| 案例編號對應測試 | `TEST_PLAN.md`、`TRACEABILITY_MATRIX.md` |
| Atlas 向量索引 JSON | `MONGODB_VECTOR_SETUP.md`、`scripts/vector-index.json` |
| 本機環境變數與啟動 | `SETUP_GUIDE.md` |
| 產品邊界、假設、UAT 最低門檻（偏 BA） | `PRODUCT_SCOPE.md` |
| 名詞 | `GLOSSARY.md` |

**全文檔索引（GitHub）**：專案根目錄 [`README.md`](../README.md)。

---

## 2. 執行環境矩陣

| 項目 | 建議／實際 |
|------|------------|
| **Node.js** | **20.x LTS**（Next.js 16 建議；見 `package.json` 的 `engines`） |
| **npm** | ≥ 9.x |
| **套件** | `npm install` |
| **Lint** | `npm run lint` = **`tsc --noEmit` + `eslint .`**（Next 16 CLI **無** `next lint`） |
| **測試** | `npm run test`（Vitest）；API route 測試喺 `src/app/api/__tests__/` |
| **建置** | `npm run build` |

---

## 3. 環境變數一覽

| 變數 | 用途 |
|------|------|
| `MONGODB_URI` | Atlas 連線字串 |
| `OPENROUTER_API_KEY` | Chat / Quiz / Summary / tool LLM |
| `OPENROUTER_MODEL` | Chat 等用嘅文字模型 |
| `OPENROUTER_EMBED_MODEL` | Embedding（維度須與向量索引一致） |
| `LLAMA_CLOUD_API_KEY` | LlamaParse（PDF） |

詳見 `.env.example` 同 `SETUP_GUIDE.md`。

---

## 4. 觀測與排錯（Server log 前綴）

後端多用 `console.info` / `warn` / `error`；常見 **前綴** 方便 grep：

| 前綴 | 大約意義 |
|------|----------|
| `[Embeddings]` | OpenRouter embedding warmup／呼叫 |
| `[LlamaParse]` | PDF 上雲解析進度 |
| `[Search]`、`[MultiQuery]` | 向量搜尋與子查詢 |
| `[Chat]` | Chat 檢索層錯誤 |
| `[PromptGuard]` | 用戶訊息注入偵測 |
| `[ChunkGuard]` | Ingest 時 chunk 內容被標記 |
| `[Quiz]`、`[Summary]`、`[Documents]` | 對應 route 錯誤 |
| `Parse error:`、`Ingest error:` | ingest 解析或總錯誤 |

**用戶端**：API 錯誤多數以 JSON `{ "error": "..." }` 或既有 streaming 文案回傳；完整狀態碼表見 `API_REFERENCE.md`「通用錯誤格式」。

---

## 5. 主要原始碼入口

| 路徑 | 說明 |
|------|------|
| `src/app/api/**/route.ts` | HTTP handlers |
| `src/lib/search.ts` | 向量搜尋、multi-query、score 門檻 |
| `src/lib/embedding.ts` | OpenRouter embeddings |
| `src/lib/promptGuard.ts` | Vard、chunk guard |
| `src/models/*.ts` | Mongoose schemas |

---

*更新日期：2026-03-25*
