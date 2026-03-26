# Product Scope & Assumptions (for BA / PO / Stakeholders)

> **Purpose**: In non-implementation language, spell out **why we build, for whom, how we measure success, what we ship, what we exclude, default premises**, and **minimum pre-go-live acceptance**—so expectations, contracts, and UAT stay aligned.  
> **Implementation & APIs**: use `USE_CASES.md`, `API_REFERENCE.md`, `ARCHITECTURE.md`.

---

## 1. Product vision & positioning

**Revision App** is a **web revision tool** for Bootcamp / intensive-course learners: after uploading handouts and notes, they can **chat (RAG)** against materials, run **quizzes**, see **knowledge gaps by topic**, and generate **outline summaries**—a closed loop of *ask while learning, practice while doing, review while improving*.

**Not a full LMS**: this product does **not** replace end-to-end learning management (timetables, grade books, forums). The focus is **solo revision efficiency**—helping **one learner** find, self-test, and review faster—plus **AI-assisted understanding**, given source files (PDF / Markdown) already exist.

---

## 2. Target users & stakeholders (summary)

| Type | Description |
|------|-------------|
| **Primary users** | Learners who must absorb large PDFs/notes and want one entry for Q&A and self-test |
| **Secondary beneficiaries** | Instructors / TAs (same deployment for demos or feedback; **no** teacher-only dashboard in this version) |
| **Deployer / operator** | Whoever provides MongoDB, OpenRouter, LlamaCloud accounts and hosting (e.g. Vercel) |

---

## 3. Pain points & mitigations

| Pain point | How we ease it (product level) |
|------------|--------------------------------|
| High volume, hard to digest | After upload, **conversational Q&A** on passages—less manual file-hopping |
| Materials spread across platforms | **Index files for this revision cycle** in one place (search/chat limited to uploaded content) |
| Unknown weak spots, little self-test | **Quiz + topic stats** show where answers were wrong, to plan the next pass |

Detailed flows and alternates: [`USE_CASES.md`](USE_CASES.md).

---

## 4. Success metrics (KPIs)

These are **suggested targets**; proving them needs user research or log sampling. **Technical thresholds** (e.g. vector similarity cutoffs) are engineering tuning—see [`ARCHITECTURE.md`](ARCHITECTURE.md) / [`NON_FUNCTIONAL_REQUIREMENTS.md`](NON_FUNCTIONAL_REQUIREMENTS.md).

| KPI | Direction | Suggested measurement |
|-----|-----------|------------------------|
| Retrieval / Q&A time | Meaningful reduction vs purely manual document search | Small comparative test or survey |
| Sense of mastery / quiz performance | Higher accuracy or completion after repeated practice on the same doc | Trend from `GET /api/quiz/stats` (in-app attempts only) |
| Format coverage | Reliable ingest for common course formats (PDF, Markdown) | UAT with real handout samples |
| Answers “grounded” in materials | Users rate “based on source / rarely off-topic” | Sampled scoring; RAG filtering reduces off-base answers |

---

## 5. MVP scope (Minimum Viable Product)

| Capability | User value | Where to read more |
|------------|------------|-------------------|
| Upload PDF/Markdown and build vector index | Materials available to RAG | UC-01, `USE_CASES.md` |
| Chat on materials (streaming) | Revision Q&A | UC-02 |
| Auto MCQ, submit, score, explanations | Self-test and reinforcement | UC-03, UC-04 |
| Topic-level knowledge-gap stats | See weak areas | UC-05 |
| Per-document outline summary (streaming) | Fast structural review | UC-06 |
| List indexed documents, delete one | Manage index, fix duplicate re-upload | UC-07, UC-09 |

**In scope but not “student information system”**: reset local quiz attempts (UC-08) for demos / re-testing—**not** official grade records or enrollment management.

---

## 6. Product assumptions

1. **Single use scenario**: **Solo revision** (one learner). Others may share the same deployed URL informally, but there is **no** class roster, groups, or collaboration feature set—design center stays **individual study efficiency**.  
2. **No login / no RBAC**: anyone who can open the deployed URL may upload or delete documents (one shared database view). **Not** suitable for strict academic data isolation unless you add authentication.  
3. **Connectivity & quotas**: OpenRouter (**paid** or other plans), LlamaCloud, and MongoDB Atlas are supplied by the deployer; each service still has **contract/plan** quotas and rate limits—behavior when exceeded follows the vendor.  
4. **Language**: UI and errors mainly **Traditional Chinese**; Chat follows the user’s input language (see `ARCHITECTURE` / system prompt).  
5. **Browsers**: latest two major versions of Chromium, Safari, Firefox; **no** IE.  
6. **Content compliance**: uploaders own or are licensed to use the materials; the product does **not** perform copyright review; sensitive data should **not** be uploaded to public deployments without additional compliance review.

---

## 7. Out of scope

| Item | Note |
|------|------|
| Account signup, SSO, RBAC | Separate project or middleware |
| Document version history, approval flows | Only “delete then re-upload” |
| Offline use, native apps | Web only |
| Automated SLA / 24×7 ops | Needs separate hosting and monitoring |
| Collaborative editing, real-time co-authoring, in-app class messaging | Not in this MVP |
| Question-bank import/export standards | Questions are primarily AI-generated on demand |

---

## 8. Dependencies & operational risks (for stakeholders)

| Risk | Possible user impact | Mitigation (product / ops) |
|------|----------------------|----------------------------|
| External AI / embedding API outage or throttling | Chat, quiz, summary fail or slow | Monitor error rates; API key rotation; upgrade provider plan if needed |
| LlamaParse failure (poor scans, oversized file) | That PDF cannot be indexed | Ask for text-based PDF or split file; see ingest error copy |
| MongoDB Atlas or vector index not ready | Search oddities or empty results | Deployment checklist: `MONGODB_VECTOR_SETUP.md` |
| No login: a leaked URL ≈ database exposure | Anyone may upload/delete uploaded content | **Trusted networks / localhost only** |

---

## 9. Minimum UAT / go-live gate (run before sign-off)

> Full steps: `TEST_PLAN.md`. This is the **minimum bar**—do not call the deployment “production-ready” without passing it.

| # | Check | Pass criteria |
|---|--------|----------------|
| U1 | Upload | At least one PDF or MD ingests successfully with `chunkCount` > 0 |
| U2 | Chat | A relevant question on the same doc gets a coherent answer (stream completes) |
| U3 | Quiz | Generate → answer all → submit → results show score and explanations |
| U4 | Knowledge gap | After submit, `GET /api/quiz/stats` aggregates sensibly (or empty state is acceptable) |
| U5 | Summary | Pick a doc → outline streams and is readable |
| U6 | Delete document | List updates; same filename can be ingested again (409 cleared) |
| U7 | Error UX | Forced 400/409/empty file shows a clear message (no blank screen) |

**Technical gate** (engineering): `npm run build`, `npm run lint`, and `npm run test` pass (`DEFINITION_OF_DONE.md`).

---

## 10. How this doc relates to others

| You need… | See |
|-----------|-----|
| Flows and actors | `USE_CASES.md`, `USER_STORIES.md` |
| Requirements ↔ tests | `TRACEABILITY_MATRIX.md` |
| HTTP/JSON contracts | `API_REFERENCE.md` |
| Security and business-risk narrative | `ARCHITECTURE.md` (security sections) |
| Dev environment & commands | `DEVELOPER_GUIDE.md`, `SETUP_GUIDE.md` |
| **How needs emerged & prioritization** (one-pager) | `DISCOVERY_AND_PRIORITIZATION.md` |

---

*Last updated: 2026-03-26*
