# 術語表 (Glossary)

| 術語 | 英文 | 定義 |
|------|------|------|
| **RAG** | Retrieval-Augmented Generation | 檢索增強生成。先從知識庫檢索相關內容，再注入 LLM prompt 生成回答嘅技術 |
| **Embedding** | Embedding / Vector Embedding | 將文字轉為數值向量（維度於啟動時動態偵測），令電腦可以計算文字間嘅語義相似度 |
| **Chunk** | Text Chunk | 文件分割後嘅文字片段。每個 chunk 獨立做 embedding 同儲存 |
| **向量搜尋** | Vector Search | 用 cosine similarity 搵出同 query 語義最接近嘅 chunks |
| **Cosine Similarity** | Cosine Similarity | 衡量兩個向量方向相似度嘅指標，1 = 完全一致，0 = 無關 |
| **Streaming** | Streaming Response | 逐 token 回傳 LLM 回應，唔等完整回答先顯示，改善用戶體驗 |
| **NDJSON** | Newline-Delimited JSON | 每行一個 JSON object 嘅格式，用於 streaming 傳輸 |
| **LLM** | Large Language Model | 大型語言模型（如 NVIDIA Nemotron） |
| **OpenRouter** | OpenRouter | 統一嘅 AI API 閘道，可以用同一 API key 存取多個 LLM 模型 |
| **Nemotron** | NVIDIA Nemotron | NVIDIA 開發嘅 LLM 模型系列，本專案用 `nemotron-3-nano-30b` |
| **MCQ** | Multiple Choice Question | 多選題 |
| **Knowledge Gap** | Knowledge Gap Analysis | 知識缺口分析。根據 Quiz 錯題統計，識別學員嘅弱項 topic |
| **Atlas** | MongoDB Atlas | MongoDB 嘅雲端 Database-as-a-Service，提供向量搜尋功能 |
| **M0** | M0 Free Tier | MongoDB Atlas 嘅免費方案，512MB 儲存 |
| **Warmup** | Embedding Warmup | 系統啟動時發送測試請求，預熱 embedding model 同偵測向量維度 |
| **Keyword Fallback** | Keyword Fallback Search | 向量搜尋無結果時嘅備援方案，用 regex 關鍵字搜尋 |
| **Score Filter** | Vector Score Filter | 過濾 cosine score 低於門檻 (0.4) 嘅向量搜尋結果，避免低質回答 |
| **Context Window** | Context Window | LLM 單次可處理嘅 token 上限。本專案限制 context chars 以控制 |
| **LlamaParse** | LlamaParse | LlamaIndex 提供嘅雲端 PDF 解析服務，支援多語言及掃描 PDF |
| **Ingest** | Document Ingestion | 文件攝入流程：上傳 → 擷取 → 分割 → embedding → 存儲 |

---

*更新日期：2026-03-20*
