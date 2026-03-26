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
| 🎯 [`PRODUCT_SCOPE`](docs/PRODUCT_SCOPE.md) | Problem analysis, target personas, and system boundaries. |
| 💡 [`DISCOVERY_AND_PRIORITIZATION`](docs/DISCOVERY_AND_PRIORITIZATION.md) | MVP scoping and MoSCoW prioritization analysis. |
| 📖 [`GLOSSARY`](docs/GLOSSARY.md) | Ubiquitous Language to eliminate domain terminology ambiguity. |
| 🗺️ [`USE_CASES`](docs/USE_CASES.md) | High-level system functionalities and user interaction scenarios. |
| 🧑‍💻 [`USER_STORIES`](docs/USER_STORIES.md) | Standard Given-When-Then BDD criteria for developer-friendly implementations. |
| 🎨 [`UI_FLOW_DIAGRAM`](docs/UI_FLOW_DIAGRAM.md) | Frontend page transitions and UI state machine designs. |
| 🔄 [`SEQUENCE_DIAGRAMS`](docs/SEQUENCE_DIAGRAMS.md) | Detailed sequence diagrams clarifying data flows among Frontend, Backend, LLM, and DB. |
| ⚙️ [`NON_FUNCTIONAL_REQUIREMENTS`](docs/NON_FUNCTIONAL_REQUIREMENTS.md) | Architecture-level constraints including SLAs, performance, and security metrics. |
| ☑️ [`DEFINITION_OF_DONE`](docs/DEFINITION_OF_DONE.md) | Standardized quality gateways for development completeness (DoD). |
| 🛡️ [`TEST_PLAN`](docs/TEST_PLAN.md) | 26 granular Test Cases ensuring rigorous quality assurance. |
| 📐 [`TRACEABILITY_MATRIX`](docs/TRACEABILITY_MATRIX.md) | 100% bidirectional requirement coverage mapping Use Cases to Test Cases. |

*(Technical Documentation: [`ARCHITECTURE`](docs/ARCHITECTURE.md), [`API_REFERENCE`](docs/API_REFERENCE.md), [`SETUP_GUIDE`](docs/SETUP_GUIDE.md), [`DEVELOPER_GUIDE`](docs/DEVELOPER_GUIDE.md), [`MONGODB_VECTOR_SETUP`](docs/MONGODB_VECTOR_SETUP.md))*

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
