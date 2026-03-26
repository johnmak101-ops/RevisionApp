**🌐 Language / 語言：** **English** | [中文](README.md)

# Revision App

**Personal portfolio** — **BA / product artefacts** (scope, discovery, use cases, user stories, traceability, test plan, UAT gate) and **full-stack implementation** are my own work; see the documentation table below.

> Bootcamp study-revision app for **solo revision efficiency**: PDF/Markdown upload, RAG chat, auto quiz, knowledge gaps, AI summaries. Next.js 16, MongoDB Atlas, OpenRouter, Vercel.

**Demo**: No public hosted URL—**deploy it yourself** using the **Quick start** section below. UI preview: **Screenshots** section.

**Business context, pain points, KPIs, MVP / out of scope / UAT gate** → [`docs/en/PRODUCT_SCOPE.md`](docs/en/PRODUCT_SCOPE.md)  
**Discovery, prioritization, ~50% time hypothesis (one-pager)** → [`docs/en/DISCOVERY_AND_PRIORITIZATION.md`](docs/en/DISCOVERY_AND_PRIORITIZATION.md)  
**Use cases, actors, protections** → [`docs/en/USE_CASES.md`](docs/en/USE_CASES.md) · [`docs/SEQUENCE_DIAGRAMS.md`](docs/SEQUENCE_DIAGRAMS.md)  
**Security architecture (Vard, chunk guard, rate limits)** → [`docs/en/ARCHITECTURE.md`](docs/en/ARCHITECTURE.md)

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

| Audience | Links |
|----------|-------|
| **Product / BA** | [PRODUCT_SCOPE](docs/en/PRODUCT_SCOPE.md) · [DISCOVERY / prioritization](docs/en/DISCOVERY_AND_PRIORITIZATION.md) · [USE_CASES](docs/en/USE_CASES.md) · [USER_STORIES](docs/en/USER_STORIES.md) · [TRACEABILITY_MATRIX](docs/en/TRACEABILITY_MATRIX.md) · [TEST_PLAN](docs/en/TEST_PLAN.md) · [NFR](docs/en/NON_FUNCTIONAL_REQUIREMENTS.md) |
| **Engineering** | [DEVELOPER_GUIDE](docs/en/DEVELOPER_GUIDE.md) · [SETUP_GUIDE](docs/en/SETUP_GUIDE.md) · [ARCHITECTURE](docs/en/ARCHITECTURE.md) · [API_REFERENCE](docs/en/API_REFERENCE.md) · [SEQUENCE_DIAGRAMS](docs/SEQUENCE_DIAGRAMS.md) · [UI_FLOW_DIAGRAM](docs/en/UI_FLOW_DIAGRAM.md) · [MONGODB_VECTOR_SETUP](docs/en/MONGODB_VECTOR_SETUP.md) · [GLOSSARY](docs/en/GLOSSARY.md) |
| **Quality** | [DEFINITION_OF_DONE](docs/en/DEFINITION_OF_DONE.md) |
| **中文** | [README.md](README.md) · Chinese files under `docs/` (same filenames as `docs/en/`) |

---

## Screenshots

Captured from a local / self-hosted run (Chat, Quiz, Summary tabs).

| Chat | Quiz | Summary |
|:----:|:----:|:-------:|
| ![Chat](docs/screenshots/screenshot-chat.png) | ![Quiz](docs/screenshots/screenshot-quiz.png) | ![Summary](docs/screenshots/screenshot-summary.png) |

---

## Tech stack (summary)

Next.js **16** (Turbopack) · **Node.js 24** (`package.json` `engines.node`: `>=24.0.0`; dev types `@types/node` ^24) · MongoDB Atlas Vector Search · OpenRouter (`gemini-2.5-flash-lite` chat + `qwen/qwen3-embedding-4b` embeddings; **Gemini may need a VPN** on some networks) · LlamaParse · `@andersmyrmel/vard`

---

## Quick start

**Prerequisite**: Node.js **24.x LTS** (matches `package.json` `engines`; optional root **`.nvmrc`** for `nvm` / `fnm`).

```bash
npm install
cp .env.example .env.local
```

Set `MONGODB_URI`, `OPENROUTER_API_KEY`, `LLAMA_CLOUD_API_KEY`, etc. ([SETUP_GUIDE](docs/en/SETUP_GUIDE.md)). Default chat uses Gemini via OpenRouter—**you may need a VPN** on some networks.

Create the Atlas vector index from [`scripts/vector-index.json`](scripts/vector-index.json) — [MONGODB_VECTOR_SETUP](docs/en/MONGODB_VECTOR_SETUP.md).

```bash
npm run dev
```

---

Created by **John Mak**  
*Last updated: 2026-03-26*
