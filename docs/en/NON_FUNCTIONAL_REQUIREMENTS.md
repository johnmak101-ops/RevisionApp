# Non-Functional Requirements (NFR)

---

## NFR-01: Performance

| ID | Requirement | Target | Current |
|----|-------------|--------|---------|
| NFR-01.1 | File upload processing time | ≤ 30s (normal PDF) | Depends on file size and OpenRouter speed |
| NFR-01.2 | Chat first token latency | ≤ 3s | Includes vector search + LLM response |
| NFR-01.3 | Quiz generation time | ≤ 10s (5 questions) | Depends on LLM response speed |
| NFR-01.4 | Page initial load | ≤ 2s | Next.js Turbopack |
| NFR-01.5 | Embedding batch size | 20/batch | Aligns with OpenRouter rate limit |

---

## NFR-02: Availability

| ID | Requirement | Description |
|----|-------------|-------------|
| NFR-02.1 | Degradation strategy | Keyword fallback when vector search fails |
| NFR-02.2 | Connection reuse | MongoDB uses cached connection (global cache in dev to prevent HMR duplicates) |
| NFR-02.3 | Warmup | Embedding pre-warm at startup, detects dimensions |
| NFR-02.4 | Retry | Chat / Quiz / Summary LLM retry up to 2 times (`maxRetries: 2`); toolLLM (multi-query) retries 1 time (`maxRetries: 1`) |

---

## NFR-03: Security

| ID | Requirement | Description |
|----|-------------|-------------|
| NFR-03.1 | API Key protection | All secrets stored only in `.env.local`, not committed |
| NFR-03.2 | Input validation | File format, size, and parameter ranges are all validated |
| NFR-03.3 | Quiz anti-cheat | `correctIndex` and `explanation` hidden during generation |
| NFR-03.4 | Duplicate submission | Quiz can only be submitted once (409 protection) |
| NFR-03.5 | MongoDB URI | Prevents quote injection (auto-strips quotes) |

---

## NFR-04: Data Limits

| ID | Requirement | Limit |
|----|-------------|-------|
| NFR-04.1 | File size limit | 100MB |
| NFR-04.2 | Chunk size | 512 chars (overlap 100) |
| NFR-04.3 | Quiz question range | 3-15 |
| NFR-04.4 | Chat history length | Most recent 10 messages |
| NFR-04.5 | Vector candidates | 50 candidates → 4/sub-query × up to 3 (LLM-generated) → top 8 (multiQuery) |
| NFR-04.6 | Score threshold | Vector: `search.ts` drops raw cosine < **0.60**; Chat context: `chat/route.ts` keeps only normalized ≥ **0.40** |
| NFR-04.7 | Quiz context | 12,000 chars |
| NFR-04.8 | Summary context | 20,000 chars |
| NFR-04.9 | Min chunk length | 20 chars (shorter chunks are discarded) |
| NFR-04.10 | MongoDB storage | 512MB (M0 free tier) |

---

## NFR-05: Maintainability

| ID | Requirement | Description |
|----|-------------|-------------|
| NFR-05.1 | TypeScript strict mode | Project-wide strict type checking |
| NFR-05.2 | Centralized constants | Chunk size, batch size in `lib/`; context limits (12k / 20k) defined per-route |
| NFR-05.3 | Modular design | `lib/` modules have clear responsibilities (embedding, search, chunking separated) |
| NFR-05.4 | Cached / Shared instances | DB uses module-level cached connection (global cache in dev to prevent HMR duplicates); `lib/llm.ts` shares chat/tool LLM; quiz and summary have own module-scoped LLM (different temperature/config) |

---

## NFR-06: Scalability

| ID | Requirement | Description |
|----|-------------|-------------|
| NFR-06.1 | Swappable models | Switch LLM via `OPENROUTER_MODEL` env variable |
| NFR-06.2 | Swappable embedding | Switch via `OPENROUTER_EMBED_MODEL` env variable |
| NFR-06.3 | Adaptive vector dimensions | Warmup auto-detects dimensions, not hardcoded |
| NFR-06.4 | Extensible file formats | Currently supports PDF + Markdown, architecture allows adding more formats |

---

*Last updated: 2026-03-25*
