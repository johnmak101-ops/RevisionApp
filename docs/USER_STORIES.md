# User Stories

## Epic 1：文件管理

### US-1.1 上傳 PDF 文件

> **As a** Bootcamp 學員
> **I want to** 上傳課程 PDF 文件
> **So that** 系統可以索引內容供 AI 使用

**Acceptance Criteria**:
- [ ] 支援 `.pdf` 格式
- [ ] 上傳後自動擷取文字、分割、embedding、存儲
- [ ] 顯示上傳成功信息（含 chunk 數量）
- [ ] 同名文件不能重複上傳（409 錯誤）；可先刪除「已索引文件」再傳（見 US-1.4）
- [ ] 空文件或損壞文件有清晰錯誤提示
- [ ] 文件大小上限 100MB

**負面路徑 (Negative Paths)**:
- [ ] **（待實作／P2）** 如果 PDF 以圖像／掃描為主導致 chunk 偏少，產品層可補提示「部分內容可能未被索引」——現行程式僅經 LlamaParse + `parsing_instruction` 擷取，**無**此專用 UI 文案
- [ ] **（待強化）** LlamaParse 配額或供應商錯誤時，ingest 回 `400` 與 `parseErr` 訊息；**未必**與「額度用盡」一一對應，可再依 HTTP 狀態／body 細分提示

### US-1.2 上傳 Markdown 文件

> **As a** Bootcamp 學員
> **I want to** 上傳 Markdown 格式筆記
> **So that** 系統可以索引我嘅個人筆記

**Acceptance Criteria**:
- [ ] 支援 `.md`、`.markdown` 格式
- [ ] 處理流程同 PDF 一致

### US-1.3 查看已上傳文件

> **As a** Bootcamp 學員
> **I want to** 查看已上傳嘅文件列表
> **So that** 我知道邊啲資料已經可以用

**Acceptance Criteria**:
- [ ] `GET /api/documents` 回傳 `filename`、`chunkCount`、`uploadedAt` 等；主頁「已索引文件」**目前**僅顯示檔名與 chunk 數（唔顯示時間）
- [ ] 列表順序與 API 一致：`uploadedAt` 倒序（`Document.find().sort({ uploadedAt: -1 })`）

### US-1.4 刪除已索引文件

> **As a** Bootcamp 學員
> **I want to** 刪除唔再需要嘅已索引文件
> **So that** 可以釋放索引、或重新上傳同名檔案

**Acceptance Criteria**:
- [ ] 主頁「已索引文件」可逐筆刪除（確認後執行）
- [ ] 刪除後呼叫 `DELETE /api/documents/[id]`，一併清除 chunks 與關聯 Quiz 記錄
- [ ] 刪除後文件清單與 Quiz／Summary 下拉即時一致（共用 `documents` 快取）

---

## Epic 2：RAG 聊天

### US-2.1 對話式複習

> **As a** Bootcamp 學員
> **I want to** 用自然語言問課程相關問題
> **So that** AI 根據我上傳嘅教材回答

**Acceptance Criteria**:
- [ ] 回答只基於上傳文件內容，唔用 general knowledge
- [ ] 回覆語言與用戶輸入語言一致
- [ ] Streaming 逐 token 顯示
- [ ] 保留最近 10 條對話歷史作為 context

**負面路徑 (Negative Paths)**:
- [ ] 合併檢索後無可用 chunk（`normalized score < 0.40`）時，以 **HTTP 200** streaming 回固定提示（與 `chat/route.ts` 一致）：`⚠️ 冇搵到相關文件內容。請先上傳相關嘅 PDF 或 Markdown 檔案，再問呢個問題。`——唔用 JSON 4xx，以便 `useChat` 顯示為助理訊息
- [ ] 檢索結果須經兩段過濾：`search.ts` 丟棄 raw cosine < 0.60；正規化後 `chat/route.ts` 丟棄 normalized < 0.40，不可將後者用作回答 context

### US-2.2 搜尋容錯

> **As a** 學員
> **I want to** 即使向量搜尋失敗都有結果
> **So that** 唔會因為技術問題完全冇回應

**Acceptance Criteria**:
- [ ] 向量搜尋失敗時降級至 keyword fallback
- [ ] 無相關結果時清晰提示用戶上傳文件

---

## Epic 3：Quiz 練習

### US-3.1 自動出題

> **As a** Bootcamp 學員
> **I want to** AI 自動根據教材生成多選題
> **So that** 我可以測試自己嘅理解

**Acceptance Criteria**:
- [ ] 可選擇目標文件
- [ ] 可設定題目數量 (3-15)
- [ ] 每題 4 個選項
- [ ] 每題標記 topic 及 explanation
- [ ] 生成嘅題目測試理解力，唔係死記硬背
- [ ] 作答時隱藏正確答案

### US-3.2 提交評分

> **As a** Bootcamp 學員
> **I want to** 提交答案並即時看到結果
> **So that** 我知道邊啲題答啱邊啲答錯

**Acceptance Criteria**:
- [ ] 需全部答完先可以提交
- [ ] 顯示分數、百分比
- [ ] 每題顯示正確答案、我的答案、解釋
- [ ] 每題標示 topic
- [ ] 同一份 quiz 只能提交一次

### US-3.3 知識缺口分析

> **As a** Bootcamp 學員
> **I want to** 自動分析我嘅弱項 topic
> **So that** 我知道需要加強邊啲範疇

**Acceptance Criteria**:
- [ ] 按 topic 分組顯示正確率
- [ ] 弱項 (低正確率) 排前面
- [ ] 顯示整體統計（總題數、正確數、平均正確率）

---

## Epic 4：Summary 大綱

### US-4.1 生成學習大綱

> **As a** Bootcamp 學員
> **I want to** AI 自動生成文件嘅學習大綱
> **So that** 我可以快速掌握整份教材嘅重點

**Acceptance Criteria**:
- [ ] 可選擇目標文件
- [ ] 生成結構化 Markdown 大綱（章節、重點、定義）
- [ ] 🔑 標記最關鍵嘅知識點
- [ ] Streaming 逐步顯示
- [ ] 語言同原文一致

---

*更新日期：2026-03-26*
