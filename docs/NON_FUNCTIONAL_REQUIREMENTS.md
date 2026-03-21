# 非功能性需求 (Non-Functional Requirements)

---

## NFR-01：效能

| ID | 需求 | 目標值 | 現狀 |
|----|------|--------|------|
| NFR-01.1 | 文件上傳處理時間 | ≤ 30s（普通 PDF） | 依文件大小及 OpenRouter 速度 |
| NFR-01.2 | Chat 首 token 延遲 | ≤ 3s | 含向量搜尋 + LLM 回應 |
| NFR-01.3 | Quiz 生成時間 | ≤ 10s（5 題） | 依 LLM 回應速度 |
| NFR-01.4 | 頁面首次加載 | ≤ 2s | Next.js Turbopack |
| NFR-01.5 | Embedding 批次 | 20/batch | 配合 OpenRouter rate limit |

---

## NFR-02：可用性

| ID | 需求 | 描述 |
|----|------|------|
| NFR-02.1 | 降級策略 | 向量搜尋失敗時有 keyword fallback |
| NFR-02.2 | 連線復用 | MongoDB 使用 singleton 連線池 |
| NFR-02.3 | Warmup | 啟動時 embedding 預熱，偵測維度 |
| NFR-02.4 | Retry | LLM 請求最多重試 2 次 (`maxRetries: 2`) |

---

## NFR-03：安全性

| ID | 需求 | 描述 |
|----|------|------|
| NFR-03.1 | API Key 保護 | 所有 secret 只存在 `.env.local`，唔 commit |
| NFR-03.2 | 輸入驗證 | 文件格式、大小、參數範圍都有驗證 |
| NFR-03.3 | Quiz 防作弊 | 生成時隱藏 `correctIndex` 和 `explanation` |
| NFR-03.4 | 重複提交 | Quiz 只能提交一次（409 防護） |
| NFR-03.5 | MongoDB URI | 防止引號注入（自動 strip 引號） |

---

## NFR-04：資料限制

| ID | 需求 | 限制值 |
|----|------|--------|
| NFR-04.1 | 文件大小上限 | 100MB |
| NFR-04.2 | Chunk 大小 | 512 chars (overlap 100) |
| NFR-04.3 | Quiz 題數範圍 | 1-15 |
| NFR-04.4 | Chat 歷史長度 | 最近 10 條 |
| NFR-04.5 | Vector 候選數 | 50 candidates → 4/sub-query × 3 → top 8 (multiQuery) |
| NFR-04.6 | Score 門檻 | ≥ 0.4 |
| NFR-04.7 | Quiz context | 12,000 chars |
| NFR-04.8 | Summary context | 20,000 chars |
| NFR-04.9 | Min chunk length | 20 chars（過短嘅 chunk 會被丟棄） |
| NFR-04.10 | MongoDB 儲存 | 512MB (M0 免費) |

---

## NFR-05：可維護性

| ID | 需求 | 描述 |
|----|------|------|
| NFR-05.1 | TypeScript 嚴格模式 | 全專案 strict type checking |
| NFR-05.2 | 常數集中管理 | Chunk size、Batch size 等常數集中定義 |
| NFR-05.3 | 模組化 | lib/ 模組職責清晰（embedding、search、chunking 分離） |
| NFR-05.4 | Singleton pattern | DB 連線用 singleton；`lib/llm.ts` 共享 chat/tool LLM；quiz、summary 各有獨立 module-scoped LLM（不同 temperature/config） |

---

## NFR-06：可擴展性

| ID | 需求 | 描述 |
|----|------|------|
| NFR-06.1 | 模型可替換 | 透過 `OPENROUTER_MODEL` env 切換 LLM |
| NFR-06.2 | Embedding 可替換 | 透過 `OPENROUTER_EMBED_MODEL` env 切換 |
| NFR-06.3 | 向量維度自適應 | Warmup 自動偵測，唔 hardcode |
| NFR-06.4 | 文件格式可擴展 | 已支援 PDF + Markdown，架構可加更多格式 |

---

*更新日期：2026-03-17*
