# 術語表 (Glossary)

| 術語 | 英文 | 定義 |
|------|------|------|
| **RAG** | Retrieval-Augmented Generation | 檢索增強生成。先從知識庫檢索相關內容，再注入 LLM prompt 生成回答嘅技術 |
| **Embedding** | Embedding / Vector Embedding | 將文字轉為數值向量（維度於啟動時動態偵測），令電腦可以計算文字間嘅語義相似度 |
| **Chunk** | Text Chunk | 文件分割後嘅文字片段。每個 chunk 獨立做 embedding 同儲存 |
| **向量搜尋** | Vector Search | 用 cosine similarity 搵出同 query 語義最接近嘅 chunks |
| **Cosine Similarity** | Cosine Similarity | 衡量兩個向量方向相似度嘅指標，1 = 完全一致，0 = 無關 |
| **Streaming** | Streaming Response | 逐 token 回傳 LLM 回應，唔等完整回答先顯示，改善用戶體驗 |
| **NDJSON** | Newline-Delimited JSON | 每行一個 JSON object 嘅格式，用於 Summary streaming 傳輸（Chat 改用 Vercel AI SDK） |
| **LLM** | Large Language Model | 大型語言模型（如 Google Gemini） |
| **OpenRouter** | OpenRouter | 統一嘅 AI API 閘道，可以用同一 API key 存取多個 LLM 模型 |
| **Gemini** | Google Gemini | Google 開發嘅 LLM 模型系列，本專案用 `gemini-2.5-flash-lite`；經 OpenRouter 呼叫時，部分網路環境需 VPN |
| **MCQ** | Multiple Choice Question | 多選題 |
| **Knowledge Gap** | Knowledge Gap Analysis | 知識缺口分析。根據 Quiz 錯題統計，識別學員嘅弱項 topic |
| **Atlas** | MongoDB Atlas | MongoDB 嘅雲端 Database-as-a-Service，提供向量搜尋功能 |
| **M0** | M0 Free Tier | MongoDB Atlas 嘅免費方案，512MB 儲存 |
| **Warmup** | Embedding Warmup | 系統啟動時發送測試請求，預熱 embedding model 同偵測向量維度 |
| **Keyword Fallback** | Keyword Fallback Search | 向量搜尋無結果時嘅備援方案，用 regex 關鍵字搜尋 |
| **Score Filter** | Vector Score Filter | 兩段門檻：`search.ts` 先丟棄 Atlas **raw** cosine < **0.60**；正規化後 `chat/route.ts` 再丟棄 **normalized** < **0.40** 先可作 RAG context |
| **Context Window** | Context Window | LLM 單次可處理嘅 token 上限。本專案限制 context chars 以控制 |
| **LlamaParse** | LlamaParse | LlamaIndex 提供嘅雲端 PDF 解析服務，支援多語言及掃描 PDF。透過 `parsing_instruction` 提供表格格式指引，提升表格準確度 |
| **Ingest** | Document Ingestion | 文件攝入流程：上傳 → 擷取 → 分割 → embedding → 存儲 |
| **刪除索引** | Delete Indexed Document | `DELETE /api/documents/[id]` 刪除 `Document`、其 `Chunk`（`pdfId`）及關聯 `QuizAttempt`（`documentId`） |
| **Prompt Injection** | Prompt Injection Attack | 用戶透過特別構造嘅輸入，嘗試繞過或覆寫 LLM 嘅系統指令嘅攻擊方式 |
| **Vard** | Vard Prompt Guard | 開源 prompt injection 偵測庫（`@andersmyrmel/vard`），支援 pattern matching、分類阻擋同文字清洗 |
| **Rate Limiting** | Rate Limiting | 限制每個 IP 在指定時間內嘅請求次數，防止濫用 API 資源 |
| **ChatPromptTemplate** | LangChain Chat Prompt Template | LangChain 嘅 prompt 模板系統，將 system 和 user 角色明確分離，防止用戶注入系統角色 |
| **Multi-Query Search** | Multi-Query Search | 用 LLM 將用戶問題拆成 3 個搜尋角度並行搜尋，合併去重後提高召回率 |
| **Chunk Guard** | Chunk Content Guard | 文件攝入時掃描 chunk 內容嘅安全檢查，偵測間接 prompt injection（用 Vard pattern matching） |
| **Qwen3 Embedding** | Qwen3 Embedding 4B | 預設 embedding 模型 (`qwen/qwen3-embedding-4b`)，透過 OpenRouter 呼叫，2560 維 |


---

*更新日期：2026-03-26*
