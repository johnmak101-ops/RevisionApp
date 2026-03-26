# 用例文件 (Use Cases)

## 用例一覽 (Use Case Overview)

本項目核心圍繞 **「溫書 (Revision)」** 流程展開，涵蓋從教材上傳到知識鞏固的全過程：

1.  **UC-01 上傳文件**：支援 PDF/Markdown 解析並建立向量索引。
2.  **UC-02 RAG 聊天**：基於教材內容進行智能問答，支援多查詢及防護。
3.  **UC-03 生成 Quiz**：AI 自動提取知識點生成多選題。
4.  **UC-04 提交 Quiz**：自動計分並追蹤學習進度。
5.  **UC-05 知識缺口**：分析弱項並提供改善建議。
6.  **UC-06 生成摘要**：一鍵提取章節重點與大綱。
7.  **UC-07 查看文件**：隨時查看已上傳教材清單。
8.  **UC-09 刪除文件**：刪除已索引文件（含 chunks 與關聯 Quiz），以便重新上傳同名檔。
9.  **UC-08 重置記錄**：一鍵清除答題記錄，重新開始。

---

## 角色定義 (Actors)

| 角色 | 描述 |
|------|------|
| **學員 (Student)** | Bootcamp 學員，需要複習課程內容 |
| **系統 (System)** | Revision App 後端服務 |
| **OpenRouter AI** | 外部 LLM & Embedding 服務 |
| **MongoDB Atlas** | 雲端資料庫 + 向量搜尋引擎 |
| **LlamaCloud** | LlamaParse REST API，負責 PDF 解析（支援多語言及掃描 PDF，配合 `parsing_instruction` 提升表格準確度） |

---

## UC-01：上傳課程文件

| 項目 | 內容 |
|------|------|
| **ID** | UC-01 |
| **名稱** | 上傳課程文件 |
| **Actor** | 學員 |
| **前置條件** | App 已開啟，OpenRouter API 可用，LlamaCloud API 可用 |
| **觸發條件** | 學員點擊上傳按鈕並選擇文件 |

**主要流程**：

1. 學員選擇 PDF 或 Markdown 文件
2. 系統驗證文件格式（`.pdf`, `.md`, `.markdown`）
3. 系統驗證文件大小（≤ 100MB）及非空
4. 系統檢查同名文件是否已存在（去重）
5. 系統擷取文字內容（PDF → LlamaParse REST API + `parsing_instruction`，MD → 直接解析）
6. 系統按 Markdown headers 分段，再 sub-split 為 Chunks（512 chars，100 overlap），每 chunk 帶 header context prefix
7. 系統執行 **PromptGuard 安全掃描** — 有問題嘅 chunks 會被移除；全部被 flag 就回傳 422
8. 系統批次呼叫 OpenRouter Embedding API（每批 20）
9. 系統儲存 `Document` 及 `Chunk` 記錄至 MongoDB
10. 系統回傳成功信息（含 `documentId`、`chunkCount`）；若部分 chunks 被 PromptGuard 標記，回傳 `warning` + `flaggedChunks` 數量

**替代流程**：

| 條件 | 處理 |
|------|------|
| 文件格式不符 | 回傳 400 錯誤，提示只接受 PDF/Markdown |
| 文件為空 | 回傳 400 錯誤，提示無效檔案 |
| 文件過大 (>100MB) | 回傳 413 錯誤 |
| 同名文件已存在 | 回傳 409 錯誤，提示先喺「已索引文件」刪除該筆，或使用 `DELETE /api/documents/[id]` |
| LlamaParse 解析失敗/逾時 | 回傳 400 錯誤，提示重試或縮小 PDF |
| 所有 chunks 被 PromptGuard 標記 | 回傳 422 錯誤：內容被安全檢查拒絕 |
| Chunks 為空 | 回傳 400 錯誤，提示無法提取文字 |
| Embedding API 失敗 | 回傳 500 錯誤 |

**後置條件**：文件已索引，可用於聊天、Quiz、Summary

---

## UC-02：AI 聊天複習

| 項目 | 內容 |
|------|------|
| **ID** | UC-02 |
| **名稱** | AI 聊天複習 (RAG Chat) |
| **Actor** | 學員 |
| **前置條件** | 至少一份文件已上傳並索引完成 |
| **觸發條件** | 學員在 Chat Tab 輸入問題 |

**主要流程**：

1. 學員輸入問題
2. 系統執行 **Rate Limiting** 檢查（IP-based sliding window，上限 20 次/分鐘）
3. 系統執行 **PromptGuard 檢查** — 驗證訊息長度（≤ 2000 字）+ 偵測注入攻擊；不安全就回傳警告訊息，安全就回傳 sanitized 文字
4. 系統用 Multi-Query Search 策略搜尋相關內容：
   - toolLLM 將問題拆成 3 個子查詢（唔同角度）
   - 並行對每個子查詢執行 `$vectorSearch`（cosine，top 4）
   - 合併去重，按分數排序取最佳 8 條
