# 需求追蹤矩陣 (Traceability Matrix)

> **目的**：確保每個需求都有對應嘅實現、測試、同驗證，無遺漏。

---

## 1. Use Case ↔ User Story ↔ Test Case 對照表

| Use Case | User Story | Test Case(s) | API Endpoint | UI 組件 | 實現狀態 | UAT 狀態 | 用戶反饋 |
|----------|-----------|--------------|--------------|---------|----------|----------|----------|
| UC-01 上傳 PDF | US-1.1 | TC-01, TC-03~07 | `POST /api/ingest` | `FileUpload` | ✅ 已實現 | ⏳ 待 UAT | — |
| UC-01 上傳 MD | US-1.2 | TC-02 | `POST /api/ingest` | `FileUpload` | ✅ 已實現 | ⏳ 待 UAT | — |
| UC-02 RAG 聊天 | US-2.1, US-2.2 | TC-10~13B | `POST /api/chat` | `ChatBox` | ✅ 已實現 | ⏳ 待 UAT | — |
| UC-03 Quiz 生成 | US-3.1 | TC-14~16 | `POST /api/quiz/generate` | `QuizPanel` | ✅ 已實現 | ⏳ 待 UAT | — |
| UC-04 Quiz 提交 | US-3.2 | TC-17~19 | `POST /api/quiz/submit` | `QuizPanel` | ✅ 已實現 | ⏳ 待 UAT | — |
| UC-05 知識缺口 | US-3.3 | TC-20~22A | `GET /api/quiz/stats`<br>`DELETE /api/quiz/stats` | `KnowledgeGap` | ✅ 已實現 | ⏳ 待 UAT | — |
| UC-06 Summary | US-4.1 | TC-22, TC-23 | `POST /api/summary/generate` | `SummaryPanel` | ✅ 已實現 | ⏳ 待 UAT | — |
| UC-07 文件列表 | US-1.3 | TC-08, TC-09 | `GET /api/documents` | `FileUpload`(dropdown) | ✅ 已實現 | ⏳ 待 UAT | — |

> **UAT 狀態說明**：⏳ 待 UAT → 🔄 UAT 進行中 → ✅ UAT 通過（填寫通過日期）→ ❌ UAT 失敗（記錄問題）

---

## 2. User Story ↔ Acceptance Criteria ↔ Test Case 詳細對照

### Epic 1：文件管理

| User Story | Acceptance Criteria | Test Case | 覆蓋 |
|-----------|-------------------|-----------|------|
| US-1.1 上傳 PDF | 支援 `.pdf` 格式 | TC-01 | ✅ |
| | 自動擷取文字、分割、embedding、存儲 | TC-01 | ✅ |
| | 顯示成功信息（含 chunk 數量） | TC-01 | ✅ |
| | 同名文件 409 錯誤 | TC-06 | ✅ |
| | 空/損壞文件清晰錯誤提示 | TC-04, TC-07 | ✅ |
| | 文件大小上限 100MB | TC-05 | ✅ |
| US-1.2 上傳 MD | 支援 `.md`、`.markdown` 格式 | TC-02 | ✅ |
| | 處理流程同 PDF 一致 | TC-02 | ✅ |
| US-1.3 查看文件 | 顯示文件名、chunk 數量、上傳時間 | TC-08 | ✅ |
| | 按上傳時間倒序排列 | TC-08 | ✅ |

### Epic 2：RAG 聊天

| User Story | Acceptance Criteria | Test Case | 覆蓋 |
|-----------|-------------------|-----------|------|
| US-2.1 對話複習 | 只基於上傳文件內容回答 | TC-10 | ✅ |
| | 回覆語言與輸入一致 | TC-10 | ✅ |
| | Streaming 逐 token 顯示 | TC-10, TC-NF-02 | ✅ |
| | 保留最近 10 條對話歷史 | TC-13 | ✅ |
| US-2.2 搜尋容錯 | 向量搜尋失敗時 keyword fallback | TC-11 | ✅ |
| | 無相關結果清晰提示 | TC-11 | ✅ |

### Epic 3：Quiz 練習

| User Story | Acceptance Criteria | Test Case | 覆蓋 |
|-----------|-------------------|-----------|------|
| US-3.1 自動出題 | 可選擇目標文件 | TC-14 | ✅ |
| | 題目數量 3-15 | TC-16 | ✅ |
| | 每題 4 個選項 | TC-14 | ✅ |
| | 每題標記 topic + explanation | TC-14 | ✅ |
| | 測試理解力 | TC-14 *(人工驗證)* | ⚠️ |
| | 作答時隱藏正確答案 | TC-14 | ✅ |
| US-3.2 提交評分 | 需全部答完先提交 | TC-17 | ✅ |
| | 顯示分數、百分比 | TC-17 | ✅ |
| | 每題顯示正確答案、我的答案、解釋 | TC-17 | ✅ |
| | 每題標示 topic | TC-17 | ✅ |
| | 同一份 quiz 只能提交一次 | TC-18 | ✅ |
| US-3.3 知識缺口 | 按 topic 分組顯示正確率 | TC-20 | ✅ |
| | 弱項排前面 | TC-20 | ✅ |
| | 顯示整體統計 | TC-20 | ✅ |

### Epic 4：Summary

| User Story | Acceptance Criteria | Test Case | 覆蓋 |
|-----------|-------------------|-----------|------|
| US-4.1 學習大綱 | 可選擇目標文件 | TC-22 | ✅ |
| | 結構化 Markdown（章節、重點、定義） | TC-22 | ✅ |
| | 🔑 標記關鍵知識點 | TC-22 *(人工驗證)* | ⚠️ |
| | Streaming 逐步顯示 | TC-22, TC-NF-02 | ✅ |
| | 語言同原文一致 | TC-22 *(人工驗證)* | ⚠️ |

