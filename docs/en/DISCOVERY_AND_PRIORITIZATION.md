# Discovery & prioritization (one-pager)

> **Why this project**: Course materials and notes are abundant and scattered; learners **struggle to find the right snippet quickly**. **AI-backed unified search, Q&A, and self-test** is intended to cut **search + first-pass revision time by about half (~50%)**—a **hypothesis to validate** (see `PRODUCT_SCOPE` KPIs / UAT), not a published research claim.

---

## 1. Problem observed (starting point)

| Symptom | Impact on revision |
|---------|-------------------|
| Many files and platforms | Time lost **opening the wrong file and re-searching** |
| High volume per course | **Hard to know where to start**, easy to stall |
| Little instant self-test | **Weak spots surface late**, costly to fix |

**In one line**: the pain is not “no materials,” but **getting the right passage at the right time**.

---

## 2. Product hypothesis (why AI)

- **Single entry**: For this revision cycle, **upload then index**; everything else builds on indexed content.
- **Q&A (RAG)**: Natural language **locates meaning**, less page-flipping.
- **Quiz + topic stats**: Output-driven **recall** and **weak-topic** signals.
- **Summary**: Outline **shortens “see the whole first.”**

**~50% time**: a **target / hypothesis**—validate with user tests or controlled comparisons; engineering quality (e.g. RAG thresholds) is in `ARCHITECTURE.md`.

---

## 3. Prioritization (why the MVP is ordered this way)

| Priority | Capability | Rationale |
|----------|------------|-----------|
| **P0** | Upload → index | No content, no downstream value |
| **P0** | RAG chat | Directly addresses “find answers faster” |
| **P0** | Quiz generate / submit / score | Closed-loop self-test, easy to demo |
| **P1** | Knowledge gap (by topic) | Builds on existing attempt data |
| **P1** | Summary | “Big picture”; can iterate in parallel with chat |
| **P0 / P1** | Doc list / delete | Ops: duplicate names, re-upload |

**Explicitly later** (aligned with `PRODUCT_SCOPE` out of scope): login, multi-tenant, question-bank import, co-editing—**not required to test the hypothesis first**.

---

## 4. Where this connects

| You need… | See |
|-----------|-----|
| Formal scope, assumptions, UAT | `PRODUCT_SCOPE.md` |
| Step-by-step flows and exceptions | `USE_CASES.md` |
| Acceptance wording | `USER_STORIES.md` |

---

*Last updated: 2026-03-25*
