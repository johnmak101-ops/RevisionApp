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
      <video src="https://github.com/user-attachments/assets/2090001b-7a3e-4306-a971-61dd080be148" width="260" controls></video>
    </td>
    <td align="center">
      <video src="https://github.com/user-attachments/assets/3da6c114-3e1d-4af5-8e1c-5e0495891ee8" width="260" controls></video>
    </td>
    <td align="center">
      <video src="https://github.com/user-attachments/assets/0e8a8694-a479-4d4c-84b7-dfb4dedd30c8" width="260" controls></video>
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
