# Developer Guide (Technical)

> **Purpose**: Help new contributors and maintainers **find the right doc**, **match the runtime**, and **debug from logs** within minutes.

---

## 1. Documentation Map

| You need… | Open |
|-----------|------|
| REST paths, status codes, payload examples | `API_REFERENCE.md` |
| Folder layout, module roles, security, design decisions | `ARCHITECTURE.md` |
| Request/response timing between pieces | `SEQUENCE_DIAGRAMS.md` |
| Screen-level flows (Mermaid) | `UI_FLOW_DIAGRAM.md` |
| Actors, preconditions, main/alternate flows (requirements tone) | `USE_CASES.md` |
| Acceptance-style stories | `USER_STORIES.md` |
| Test IDs and coverage | `TEST_PLAN.md`, `TRACEABILITY_MATRIX.md` |
| Atlas vector index JSON | `MONGODB_VECTOR_SETUP.md`, `scripts/vector-index.json` |
| Local env and startup | `SETUP_GUIDE.md` |
| Product boundaries, assumptions, minimum UAT (BA-oriented) | `PRODUCT_SCOPE.md` |
| Terms | `GLOSSARY.md` |

**Full doc hub (GitHub)**: root [`README.en.md`](../README.en.md) (English); [`README.md`](../README.md) (Chinese).

---

## 2. Runtime Matrix

| Item | Recommended / actual |
|------|----------------------|
| **Node.js** | **20.x LTS** (recommended for Next.js 16; see `package.json` `engines`) |
| **npm** | ≥ 9.x |
| **Install** | `npm install` |
| **Lint** | `npm run lint` = **`tsc --noEmit` + `eslint .`** (Next.js 16 CLI has **no** `next lint`) |
| **Tests** | `npm run test` (Vitest); API tests under `src/app/api/__tests__/` |
| **Build** | `npm run build` |

---

## 3. Environment Variables

| Variable | Role |
|----------|------|
| `MONGODB_URI` | Atlas connection string |
| `OPENROUTER_API_KEY` | Chat / Quiz / Summary / tool LLM |
| `OPENROUTER_MODEL` | Primary chat model |
| `OPENROUTER_EMBED_MODEL` | Embeddings (dims must match vector index) |
| `LLAMA_CLOUD_API_KEY` | LlamaParse (PDF) |

See `.env.example` and `SETUP_GUIDE.md`.

---

## 4. Observability & Troubleshooting (server log prefixes)

| Prefix | Meaning |
|--------|---------|
| `[Embeddings]` | OpenRouter embedding warmup / calls |
| `[LlamaParse]` | PDF cloud parse progress |
| `[Search]`, `[MultiQuery]` | Vector search and sub-queries |
| `[Chat]` | Chat retrieval errors |
| `[PromptGuard]` | User-message injection detection |
| `[ChunkGuard]` | Ingest-time chunk flagged |
| `[Quiz]`, `[Summary]`, `[Documents]` | Route-level errors |
| `Parse error:`, `Ingest error:` | Ingest parse or top-level failure |

Client-visible errors: usually JSON `{ "error": "..." }` or streaming text; see `API_REFERENCE.md` (common status codes).

---

## 5. Key Source Entry Points

| Path | Role |
|------|------|
| `src/app/api/**/route.ts` | HTTP handlers |
| `src/lib/search.ts` | Vector search, multi-query, score thresholds |
| `src/lib/embedding.ts` | OpenRouter embeddings |
| `src/lib/promptGuard.ts` | Vard + chunk guard |
| `src/models/*.ts` | Mongoose schemas |

---

*Last updated: 2026-03-25*
