# Definition of Done (DoD)

## General DoD

All Features / User Stories / Bug Fixes must satisfy the following conditions before being marked as "Done":

### Code Quality

- [ ] TypeScript strict mode with no compilation errors
- [ ] `npm run build` passes successfully
- [ ] `npm run lint` has no errors (warnings are acceptable)
- [ ] No hardcoded secrets (API keys etc. must use env variables)
- [ ] Proper error handling (try/catch + user-friendly error messages)
- [ ] Defensive coding: assume data may be missing, APIs may fail

### Functional Verification

- [ ] Happy path manually tested and passing
- [ ] All alternative flows (edge cases) manually verified
- [ ] Works correctly in dev environment (`npm run dev`)
- [ ] No console errors/warnings (business logic related)

### User Experience

- [ ] Loading states have clear indicators (button disabled, spinner)
- [ ] Error messages in user language (Chinese / English based on context)
- [ ] Responsive design (desktop + mobile basic layout)

### Documentation

- [ ] New features have updated README (if applicable)
- [ ] API endpoints documented in `docs/API_REFERENCE.md`
- [ ] Meaningful Git commit messages

---

## Module-Specific DoD

### File Upload (Ingest)

| Verification Item | Status |
|-------------------|--------|
| PDF upload + text extraction successful | ✅ |
| Markdown upload + parsing successful | ✅ |
| Empty file shows error prompt | ✅ |
| Large file (>100MB) shows error prompt | ✅ |
| Duplicate filename dedup (409) | ✅ |
| Corrupted PDF shows error prompt | ✅ |
| Chunks split properly (512 chars, 100 overlap) | ✅ |
| Embedding batch processing successful (batch 20) | ✅ |
| Document + Chunk records stored correctly | ✅ |

### RAG Chat

| Verification Item | Status |
|-------------------|--------|
| Streaming token-by-token response | ✅ |
| Vector search correctly retrieves relevant chunks | ✅ |
| Score < 0.4 results filtered out | ✅ |
| Keyword fallback working properly | ✅ |
| Prompt message when no results found | ✅ |
| 10 history messages correctly injected as context | ✅ |
| Answers based on document content, not general knowledge | ✅ |
| Language automatically matches user input | ✅ |

### Quiz

| Verification Item | Status |
|-------------------|--------|
| Generates 1-15 MCQ questions | ✅ |
| Each question has 4 options + topic + explanation | ✅ |
| Invalid questions filtered out | ✅ |
| Correct answers hidden during answering | ✅ |
| All questions must be answered before submission | ✅ |
| Same quiz cannot be submitted twice (409) | ✅ |
| Score calculation correct | ✅ |
| Post-submission shows detailed results per question | ✅ |
| Score level feedback text correct | ✅ |

### Knowledge Gap

| Verification Item | Status |
|-------------------|--------|
| Grouped by topic statistics | ✅ |
| Weak topics sorted first (ascending accuracy) | ✅ |
| Overall statistics correct | ✅ |
| Empty state shown when no submitted quizzes | ✅ |

### Summary

| Verification Item | Status |
|-------------------|--------|
| Streaming progressive generation | ✅ |
| Structured Markdown format | ✅ |
| Language matches source document | ✅ |
| Context limit 20,000 chars | ✅ |

---

*Last updated: 2026-03-17*
