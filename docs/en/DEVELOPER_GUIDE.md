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
| Discovery narrative and prioritization (one-pager) | `DISCOVERY_AND_PRIORITIZATION.md` |
| Terms | `GLOSSARY.md` |

**Full doc hub (GitHub)**: root [`README.en.md`](../README.en.md) (English); [`README.md`](../README.md) (Chinese).

---

## 2. Runtime Matrix

| Item | Recommended / actual |
|------|----------------------|
| **Node.js** | **24.x LTS** (match [nodejs.org](https://nodejs.org/) current LTS, e.g. **v24.14.x**); `package.json` `engines.node`: **`>=24.0.0`** |
| **Types (dev)** | `@types/node` **^24** (aligned with runtime) |
| **Version pin (optional)** | Root **`.nvmrc`**: `24` (`nvm` / `fnm`) |
| **npm** | ≥ 9.x |
| **Install** | `npm install` |
| **Dev server** | `npm run dev` (Next.js **Turbopack**) |
| **Lint** | `npm run lint` = **`tsc --noEmit` + `eslint .`** (Next.js 16 CLI has **no** `next lint`) |
| **Tests** | `npm run test` (Vitest); `npm run test:unit` (`src/lib/`); `npm run test:e2e` (`src/app/api/`); API tests under `src/app/api/__tests__/` |
| **Build** | `npm run build` |

---

## 3. Environment Variables

| Variable | Role |
|----------|------|
| `MONGODB_URI` | Atlas connection string |
| `OPENROUTER_API_KEY` | Chat / Quiz / Summary / tool LLM |
| `OPENROUTER_MODEL` | Primary chat model |
| `OPENROUTER_EMBED_MODEL` | Embeddings (dims must match vector index) |
| `LLAMA_CLOUD_API_KEY` | LlamaParse (PDF); same name as `.env.example` |

See `.env.example` and `SETUP_GUIDE.md`.

---

## 4. Observability & Troubleshooting (server log prefixes)

Backend uses `console.info` / `warn` / `error`. Prefixes below match **literal strings in `src/`** (handy for grep):

| Prefix | Meaning |
|--------|---------|
| `[Embeddings]` | OpenRouter embedding warmup / calls; missing-key warnings use `⚠️` |
| `[LlamaParse]` | PDF cloud parse progress (`src/lib/pdf.ts`) |
| `[Search]` | Zero vector hits after filtering; `$vectorSearch` aggregate failure (then keyword fallback) |
| `[MultiQuery]` | Sub-query generation / merged count; generation failure logs `warn` and falls back to the original question only |
| `[Chat]` | Chat retrieval errors when `multiQuerySearch` throws |
| `[PromptGuard] Injection detected:` | User message blocked by Vard (`guardUserMessage`) |
| `[ChunkGuard] Flagged chunk #…` | Ingest chunk flagged (`guardChunkContent`) |
| `[Quiz]` | `generate` / `submit` / `stats` / reset errors; `generate` may log `LLM returned invalid JSON` |
| `[Summary]`, `[Documents]` | Matching route errors |
| `Parse error:`, `Ingest error:` | `ingest/route.ts` parse or top-level failure |

Client-visible errors: usually JSON `{ "error": "..." }` or streaming text; see `API_REFERENCE.md` (common status codes).

---

## 5. Key Source Entry Points

| Path | Role |
|------|------|
| `src/app/api/**/route.ts` | HTTP handlers |
| `src/lib/search.ts` | Vector search, multi-query, score thresholds |
| `src/lib/embedding.ts` | OpenRouter embeddings |
| `src/lib/promptGuard.ts` | Vard, `guardUserMessage`, `guardChunkContent`, `guardDocumentId` |
| `src/lib/llm.ts` | Shared `streamingLLM`, `toolLLM` (Quiz/Summary routes use their own `ChatOpenAI` instances) |
| `src/lib/rateLimiter.ts` | Per-IP sliding-window limits (chat / quiz / summary) |
| `src/models/*.ts` | Mongoose schemas |

---

*Last updated: 2026-03-26*
