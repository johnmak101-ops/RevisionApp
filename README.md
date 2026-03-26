<div align="center">

# Revision App 

[English](README.en.md) · **中文**

</div>

---

## 🎥 產品實機展示 (Product Demo)

<table align="center">
  <tr>
    <th align="center">1. RAG 智能問答</th>
    <th align="center">2. Quiz 生成與缺口分析</th>
    <th align="center">3. AI 學習大綱</th>
  </tr>
  <tr>
    <td align="center">
      <a href="https://streamable.com/lzys27" target="_blank">
        <img src="https://img.shields.io/badge/%E2%96%B6%EF%B8%8F_Watch_Demo-2C3E50?style=for-the-badge" alt="RAG Chat Demo" />
      </a>
    </td>
    <td align="center">
      <a href="https://streamable.com/j2s9z4" target="_blank">
        <img src="https://img.shields.io/badge/%E2%96%B6%EF%B8%8F_Watch_Demo-2C3E50?style=for-the-badge" alt="Quiz Demo" />
      </a>
    </td>
    <td align="center">
      <a href="https://streamable.com/g8pfys" target="_blank">
        <img src="https://img.shields.io/badge/%E2%96%B6%EF%B8%8F_Watch_Demo-2C3E50?style=for-the-badge" alt="Summary Demo" />
      </a>
    </td>
  </tr>
</table>

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
| 🎯 [`PRODUCT_SCOPE`](docs/PRODUCT_SCOPE.md) | 產品定位、痛點分析。 |
| 📐 [`TRACEABILITY_MATRIX`](docs/TRACEABILITY_MATRIX.md) | 涵蓋 9 個 Use Case 到 26 個 Test Case，確保 100% 需求覆蓋。 |
| 🧑‍💻 [`USER_STORIES`](docs/USER_STORIES.md) | 標準 Given-When-Then 寫法，展示 Developer-friendly 的驗收標準。 |
| 🛡️ [`TEST_PLAN`](docs/TEST_PLAN.md) | 26 項嚴密的驗收準則 (Acceptance Criteria)，確保開發團隊交付 100% 吻合 User Stories。 |
| ⚙️ [`NON_FUNCTIONAL_REQUIREMENTS`](docs/NON_FUNCTIONAL_REQUIREMENTS.md) | 效能、安全性、擴展性等架構級約束與指標。 |
| 🔄 [`SEQUENCE_DIAGRAMS`](docs/SEQUENCE_DIAGRAMS.md) | 詳細時序圖，釐清 Frontend、Backend、LLM 與 DB 的資料流互動。 |

*(其他技術細節請見 [`ARCHITECTURE`](docs/ARCHITECTURE.md) 及 [`USE_CASES`](docs/USE_CASES.md))*

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
