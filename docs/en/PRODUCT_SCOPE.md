# Product Scope & Assumptions (for BA / PO / Stakeholders)

> **Purpose**: Clarify **why we build, for whom, how we measure success, what we ship, what we assume, what we exclude**, and **minimum UAT / go-live checks**—without implementation detail—so expectations and contracts stay aligned.  
> **Implementation & APIs**: use `USE_CASES.md`, `API_REFERENCE.md`, `ARCHITECTURE.md`.

---

## 1. Product vision & positioning

**Revision App** is a **web revision tool** for Bootcamp / intensive-course learners: after uploading notes and slides, learners can **chat (RAG)** against materials, run **quizzes**, review **knowledge gaps by topic**, and generate **outline summaries**—a loop of *ask, practice, and adjust*.

**Not an LMS replacement**: we do **not** cover full learning management (timetables, grade books, forums). The focus is **individual / small-group revision efficiency** and **AI-assisted understanding**, assuming source files (PDF / Markdown) already exist.

---

## 2. Target users & stakeholders (summary)

| Type | Notes |
|------|--------|
| **Primary users** | Learners who ingest large PDFs/notes and want one place to ask questions and self-test |
| **Secondary beneficiaries** | Instructors / TAs (same deployment for demos or feedback; **no** teacher-only dashboard in this version) |
| **Deployer / operator** | Whoever supplies MongoDB, OpenRouter, LlamaCloud, and hosting (e.g. Vercel) |

See [`STAKEHOLDER_MAP.md`](STAKEHOLDER_MAP.md) for the stakeholder diagram and extended notes.

---

## 3. Pain points & product response

| Pain | How the product helps (product level) |
|------|--------------------------------------|
| Information overload | After upload, **conversational Q&A** reduces manual file-hopping |
| Materials scattered across tools | **Index what you upload for this revision cycle** in one search/chat entry (scoped to uploaded content) |
| Unknown weak areas, little self-test | **Quiz + topic stats** highlight where answers were wrong |

Flows and alternate paths: [`USE_CASES.md`](USE_CASES.md).

---

## 4. Success metrics (KPIs)

These are **directional targets**; proving them needs surveys or sampled logs. **Technical tuning** (e.g. vector score thresholds) belongs in [`ARCHITECTURE.md`](ARCHITECTURE.md) / [`NON_FUNCTIONAL_REQUIREMENTS.md`](NON_FUNCTIONAL_REQUIREMENTS.md).

| KPI | Direction | Suggested measurement |
|-----|-----------|----------------------|
| Time to find / ask | Meaningful reduction vs manual file search | Small comparative study or survey |
| Perceived mastery / quiz performance | Improvement after repeated practice on the same doc | Trend from `GET /api/quiz/stats` (in-app attempts only) |
| Format coverage | Stable ingest for common course formats (PDF, Markdown) | UAT with real sample handouts |
| Answers “grounded” in materials | Users rate relevance / fewer off-topic replies | Sampled ratings; RAG filtering reduces hallucination risk |

---

## 5. MVP scope (this delivery)

| Capability | User value | Where to read more |
|------------|------------|-------------------|
| Upload PDF/Markdown + vector index | Materials available to RAG | UC-01, `USE_CASES.md` |
| Chat over materials (streaming) | Q&A revision | UC-02 |
| Auto MCQ, submit, scoring, explanations | Self-test | UC-03, UC-04 |
| Topic-level knowledge-gap stats | See weak areas | UC-05 |
| Outline-style summary per document (streaming) | Fast structural review | UC-06 |
| List indexed docs, delete one | Manage index, fix duplicate-name re-upload | UC-07, UC-09 |

**Included but not “gradebook” scope**: clearing quiz attempts (UC-08) helps demos and re-testing; it is **not** official transcript or enrollment management.

---

## 6. Product assumptions (unless agreed otherwise)

1. **Single scenario**: individual or small-group revision; **no** multi-tenant isolation or org-level billing in-app.  
2. **No login / no RBAC**: anyone who can open the deployed URL can upload and delete documents (same DB). **Not** sufficient for strict academic data segregation without an added auth layer.  
3. **External quotas**: OpenRouter, LlamaCloud, MongoDB Atlas are provided by the deployer; free tiers have limits.  
4. **Language**: UI and errors primarily **Traditional Chinese**; Chat follows the user’s input language (see `ARCHITECTURE` / system prompt).  
5. **Browsers**: latest two major versions of Chromium, Safari, Firefox; **no** IE support.  
6. **Content compliance**: uploaders own or are licensed to use materials; the product does **not** perform copyright review; sensitive data should **not** be uploaded to public deployments without extra compliance review.

---

## 7. Out of scope (not committed in this repo)

| Item | Note |
|------|------|
| Accounts, SSO, RBAC | Separate initiative / middleware |
| Document versioning, approval workflows | “Delete then re-upload” only |
| Offline / native apps | Web only |
| Automated SLA / 24×7 ops | Needs hosting & monitoring stack |
| Collaborative editing, real-time co-authoring, in-app class messaging | Not in this MVP |
| Question-bank import/export standards (e.g. QTI) | MCQs are primarily AI-generated on demand |
| Full regulatory certification (e.g. GDPR/FERPA sign-off) | Requires legal and infrastructure review |

---

## 8. Dependencies & operational risks (stakeholder view)

| Risk | User-visible impact | Mitigation (product / ops) |
|------|---------------------|----------------------------|
| AI / embedding API outage or throttling | Chat, quiz, summary fail or slow | Monitor error rates; key rotation; upgrade provider plan if needed |
| LlamaParse failure (poor scans, oversized files) | That PDF cannot be indexed | Ask for text PDF or split files; see ingest error messages |
| MongoDB Atlas or vector index misconfigured | Search anomalies or empty results | Deployment checklist: `MONGODB_VECTOR_SETUP.md` |
| No login: leaked URL ≈ full data access | Anyone may upload/delete | Use only on trusted networks or add auth; PO must accept before sign-off |

---

## 9. Minimum UAT / Go-Live Gate (recommended sign-off)

> Full steps: `TEST_PLAN.md`. Below is the **minimum bar** before calling the deployment “production-ready” for this product definition.

| # | Check | Pass criteria |
|---|--------|----------------|
| U1 | Upload | At least one PDF or MD ingests with `chunkCount` > 0 |
| U2 | Chat | On-topic question returns a coherent streamed answer |
| U3 | Quiz | Generate → answer all → submit → results show score + explanations |
| U4 | Knowledge gap | After submit, `GET /api/quiz/stats` behaves as specified (or empty state is acceptable) |
| U5 | Summary | Pick doc → outline streams and is readable |
| U6 | Delete doc | List updates; same filename can be ingested again (409 cleared) |
| U7 | Errors | Forced 400/409/empty file shows a clear user message (no blank UI) |

**Technical gate** (engineering): `npm run build`, `npm run lint`, `npm run test` pass (`DEFINITION_OF_DONE.md`).

---

## 10. How this doc relates to others

| You need… | See |
|-----------|-----|
| Flows and actors | `USE_CASES.md`, `USER_STORIES.md` |
| Requirements ↔ tests | `TRACEABILITY_MATRIX.md` |
| HTTP/JSON contracts | `API_REFERENCE.md` |
| Security and business-risk framing | `ARCHITECTURE.md` (security sections) |
| Dev environment & commands | `DEVELOPER_GUIDE.md`, `SETUP_GUIDE.md` |
| **How needs emerged & prioritization** (one-pager) | `DISCOVERY_AND_PRIORITIZATION.md` |

---

*Last updated: 2026-03-25*