5. 系統雙層過濾低相關結果：
   - 第一層：`search.ts` 丟棄 raw cosine < 0.60 嘅 chunks
   - 第二層：`chat/route.ts` 丟棄 normalized score < 0.40 嘅結果（`search.ts` 嘅 `normalizeScore` 以固定 raw 區間線性映射到 0–1，非按批次 min-max）
6. 系統組合 context + 最近 10 條對話歷史
7. 系統呼叫 OpenRouter Chat LLM（streaming）
8. 系統用 Vercel AI SDK（`createUIMessageStreamResponse` + `toUIMessageStream`）streaming 回傳
9. 前端用 `useChat`（@ai-sdk/react）自動接收，透過 markdown-it 渲染回答

**替代流程**：

| 條件 | 處理 |
|------|------|
| Rate Limit 超過 (20次/min) | 回傳 429 + `Retry-After` header |
| 訊息超過 2000 字 | 回傳警告訊息（PromptGuard） |
| 偵測到 Prompt Injection | 回傳警告訊息（PromptGuard） |
| 向量搜尋失敗 | 降級至 keyword fallback（regex 搜尋） |
| 無相關結果 (雙層過濾後為空) | 回傳提示：「冇搵到相關文件內容，請先上傳」 |
| LLM streaming 出錯 | 回傳 error chunk |
| Messages 為空 | 回傳 400 錯誤 |

**後置條件**：學員看到基於文件內容的回答

---

## UC-03：生成 Quiz 練習題

| 項目 | 內容 |
|------|------|
| **ID** | UC-03 |
| **名稱** | 生成 Quiz 練習題 |
| **Actor** | 學員 |
| **前置條件** | 至少一份文件已上傳 |
| **觸發條件** | 學員選擇文件並點擊「生成練習題」 |

**主要流程**：

1. 學員選擇目標文件
2. 學員設定題目數量（3-15 題，預設 5）
3. 系統執行 **Rate Limiting** 檢查（上限 10 次/分鐘）
4. 系統驗證 `documentId` 格式（`guardDocumentId`：24 位 hex，MongoDB ObjectId）
5. 系統檢索文件嘅 Chunks（按 page + chunkIndex 排序）
6. 系統組合 context（上限 12,000 chars）
7. 系統呼叫 LLM 生成 MCQ（含 question、4 options、correctIndex、topic、explanation）
8. 系統驗證並過濾無效題目
9. 系統建立 `QuizAttempt` 記錄（未提交狀態）
10. 系統回傳題目（**隱藏 correctIndex 和 explanation**）

**替代流程**：

| 條件 | 處理 |
|------|------|
| Rate Limit 超過 (10次/min) | 回傳 429 + `Retry-After` header |
| documentId 格式無效 | 回傳 400 錯誤 |
| 文件無 Chunks | 回傳 404 錯誤 |
| LLM 回傳無效 JSON | 回傳 502 錯誤，提示重試 |
| 所有題目都唔合格 | 回傳 502 錯誤 |

**後置條件**：學員看到未作答嘅 Quiz

---

## UC-04：提交 Quiz 答案

| 項目 | 內容 |
|------|------|
| **ID** | UC-04 |
| **名稱** | 提交 Quiz 答案 |
| **Actor** | 學員 |
| **前置條件** | 已完成 Quiz 所有題目（UC-03 後） |
| **觸發條件** | 學員點擊「提交答案」 |

**主要流程**：

1. 學員逐題選擇答案
2. 全部答完後，學員提交
3. 系統比對 `userAnswer` 與 `correctIndex`
4. 系統計算分數及百分比
5. 系統更新 `QuizAttempt`（記錄答案、分數、提交時間）
6. 系統回傳每題結果（含正確答案、explanation、topic 標籤）

**替代流程**：

| 條件 | 處理 |
|------|------|
| Quiz 已提交過 | 回傳 409 錯誤，提示已交 |
| QuizId 不存在 | 回傳 404 錯誤 |
| 答案數量不符 | 回傳 400 錯誤，提示需要回答所有題目 |

**後置條件**：學員看到分數及每題對錯詳情

**業務規則**：
- ≥ 80% → 「🎉 好掂！繼續保持！」
- ≥ 60% → 「💪 唔錯，仲有進步空間」
- < 60% → 「📚 加油，建議重溫弱項」

---

## UC-05：查看知識缺口分析

