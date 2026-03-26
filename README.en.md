<div align="center">

# Revision App

**English** · [中文](README.md)

</div>

---

## 🎥 Product Demo

<table align="center">
  <tr>
    <th align="center">1. RAG Smart Chat</th>
    <th align="center">2. Auto Quiz & Gap Analysis</th>
    <th align="center">3. AI Summary Generation</th>
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

## ⏱️ 30-Second Elevator Pitch

A full-stack AI learning tool MVP built with **Next.js 16**:

*   🎯 **The Problem:** Learners spend an excessive amount of time manually searching for key concepts across massive volumes of revision slides.
*   💡 **The Solution:** Applying a Problem-driven approach with RAG and Vector Search to pinpoint relevant slide content and generate targeted quizzes, reducing the time spent on searching materials and self-testing by an estimated 50%.
*   📐 **Requirement Engineering:** Rigorously defined 9 Use Cases and 10 User Stories, utilizing a **Traceability Matrix** to ensure 100% coverage from business pain points to acceptance testing.

---

## 📊 Requirements & System Design

The following deliverables define the system requirements and business analysis of this project:

| Deliverable | Highlight |
|------|----------|
| 🎯 [`PRODUCT_SCOPE`](docs/PRODUCT_SCOPE.md) | Problem analysis, target personas. |
| 📐 [`TRACEABILITY_MATRIX`](docs/TRACEABILITY_MATRIX.md) | 100% requirement coverage mapping 9 Use Cases to 26 Test Cases. |
| 🧑‍💻 [`USER_STORIES`](docs/USER_STORIES.md) | Standard Given-When-Then criteria, ensuring unambiguous technical implementation. |
| 🛡️ [`TEST_PLAN`](docs/TEST_PLAN.md) | 26 granular Acceptance Criteria ensuring 100% alignment with User Stories. |
| ⚙️ [`NON_FUNCTIONAL_REQUIREMENTS`](docs/NON_FUNCTIONAL_REQUIREMENTS.md) | Architecture-level constraints including performance, security, and scalability metrics. |

*(For architectural decisions, see [`ARCHITECTURE`](docs/ARCHITECTURE.md) and [`USE_CASES`](docs/USE_CASES.md))*

---

## 🚀 Quick Start

For Technical Assessors verifying the local environment:

```bash
# Requires: Node.js 24.x LTS
npm install
cp .env.example .env.local  # Fill in MONGODB_URI and OPENROUTER_API_KEY
npm run dev

# Run Playwright E2E Automated Tests
npm run e2e
```

<div align="center">
<br/>
<b>John Mak</b> | Focused on Requirement Analysis & Agile Product Delivery
</div>
