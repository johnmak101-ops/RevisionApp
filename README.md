<div align="center">

# Revision App 

[English](README.en.md) · **中文**

</div>

---

## 🎥 產品實機展示 (Product Demo)
  
    1. RAG 智能問答


[ai_chat.webm](https://github.com/user-attachments/assets/9a37b1c1-f132-4b24-a6fb-d789ffb3051e)


    
    2. Quiz 生成與缺口分析
    

[quiz.webm](https://github.com/user-attachments/assets/55532c69-2b79-4204-b7ee-b41a0cd86953)



    
    3. AI 學習大綱
  

[summary.webm](https://github.com/user-attachments/assets/10a621b1-7920-41c7-939d-c87ddf518a89)




---



## ⏱️ 專案速覽 (Elevator Pitch)

這是一個基於 **Next.js 16** 的 AI 學習工具：

*   🎯 **要解決的問題：** 學員在海量 Revision Slides 中搜尋特定概念及重點的時間成本極高。
*   💡 **解決方案：** 利用 RAG 與 Vector Search 技術精準定位課件內容，並自動生成針對性測驗，將「搜尋課件」與「自我測試」的時間大幅縮減約 50%。
*   📐 **Requirement Engineering：** 嚴謹定義 9 個 Use Cases 與 10 條 User Stories，並透過 **Traceability Matrix** 實現從商業痛點到驗收測試的 100% 覆蓋。

---

## 📊 需求分析與設計文檔 (Requirements & Design)

以下為本專案的系統需求與業務分析交付物：

| 交付物 | 亮點說明 |
|------|----------|
| 🎯 [`PRODUCT_SCOPE`](docs/PRODUCT_SCOPE.md) | 產品定位、痛點分析與目標用戶。 |
| 💡 [`DISCOVERY_AND_PRIORITIZATION`](docs/DISCOVERY_AND_PRIORITIZATION.md) | MVP 範圍劃分、MoSCoW 優先級分析。 |
| 📖 [`GLOSSARY`](docs/GLOSSARY.md) | 統一業務術語 (Ubiquitous Language)，減少溝通誤差。 |
| 🗺️ [`USE_CASES`](docs/USE_CASES.md) | 系統宏觀功能與使用者互動場景定義。 |
| 🧑‍💻 [`USER_STORIES`](docs/USER_STORIES.md) | 標準 Given-When-Then 寫法，清晰展示 Developer-friendly 的驗收標準。 |
| 🎨 [`UI_FLOW_DIAGRAM`](docs/UI_FLOW_DIAGRAM.md) | 前端頁面流轉與 UI 狀態切換設計。 |
| 🔄 [`SEQUENCE_DIAGRAMS`](docs/SEQUENCE_DIAGRAMS.md) | 詳細時序圖，釐清 Frontend、Backend、LLM 與 DB 的資料流互動。 |
| ⚙️ [`NON_FUNCTIONAL_REQUIREMENTS`](docs/NON_FUNCTIONAL_REQUIREMENTS.md) | 效能、安全性、擴展性等 SLA 及架構級約束。 |
| ☑️ [`DEFINITION_OF_DONE`](docs/DEFINITION_OF_DONE.md) | 團隊開發完成的品質標準 (DoD)。 |
| 🛡️ [`TEST_PLAN`](docs/TEST_PLAN.md) | 26 項嚴密的驗收測試案例 (Test Cases)，確保交付品質。 |
| 📐 [`TRACEABILITY_MATRIX`](docs/TRACEABILITY_MATRIX.md) | 從 Use Case 到 Test Case 的 100% 需求雙向追蹤矩陣。 |

*(Technical Documentation: [`ARCHITECTURE`](docs/ARCHITECTURE.md), [`API_REFERENCE`](docs/API_REFERENCE.md), [`SETUP_GUIDE`](docs/SETUP_GUIDE.md), [`DEVELOPER_GUIDE`](docs/DEVELOPER_GUIDE.md), [`MONGODB_VECTOR_SETUP`](docs/MONGODB_VECTOR_SETUP.md))*

---

## 🚀 快速開始 (Quick Start)

供 Technical Assessor 本地運行驗證：

```bash
# 環境要求: Node.js 24.x LTS
npm install
cp .env.example .env.local  # 填寫 MONGODB_URI 與 OPENROUTER_API_KEY
npm run dev

# 運行 Playwright E2E 自動化測試
npm run e2e
```

<div align="center">
<br/>
<b>John Mak</b>
</div>