| 項目 | 內容 |
|------|------|
| **ID** | UC-05 |
| **名稱** | 知識缺口分析 (Knowledge Gap) |
| **Actor** | 學員 |
| **前置條件** | 至少一份 Quiz 已提交 |
| **觸發條件** | 切換至 Quiz Tab（自動載入） |

**主要流程**：

1. 系統查詢所有已提交嘅 `QuizAttempt`
2. 系統按 topic 分組，計算每個 topic 嘅`正確率`
3. 系統按正確率**升序排列**（弱項排前面）
4. 前端顯示整體統計 + topic 明細

**後置條件**：學員識別邊啲 topic 需要加強

---

## UC-06：生成文件摘要

| 項目 | 內容 |
|------|------|
| **ID** | UC-06 |
| **名稱** | AI 生成文件摘要 |
| **Actor** | 學員 |
| **前置條件** | 至少一份文件已上傳 |
| **觸發條件** | 學員在 Summary Tab 選擇文件並點擊生成 |

**主要流程**：

1. 學員選擇目標文件
2. 系統執行 **Rate Limiting** 檢查（上限 10 次/分鐘）
3. 系統驗證 `documentId` 格式（`guardDocumentId`：24 位 hex）
4. 系統檢索 Chunks（按 page + chunkIndex 排序，上限 20,000 chars）
5. 系統呼叫 LLM 生成結構化 Markdown 摘要（streaming）
6. 系統以 NDJSON 格式回傳（每行 `{ token }` → 最終 `{ done: true }`）
7. 前端逐 token 渲染摘要

**替代流程**：

| 條件 | 處理 |
|------|------|
| Rate Limit 超過 (10次/min) | 回傳 429 + `Retry-After` header |
| documentId 格式無效 | 回傳 400 錯誤 |
| 文件無 Chunks | 回傳 404 錯誤 |
| LLM streaming 出錯 | 回傳 NDJSON `{ error }` chunk |

**後置條件**：學員看到結構化嘅學習大綱

---

## UC-07：查看已上傳文件

| 項目 | 內容 |
|------|------|
| **ID** | UC-07 |
| **名稱** | 查看已上傳文件列表 |
| **Actor** | 學員 |
| **前置條件** | 無 |
| **觸發條件** | 頁面載入或 `["documents"]` 快取失效時（`DocumentList`、`useQuiz`、`SummaryPanel`） |

**主要流程**：

1. 前端呼叫 `GET /api/documents`
2. 系統查詢所有 `Document`（按上傳時間降序）
3. 回傳文件列表（filename、originalName、chunkCount、uploadedAt）

**後置條件**：主頁「已索引文件」、Quiz／Summary 文件下拉可使用同一資料源

---

## UC-09：刪除已索引文件

| 項目 | 內容 |
|------|------|
| **ID** | UC-09 |
| **名稱** | 刪除已索引文件 |
| **Actor** | 學員 |
| **前置條件** | 至少有一份已索引文件 |
| **觸發條件** | 學員喺「已索引文件」按 **刪除** 並確認 |

**主要流程**：

1. 前端呼叫 `DELETE /api/documents/{id}`（`id` 為 `GET /api/documents` 回傳嘅 `_id`）
2. 系統驗證 `id` 為有效 24 字元 hex ObjectId
3. 系統刪除所有 `Chunk`（`pdfId` = 該 id）
4. 系統刪除所有 `QuizAttempt`（`documentId` = 該 id）
5. 系統刪除 `Document`
6. 回傳 `{ success, deletedDocumentId, deletedChunks }`；前端刷新文件清單（與 Quiz／Summary 共用 `documents` 快取）

**替代流程**：

| 條件 | 處理 |
|------|------|
| 無效 id | 400 |
| 文件不存在 | 404 |

**後置條件**：該文件不再出現於 RAG／Quiz／Summary；同名檔可重新 ingest。

---

## UC-08：重置答題記錄

| 項目 | 內容 |
|------|------|
| **ID** | UC-08 |
| **名稱** | 重置答題記錄 |
| **Actor** | 學員 |
| **前置條件** | 至少一份 Quiz 已提交 |
| **觸發條件** | 學員點擊「重置記錄」按鈕 |

**主要流程**：

1. 學員確認要清除所有答題記錄
2. 前端呼叫 `DELETE /api/quiz/stats`
3. 系統刪除 `QuizAttempt` collection 內所有文件
4. 系統回傳已刪除數量 `{ deleted: number }`
5. 前端清空 Knowledge Gap 統計

**替代流程**：

| 條件 | 處理 |
|------|------|
| 無記錄可刪 | 回傳 `{ deleted: 0 }` |
| DB 操作失敗 | 回傳 500 錯誤 |

**後置條件**：所有答題記錄已清除，Knowledge Gap 歸零

---

*更新日期：2026-03-26*
