# User Stories

## Epic 1: Document Management

### US-1.1 Upload PDF Document

> **As a** bootcamp student
> **I want to** upload a course PDF document
> **So that** the system can index its content for AI use

**Acceptance Criteria**:
- [ ] Supports `.pdf` format
- [ ] Automatically extracts text, splits, embeds, and stores after upload
- [ ] Displays success message with chunk count
- [ ] Duplicate filenames cannot be re-uploaded (409 error); delete from **Indexed documents** first (see US-1.4)
- [ ] Empty or corrupted files show clear error messages
- [ ] File size limit: 100MB

**Negative Paths**:
- [ ] If the PDF contains mostly non-text content (e.g. pure images, scanned pages), the system processes it via LlamaParse OCR + custom `parsing_instruction` but must notify the user "Some content may not have been indexed" when chunk count is significantly low
- [ ] If the LlamaParse API daily quota is exhausted, return a specific error message (not a generic 500 error)

### US-1.2 Upload Markdown Document

> **As a** bootcamp student
> **I want to** upload Markdown-format notes
> **So that** the system can index my personal notes

**Acceptance Criteria**:
- [ ] Supports `.md`, `.markdown` formats
- [ ] Processing flow identical to PDF

### US-1.3 View Uploaded Documents

> **As a** bootcamp student
> **I want to** view a list of uploaded documents
> **So that** I know which materials are available

**Acceptance Criteria**:
- [ ] Displays filename, chunk count, upload time (from API; home **Indexed documents** shows filename + chunk count)
- [ ] Sorted by upload time in descending order

### US-1.4 Delete Indexed Document

> **As a** bootcamp student
> **I want to** remove an indexed document I no longer need
> **So that** I can free the index or re-upload a file with the same name

**Acceptance Criteria**:
- [ ] Home **Indexed documents** supports per-file delete (after confirmation)
- [ ] Calls `DELETE /api/documents/[id]`, removing chunks and related quiz attempts
- [ ] Document list and Quiz/Summary selectors stay in sync (shared `documents` cache)

---

## Epic 2: RAG Chat

### US-2.1 Conversational Revision

> **As a** bootcamp student
> **I want to** ask course-related questions in natural language
> **So that** AI answers based on my uploaded materials

**Acceptance Criteria**:
- [ ] Answers based only on uploaded document content, not general knowledge
- [ ] Response language matches user input language
- [ ] Streaming token-by-token display
- [ ] Retains last 10 conversation messages as context

**Negative Paths**:
- [ ] When AI cannot find an answer within the documents, it must honestly respond "This topic is not covered in the uploaded materials" rather than guessing (Hallucination Control)
- [ ] Two-stage filtering: `search.ts` drops raw cosine < 0.60; after normalization `chat/route.ts` drops normalized < 0.40 — those must not be used as answer context

### US-2.2 Search Fault Tolerance

> **As a** student
> **I want to** get results even when vector search fails
> **So that** technical issues don't leave me with no response

**Acceptance Criteria**:
- [ ] Falls back to keyword search when vector search fails
- [ ] Shows clear prompt to upload documents when no relevant results found

---

## Epic 3: Quiz Practice

### US-3.1 Auto Quiz Generation

> **As a** bootcamp student
> **I want to** have AI auto-generate MCQ questions from course materials
> **So that** I can test my understanding

**Acceptance Criteria**:
- [ ] Can select target document
- [ ] Can set question count (3-15)
- [ ] Each question has 4 options
- [ ] Each question tagged with topic and explanation
- [ ] Questions test comprehension, not rote memorization
- [ ] Correct answers hidden during answering

### US-3.2 Submit and Score

> **As a** bootcamp student
> **I want to** submit answers and see results immediately
> **So that** I know which questions I got right or wrong

**Acceptance Criteria**:
- [ ] Must complete all questions before submitting
- [ ] Displays score and percentage
- [ ] Each question shows correct answer, my answer, and explanation
- [ ] Each question labeled with topic
- [ ] Same quiz can only be submitted once

### US-3.3 Knowledge Gap Analysis

> **As a** bootcamp student
> **I want to** automatically analyze my weak topics
> **So that** I know which areas need reinforcement

**Acceptance Criteria**:
- [ ] Displays accuracy rate grouped by topic
- [ ] Weak topics (low accuracy) sorted first
- [ ] Shows overall stats (total questions, correct count, average accuracy)

---

## Epic 4: Summary Outline

### US-4.1 Generate Study Outline

> **As a** bootcamp student
> **I want to** have AI auto-generate a study outline for a document
> **So that** I can quickly grasp the key points of the entire material

**Acceptance Criteria**:
- [ ] Can select target document
- [ ] Generates structured Markdown outline (sections, key points, definitions)
- [ ] 🔑 Marks the most critical knowledge points
- [ ] Streaming progressive display
- [ ] Language matches original document

---

*Last updated: 2026-03-24*
