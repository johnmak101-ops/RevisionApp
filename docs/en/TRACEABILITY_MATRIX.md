# Requirements Traceability Matrix

> **Purpose**: Ensure every requirement has corresponding implementation, testing, and verification with no gaps.

---

## 1. Use Case ↔ User Story ↔ Test Case Mapping

| Use Case | User Story | Test Case(s) | API Endpoint | UI Component | Status |
|----------|-----------|--------------|--------------|-------------|--------|
| UC-01 Upload PDF | US-1.1 | TC-01, TC-03, TC-04, TC-05, TC-06, TC-07 | `POST /api/ingest` | `FileUpload` | ✅ Implemented |
| UC-01 Upload MD | US-1.2 | TC-02 | `POST /api/ingest` | `FileUpload` | ✅ Implemented |
| UC-02 RAG Chat | US-2.1, US-2.2 | TC-10, TC-11, TC-12, TC-13 | `POST /api/chat` | `ChatBox` | ✅ Implemented |
| UC-03 Quiz Generation | US-3.1 | TC-14, TC-15, TC-16 | `POST /api/quiz/generate` | `QuizPanel` | ✅ Implemented |
| UC-04 Quiz Submission | US-3.2 | TC-17, TC-18, TC-19 | `POST /api/quiz/submit` | `QuizPanel` | ✅ Implemented |
| UC-05 Knowledge Gap | US-3.3 | TC-20, TC-21 | `GET /api/quiz/stats` | `KnowledgeGap` | ✅ Implemented |
| UC-06 Summary | US-4.1 | TC-22, TC-23 | `POST /api/summary/generate` | `SummaryPanel` | ✅ Implemented |
| UC-07 Document List | US-1.3 | TC-08, TC-09 | `GET /api/documents` | `FileUpload`(dropdown) | ✅ Implemented |

---

## 2. User Story ↔ Acceptance Criteria ↔ Test Case Detail

### Epic 1: Document Management

| User Story | Acceptance Criteria | Test Case | Coverage |
|-----------|-------------------|-----------|----------|
| US-1.1 Upload PDF | Supports `.pdf` format | TC-01 | ✅ |
| | Auto extract, split, embed, store | TC-01 | ✅ |
| | Shows success message (with chunk count) | TC-01 | ✅ |
| | Duplicate filename returns 409 | TC-06 | ✅ |
| | Empty/corrupted file shows clear error | TC-04, TC-07 | ✅ |
| | File size limit 100MB | TC-05 | ✅ |
| US-1.2 Upload MD | Supports `.md`, `.markdown` formats | TC-02 | ✅ |
| | Processing flow same as PDF | TC-02 | ✅ |
| US-1.3 View Documents | Shows filename, chunk count, upload time | TC-08 | ✅ |
| | Sorted by upload time descending | TC-08 | ✅ |

### Epic 2: RAG Chat

| User Story | Acceptance Criteria | Test Case | Coverage |
|-----------|-------------------|-----------|----------|
| US-2.1 Chat Review | Only answers based on uploaded documents | TC-10 | ✅ |
| | Response language matches input | TC-10 | ✅ |
| | Streaming token-by-token display | TC-10, TC-NF-02 | ✅ |
| | Retains most recent 10 conversation history | TC-13 | ✅ |
| US-2.2 Search Tolerance | Keyword fallback on vector search failure | TC-11 | ✅ |
| | Clear prompt when no relevant results | TC-11 | ✅ |

### Epic 3: Quiz Practice

| User Story | Acceptance Criteria | Test Case | Coverage |
|-----------|-------------------|-----------|----------|
| US-3.1 Auto Generation | Can select target document | TC-14 | ✅ |
| | Question count 1-15 | TC-16 | ✅ |
| | Each question has 4 options | TC-14 | ✅ |
| | Each question tagged with topic + explanation | TC-14 | ✅ |
| | Tests comprehension | TC-14 *(manual check)* | ⚠️ |
| | Correct answers hidden during answering | TC-14 | ✅ |
| US-3.2 Submit & Score | Must answer all before submitting | TC-17 | ✅ |
| | Shows score, percentage | TC-17 | ✅ |
| | Each question shows correct answer, user answer, explanation | TC-17 | ✅ |
| | Each question labeled with topic | TC-17 | ✅ |
| | Same quiz can only be submitted once | TC-18 | ✅ |
| US-3.3 Knowledge Gap | Accuracy displayed grouped by topic | TC-20 | ✅ |
| | Weak topics sorted first | TC-20 | ✅ |
| | Shows overall statistics | TC-20 | ✅ |

