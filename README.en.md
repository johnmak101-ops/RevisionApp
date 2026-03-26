<div align="center">

# Revision App

**Bootcamp study-revision app** — PDF/Markdown, RAG chat, quiz, knowledge gaps, AI summaries

**English** · [中文](README.md)

</div>

---

## About

**Personal portfolio** — BA/product artefacts (scope, discovery, use cases, user stories, traceability, test plan, UAT gate) and **full-stack implementation** are my own work.

| Item | Notes |
|------|-------|
| **Demo** | No public hosted URL—use **Quick start** below; UI in **Screenshots**. |
| **Stack** | Next.js 16, MongoDB Atlas, OpenRouter, Vercel |

### Deep-dive docs

| Topic | Link |
|------|------|
| Business context, KPIs, MVP / out of scope / UAT | [`docs/en/PRODUCT_SCOPE.md`](docs/en/PRODUCT_SCOPE.md) |
| Discovery, prioritization, ~50% time hypothesis | [`docs/en/DISCOVERY_AND_PRIORITIZATION.md`](docs/en/DISCOVERY_AND_PRIORITIZATION.md) |
| Use cases, actors, protections | [`docs/en/USE_CASES.md`](docs/en/USE_CASES.md) · [`docs/SEQUENCE_DIAGRAMS.md`](docs/SEQUENCE_DIAGRAMS.md) |
| Security (Vard, chunk guard, rate limits) | [`docs/en/ARCHITECTURE.md`](docs/en/ARCHITECTURE.md) |

---

## Core features

| Feature | Description |
|---------|-------------|
| Upload / indexed list | PDF, Markdown; delete one row to free index or fix duplicate 409 |
| RAG chat | Streaming answers from indexed content |
| Quiz / knowledge gap | AI multiple-choice; weak topics by topic |
| Summary | Document outline |
| Security | Prompt guard, API rate limits, input validation |

---

## Documentation

### Product / BA

[`PRODUCT_SCOPE`](docs/en/PRODUCT_SCOPE.md) · [`DISCOVERY / prioritization`](docs/en/DISCOVERY_AND_PRIORITIZATION.md) · [`USE_CASES`](docs/en/USE_CASES.md) · [`USER_STORIES`](docs/en/USER_STORIES.md) · [`TRACEABILITY_MATRIX`](docs/en/TRACEABILITY_MATRIX.md) · [`TEST_PLAN`](docs/en/TEST_PLAN.md) · [`NFR`](docs/en/NON_FUNCTIONAL_REQUIREMENTS.md)

### Engineering

[`DEVELOPER_GUIDE`](docs/en/DEVELOPER_GUIDE.md) · [`SETUP_GUIDE`](docs/en/SETUP_GUIDE.md) · [`ARCHITECTURE`](docs/en/ARCHITECTURE.md) · [`API_REFERENCE`](docs/en/API_REFERENCE.md) · [`SEQUENCE_DIAGRAMS`](docs/SEQUENCE_DIAGRAMS.md) · [`UI_FLOW_DIAGRAM`](docs/en/UI_FLOW_DIAGRAM.md) · [`MONGODB_VECTOR_SETUP`](docs/en/MONGODB_VECTOR_SETUP.md) · [`GLOSSARY`](docs/en/GLOSSARY.md)

### Quality & other languages

[`DEFINITION_OF_DONE`](docs/en/DEFINITION_OF_DONE.md) · Chinese: [`README.md`](README.md) · `docs/` (same filenames as `docs/en/`)

---

## Screenshots

From a local / self-hosted run (Chat, Quiz, Summary).

<table align="center">
  <tr>
    <th align="center">Chat</th>
    <th align="center">Quiz</th>
    <th align="center">Summary</th>
  </tr>
  <tr>
    <td align="center"><img src="docs/screenshots/screenshot-chat.png" alt="Chat" width="260"/></td>
    <td align="center"><img src="docs/screenshots/screenshot-quiz.png" alt="Quiz" width="260"/></td>
    <td align="center"><img src="docs/screenshots/screenshot-summary.png" alt="Summary" width="260"/></td>
  </tr>
</table>

---

## Tech stack

| Area | Choice |
|------|--------|
| Framework | Next.js **16** (Turbopack) |
| Runtime | **Node.js 24** (`engines.node`: `>=24.0.0`; `@types/node` ^24) |
| Database | MongoDB Atlas **vector search** |
| LLM / embeddings | OpenRouter: `gemini-2.5-flash-lite` chat, `qwen/qwen3-embedding-4b` embeddings |
| Networking | Default chat uses Gemini: **a VPN may be required** on some networks |
| PDF | LlamaParse |
| Security | `@andersmyrmel/vard` |

---

## Quick start

1. **Prerequisites**: Node.js **24.x LTS** (matches `package.json` `engines`; optional root **`.nvmrc`** for `nvm` / `fnm`).

   ```bash
   npm install
   cp .env.example .env.local
   ```

2. **Environment**: Set `MONGODB_URI`, `OPENROUTER_API_KEY`, `LLAMA_CLOUD_API_KEY`, etc. See [`SETUP_GUIDE`](docs/en/SETUP_GUIDE.md).

   > **Tip**: Default chat goes through Gemini (via OpenRouter). If requests fail, try a **VPN**.

3. **Vector index**: Create the Atlas index from [`scripts/vector-index.json`](scripts/vector-index.json) — [`MONGODB_VECTOR_SETUP`](docs/en/MONGODB_VECTOR_SETUP.md).

   ```bash
   npm run dev
   ```

---

<div align="center">

**John Mak** · *Last updated: 2026-03-26*

</div>