---

## 3. 覆蓋率統計

### 按 Use Case

| Use Case | Test Cases | Coverage |
|----------|-----------|----------|
| UC-01 | 6 | ✅ 100% |
| UC-02 | 5 | ✅ 100% |
| UC-03 | 3 | ✅ 100% |
| UC-04 | 3 | ✅ 100% |
| UC-05 | 3 | ✅ 100% |
| UC-06 | 2 | ✅ 100% |
| UC-07 | 2 | ✅ 100% |

### 按 User Story

| Metric | 數值 |
|--------|------|
| 總 Acceptance Criteria | 31 |
| 自動測試可覆蓋 | 28 (90%) |
| 需人工驗證 | 3 (10%) |
| 未覆蓋 | 0 (0%) |

### 按 API Endpoint

| Endpoint | Test Cases | 正常流程 | 錯誤處理 |
|----------|-----------|---------|---------|
| `POST /api/ingest` | 6 | TC-01, TC-02 | TC-03, TC-04, TC-05, TC-06, TC-07 |
| `GET /api/documents` | 2 | TC-08 | TC-09 |
| `POST /api/chat` | 5 | TC-10, TC-13, TC-13B | TC-11, TC-12 |
| `POST /api/quiz/generate` | 3 | TC-14, TC-16 | TC-15 |
| `POST /api/quiz/submit` | 3 | TC-17 | TC-18, TC-19 |
| `GET /api/quiz/stats` | 2 | TC-20 | TC-21 |
| `DELETE /api/quiz/stats` | 1 | TC-22A | — |
| `POST /api/summary/generate` | 2 | TC-22 | TC-23 |

---

## 4. 人工審查標準 (Manual Review Standards)

以下項目涉及 AI 生成品質判斷，需人工根據以下標準進行評核：

### AI 生成題目品質評分表 (Quiz Quality Rubric)

> **適用範圍**：TC-14 人工驗證部分（AC-3.1.5：題目測試理解力 vs 死記硬背）
> **評分方式**：每維度 1-5 分，總分 ≥ 16/20 為合格，< 12/20 需重新生成

| 評分維度 | 1 分（不合格） | 3 分（合格） | 5 分（優秀） | 評核重點 |
|----------|---------------|-------------|-------------|----------|
| **題幹清晰度** | 含糊不清，可有多種解讀 | 基本清晰，但有輕微歧義 | 精確無歧義，一看即明 | 題幹是否包含足夠上下文？避免用「以下哪個」等曖昧開頭 |
| **誤導選項 (Distractors)** | 錯誤選項明顯，一眼識破 | 部分選項有一定迷惑性 | 所有錯誤選項都係合理嘅「常見誤解」，需要真正理解先能分辨 | 錯誤選項是否來自教材中嘅相關概念？避免用無關嘅荒謬選項 |
| **解釋品質** | 只講「答案係 X」，無解釋 | 簡單說明為何正確 | 詳細解釋原理 + 點解其他選項錯誤 + 延伸學習點 | 解釋是否能幫助學員真正理解，而非只係知道答案？ |
| **知識層次 (Bloom's)** | 純記憶（背定義、背步驟） | 理解 + 應用（解釋概念、簡單應用） | 分析 + 評估（比較方案、判斷場景適用性） | 題目是否要求學員「思考」而非「回憶」？ |

### 其他需人工驗證嘅項目

| ID | 項目 | 評核標準 |
|----|------|----------|
| ⚠️ AC-4.1.3 | Summary 🔑 標記關鍵知識點 | 標記嘅知識點是否係該主題嘅核心概念？由 domain expert 確認 |
| ⚠️ AC-4.1.5 | Summary 語言同原文一致 | 輸入中文教材應輸出中文；輸入英文教材應輸出英文；不可混用 |
| ⚠️ AC-2.1-NP | RAG Hallucination Control | 當教材無相關內容，AI 是否明確回答「教材未涵蓋」而非自行補充？ |

---

## 5. 追蹤矩陣圖示

```mermaid
graph LR
    subgraph Use Cases
        UC1["UC-01 上傳"]
        UC2["UC-02 Chat"]
        UC3["UC-03 Quiz Gen"]
        UC4["UC-04 Quiz Submit"]
        UC5["UC-05 Knowledge Gap"]
        UC6["UC-06 Summary"]
        UC7["UC-07 Doc List"]
    end
    
    subgraph User Stories
        US11["US-1.1"]
        US12["US-1.2"]
        US13["US-1.3"]
        US21["US-2.1"]
        US22["US-2.2"]
        US31["US-3.1"]
        US32["US-3.2"]
        US33["US-3.3"]
        US41["US-4.1"]
    end
    
    subgraph Test Cases
        TC01["TC-01~07"]
        TC08["TC-08~09"]
        TC10["​TC-10~13B"]
        TC14["TC-14~16"]
        TC17["TC-17~19"]
        TC20["TC-20~22A"]
        TC22["TC-22~23"]
    end
    
    UC1 --> US11
    UC1 --> US12
    UC7 --> US13
    UC2 --> US21
    UC2 --> US22
    UC3 --> US31
    UC4 --> US32
    UC5 --> US33
    UC6 --> US41
    
    US11 --> TC01
    US12 --> TC01
    US13 --> TC08
    US21 --> TC10
    US22 --> TC10
    US31 --> TC14
    US32 --> TC17
    US33 --> TC20
    US41 --> TC22
```

---

*更新日期：2026-03-24*
