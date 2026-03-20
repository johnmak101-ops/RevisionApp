# 用例文件 (Use Cases)

## 角色定義 (Actors)

| 角色 | 描述 |
|------|------|
| **學員 (Student)** | Bootcamp 學員，需要複習課程內容 |
| **系統 (System)** | Revision App 後端服務 |
| **OpenRouter AI** | 外部 LLM & Embedding 服務 |
| **MongoDB Atlas** | 雲端資料庫 + 向量搜尋引擎 |
| **LlamaCloud** | LlamaParse REST API，負責 PDF 解析 |

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
5. 系統擷取文字內容（PDF → LlamaParse REST API，MD → 直接解析）
6. 系統將文字分割為 Chunks（512 chars，100 overlap）
7. 系統批次呼叫 OpenRouter Embedding API（每批 20）
8. 系統儲存 `Document` 及 `Chunk` 記錄至 MongoDB
9. 系統回傳成功信息（含 `documentId`、`chunkCount`）

**替代流程**：

| 條件 | 處理 |
|------|------|
| 文件格式不符 | 回傳 400 錯誤，提示只接受 PDF/Markdown |
| 文件為空 | 回傳 400 錯誤，提示無效檔案 |
| 文件過大 (>100MB) | 回傳 413 錯誤 |
| 同名文件已存在 | 回傳 409 錯誤，提示需先刪除舊版本 |
| LlamaParse 解析失敗/逾時 | 回傳 400 錯誤，提示重試或縮小 PDF |
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
2. 系統將問題轉為 embedding vector
3. 系統對 MongoDB 執行 `$vectorSearch`（cosine，top 50 candidates → 5 results）
4. 系統過濾 score < 0.4 嘅低相關結果
5. 系統組合 context + 最近 6 條對話歷史
6. 系統呼叫 OpenRouter Chat LLM（streaming）
7. 前端逐 token 渲染回答（NDJSON streaming）

**替代流程**：

| 條件 | 處理 |
|------|------|
| 向量搜尋失敗 | 降級至 keyword fallback（regex 搜尋） |
| 無相關結果 (所有 score < 0.4) | 回傳提示：「冇搵到相關文件內容，請先上傳」 |
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
3. 系統檢索文件嘅 Chunks（按 page + chunkIndex 排序）
4. 系統組合 context（上限 12,000 chars）
5. 系統呼叫 LLM 生成 MCQ（含 question、4 options、correctIndex、topic、explanation）
6. 系統驗證並過濾無效題目
7. 系統建立 `QuizAttempt` 記錄（未提交狀態）
8. 系統回傳題目（**隱藏 correctIndex 和 explanation**）

**替代流程**：

| 條件 | 處理 |
|------|------|
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
2. 系統檢索 Chunks（按 page + chunkIndex 排序，上限 20,000 chars）
3. 系統呼叫 LLM 生成結構化 Markdown 摘要（streaming）
4. 前端逐 token 渲染摘要

**替代流程**：

| 條件 | 處理 |
|------|------|
| 文件無 Chunks | 回傳 404 錯誤 |
| LLM streaming 出錯 | 回傳 error chunk |

**後置條件**：學員看到結構化嘅學習大綱

---

## UC-07：查看已上傳文件

| 項目 | 內容 |
|------|------|
| **ID** | UC-07 |
| **名稱** | 查看已上傳文件列表 |
| **Actor** | 學員 |
| **前置條件** | 無 |
| **觸發條件** | 頁面載入時自動呼叫 |

**主要流程**：

1. 系統查詢所有 `Document`（按上傳時間降序）
2. 回傳文件列表（filename、chunkCount、uploadedAt）

**後置條件**：各組件可使用文件列表（Quiz、Summary 嘅文件選擇）

---

*更新日期：2026-03-20*
