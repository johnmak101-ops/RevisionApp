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
- [ ] 同名文件不能重複上傳（409 錯誤）
- [ ] 空文件或損壞文件有清晰錯誤提示
- [ ] 文件大小上限 100MB

**負面路徑 (Negative Paths)**:
- [ ] 如果 PDF 包含大量非文字內容（如純圖片、掃描件），系統透過 LlamaParse OCR 處理，但需在 chunk 數量较低時提示用戶「部分內容可能未被索引」
- [ ] 如果 LlamaParse API 配額已用盡，回傳具體錯誤提示（而非通用 500 錯誤）

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
- [ ] 顯示文件名、chunk 數量、上傳時間
- [ ] 按上傳時間倒序排列

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
- [ ] 當 AI 無法喺文件中搎到答案時，必須誠實回答「教材未涵蓋此內容」，而非胡亂猜測 (Hallucination Control)
- [ ] 向量搜尋 score 低於 0.4 嘅結果必須過濾，不可作為 AI 回答依據

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

*更新日期：2026-03-24*
