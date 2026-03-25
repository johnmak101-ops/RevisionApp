# Definition of Done (DoD)

## 通用 DoD

所有 Feature / User Story / Bug Fix 必須滿足以下條件先可以標記為「Done」：

### 產品／UAT 門檻（對外宣稱就緒時）

若該次發布代表 **「可畀持份者做 UAT 或上線」**，除以下各節外，尚需滿足 [`PRODUCT_SCOPE.md`](PRODUCT_SCOPE.md) **「UAT／上線最低門檻」** 所列 U1–U7。該表係 BA／PO 簽字用精簡條；細節測試步驟見 `TEST_PLAN.md`。

### 代碼質量

- [ ] TypeScript 嚴格模式無編譯錯誤
- [ ] `npm run build` 成功通過
- [ ] `npm run lint` 無 error（`tsc --noEmit` + `eslint .`，`eslint-config-next`）
- [ ] 無 hardcoded secrets（API key 等必須用 env variable）
- [ ] 有適當嘅錯誤處理（try/catch + 用戶友好錯誤信息）
- [ ] 防禦性編碼：假設 data 可能缺失、API 可能失敗

### 功能驗證

- [ ] 主要流程 (Happy Path) 手動測試通過
- [ ] 所有替代流程 (Edge Cases) 手動驗證
- [ ] 在 dev 環境正常運作 (`npm run dev`)
- [ ] 無 console error/warning（業務邏輯相關）

### 用戶體驗

- [ ] Loading 狀態有清晰指示（button disabled、spinner）
- [ ] 錯誤信息用用戶語言（中文 / 英文根據 context）
- [ ] 回應式設計（desktop + mobile basic layout）

### 文檔

- [ ] 新功能已更新 README（如適用）
- [ ] 若影響範圍／假設／KPI：已檢視是否需改 `docs/PRODUCT_SCOPE.md`
- [ ] API 端點已記錄在 `docs/API_REFERENCE.md`
- [ ] 有意義嘅 Git commit message

---

## 各模組專屬 DoD

### 文件上傳 (Ingest)

| 驗證項 | 狀態 |
|--------|------|
| PDF 上傳 + 文字擷取成功 | ✅ |
| Markdown 上傳 + 解析成功 | ✅ |
| 空文件有錯誤提示 | ✅ |
| 大文件 (>100MB) 有錯誤提示 | ✅ |
| 同名文件去重 (409) | ✅ |
| 損壞 PDF 有錯誤提示 | ✅ |
| Chunks 分割合理 (512 chars, 100 overlap) | ✅ |
| Embedding 批次處理成功 (batch 20) | ✅ |
| Document + Chunk records 正確存儲 | ✅ |

### RAG 聊天 (Chat)

| 驗證項 | 狀態 |
|--------|------|
| Streaming 逐 token 回傳 | ✅ |
| 向量搜尋正確檢索相關 chunks | ✅ |
| Raw cosine < 0.60 喺 `vectorSearch` 被過濾；normalized < 0.40 喺 chat 被過濾 | ✅ |
| Keyword fallback 正常工作 | ✅ |
| 無結果時有提示信息 | ✅ |
| 10 條歷史 context 正確注入 | ✅ |
| 回答基於文件內容，不使用 general knowledge | ✅ |
| 語言自動匹配用戶輸入 | ✅ |

### Quiz

| 驗證項 | 狀態 |
|--------|------|
| 生成 3-15 題 MCQ | ✅ |
| 每題 4 選項 + topic + explanation | ✅ |
| 無效題目被過濾 | ✅ |
| 作答時隱藏正確答案 | ✅ |
| 全部答完先可以提交（frontend + backend 400）| ✅ |
| 同一 quiz 不能重複提交 (409) | ✅ |
| 分數計算正確 | ✅ |
| 提交後顯示每題對錯詳情 | ✅ |
| 分數等級回饋文字正確（frontend `QuizPanel.tsx`）| ✅ |

### 知識缺口 (Knowledge Gap)

| 驗證項 | 狀態 |
|--------|------|
| 按 topic 分組統計 | ✅ |
| 弱項排前面（正確率升序） | ✅ |
| 整體統計正確 | ✅ |
| 無已提交 quiz 時顯示空狀態 | ✅ |

### Summary

| 驗證項 | 狀態 |
|--------|------|
| Streaming 逐步生成 | ✅ |
| 結構化 Markdown 格式 | ✅ |
| 語言同原文一致 | ✅ |
| Context 上限 20,000 chars | ✅ |

---

*更新日期：2026-03-24*