### Epic 4: Summary

| User Story | Acceptance Criteria | Test Case | Coverage |
|-----------|-------------------|-----------|----------|
| US-4.1 Study Outline | Can select target document | TC-22 | ✅ |
| | Structured Markdown (chapters, key points, definitions) | TC-22 | ✅ |
| | 🔑 Marks key knowledge points | TC-22 *(manual check)* | ⚠️ |
| | Streaming progressive display | TC-22, TC-NF-02 | ✅ |
| | Language matches source document | TC-22 *(manual check)* | ⚠️ |

---

## 3. Coverage Statistics

### By Use Case

| Use Case | Test Cases | Coverage |
|----------|-----------|----------|
| UC-01 | 6 | ✅ 100% |
| UC-02 | 4 | ✅ 100% |
| UC-03 | 3 | ✅ 100% |
| UC-04 | 3 | ✅ 100% |
| UC-05 | 2 | ✅ 100% |
| UC-06 | 2 | ✅ 100% |
| UC-07 | 2 | ✅ 100% |

### By User Story

| Metric | Value |
|--------|-------|
| Total Acceptance Criteria | 31 |
| Automatable test coverage | 28 (90%) |
| Requires manual verification | 3 (10%) |
| Not covered | 0 (0%) |

### By API Endpoint

| Endpoint | Test Cases | Happy Path | Error Handling |
|----------|-----------|------------|----------------|
| `POST /api/ingest` | 6 | TC-01, TC-02 | TC-03, TC-04, TC-05, TC-06, TC-07 |
| `GET /api/documents` | 2 | TC-08 | TC-09 |
| `POST /api/chat` | 4 | TC-10, TC-13 | TC-11, TC-12 |
| `POST /api/quiz/generate` | 3 | TC-14, TC-16 | TC-15 |
| `POST /api/quiz/submit` | 3 | TC-17 | TC-18, TC-19 |
| `GET /api/quiz/stats` | 2 | TC-20 | TC-21 |
| `POST /api/summary/generate` | 2 | TC-22 | TC-23 |

---

## 4. Items Requiring Manual Verification

The following Acceptance Criteria involve AI generation quality and are difficult to automate, requiring manual review:

| ID | Item | Reason |
|----|------|--------|
| ⚠️ AC-3.1.5 | Quiz tests comprehension vs. rote memorization | LLM output quality is subjective |
| ⚠️ AC-4.1.3 | Summary 🔑 marks key knowledge points | Requires domain expert verification |
| ⚠️ AC-4.1.5 | Summary language matches source document | Multi-language prompt behavior is unstable |

---

## 5. Traceability Matrix Diagram

```mermaid
graph LR
    subgraph Use Cases
        UC1["UC-01 Upload"]
        UC2["UC-02 Chat"]
        UC3["UC-03 Quiz Gen"]
        UC4["UC-04 Quiz Submit"]
        UC5["UC-05 Knowledge Gap"]
        UC6["UC-06 Summary"]
        UC7["UC-07 Doc List"]
    end
    
    subgraph User Stories
        US11["US-1.1"]
        US12["US-1.2"]
        US13["US-1.3"]
        US21["US-2.1"]
        US22["US-2.2"]
        US31["US-3.1"]
        US32["US-3.2"]
        US33["US-3.3"]
        US41["US-4.1"]
    end
    
    subgraph Test Cases
        TC01["TC-01~07"]
        TC08["TC-08~09"]
        TC10["TC-10~13"]
        TC14["TC-14~16"]
        TC17["TC-17~19"]
        TC20["TC-20~21"]
        TC22["TC-22~23"]
    end
    
    UC1 --> US11
    UC1 --> US12
    UC7 --> US13
    UC2 --> US21
    UC2 --> US22
    UC3 --> US31
    UC4 --> US32
    UC5 --> US33
    UC6 --> US41
    
    US11 --> TC01
    US12 --> TC01
    US13 --> TC08
    US21 --> TC10
    US22 --> TC10
    US31 --> TC14
    US32 --> TC17
    US33 --> TC20
    US41 --> TC22
```

---

*Last updated: 2026-03-17*
