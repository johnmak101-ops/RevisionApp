# Sequence Diagrams

Below are the Sequence Diagrams for each core feature of the Revision App, entirely mapped to the actual code under the `src/` directory.

---

## 1. Document Ingestion Flow

> Source: `src/app/api/ingest/route.ts`, `src/lib/pdf.ts`, `src/lib/md.ts`, `src/lib/chunking.ts`, `src/lib/embedding.ts`, `src/lib/promptGuard.ts`

```mermaid
sequenceDiagram
    participant User
    participant Frontend as Frontend (FileUpload)
    participant API as POST /api/ingest
    participant LlamaCloud as LlamaCloud (LlamaParse)
    participant OpenRouter as OpenRouter (qwen3-embedding-4b)
    participant MongoDB as MongoDB Atlas

    User->>Frontend: Upload Document (PDF/MD)
    Note over Frontend: `accept` limits extension; no client-side size check
    Frontend->>API: POST /api/ingest (FormData)
    API->>API: isAcceptedFile() validates MIME/extension
    API->>API: Check file size (max 100MB, 413 if exceeded)

        alt PDF Document
            API->>LlamaCloud: uploadPdf(parsing_instruction) → waitForJob() → fetchMarkdown()
            LlamaCloud-->>API: Return Markdown (paginated by ---)
        else Markdown Document
            API->>API: extractMdText() local parsing
        end

        API->>API: chunkText() split text
        API->>API: guardChunkContent() scan for Prompt Injection
        Note over API: Remove chunks flagged as suspicious

        API->>MongoDB: Document.findOne() check for duplicate name
        alt Duplicate exists
            MongoDB-->>API: Exists
            API-->>Frontend: 409: Document already exists
        else Does not exist
            API->>MongoDB: Document.create() create document record
            loop Every batch of 20 chunks
                API->>OpenRouter: embedTexts() get vectors
                OpenRouter-->>API: Return embedding vectors
            end
            API->>MongoDB: Chunk.insertMany() save chunks + embeddings
            MongoDB-->>API: Save successful
            API-->>Frontend: 200: { success, documentId, chunkCount }
            Frontend-->>User: Show success Toast
        end
```

---

## 2. RAG Smart Chat Flow

> Source: `src/app/api/chat/route.ts`, `src/lib/search.ts`, `src/lib/promptGuard.ts`, `src/lib/rateLimiter.ts`

```mermaid
sequenceDiagram
    participant User
    participant Frontend as Frontend (ChatBox + useChat)
    participant API as POST /api/chat
    participant Guard as promptGuard
    participant Search as multiQuerySearch
    participant ToolLLM as OpenRouter (Sub-query generation)
    participant EmbedAPI as OpenRouter (qwen3-embedding-4b)
    participant MongoDB as MongoDB Atlas ($vectorSearch)
    participant LLM as OpenRouter (LLM Chain)

    User->>Frontend: Input question
    Frontend->>API: POST /api/chat { messages: UIMessage[] }

    API->>API: checkRateLimit() IP rate limiting
    alt Limit exceeded
        API-->>Frontend: 429 Too Many Requests
    end

    API->>API: extractTextFromUIMessage() get latest user message
    API->>Guard: guardUserMessage() check Prompt Injection
    alt Unsafe
        Guard-->>API: { safe: false, reason }
        API-->>Frontend: ⚠️ Security warning message (streaming)
    end

    API->>Search: multiQuerySearch(question)

    Note over Search: Step 1: LLM generates 3 search perspectives
    Search->>ToolLLM: Generate 3 sub-queries
    ToolLLM-->>Search: ["query1", "query2", "query3"]

    Note over Search: Step 2: Parallel vector search
    loop For each sub-query
        Search->>EmbedAPI: embedText(subQuery)
        EmbedAPI-->>Search: query vector
        Search->>MongoDB: $vectorSearch (cosine similarity)
        MongoDB-->>Search: Top chunks + scores
    end

    Note over Search: Step 3: Merge, deduplicate + filter (score >= 0.60)

    alt No vector search results
        Search->>MongoDB: keywordFallback() $regex search
        MongoDB-->>Search: Fallback chunks (score=0.5)
    end

    Search-->>API: Top 8 chunks

    alt No relevant results (score < 0.40)
        API-->>Frontend: ⚠️ Could not find relevant document content
    else Relevant results found
        API->>API: Combine context + history (max 10 entries)
        API->>LLM: chain.stream({ context, history, question })

        loop Streaming response
            LLM-->>API: AIMessageChunk token
            API-->>Frontend: toUIMessageStream → SSE
            Frontend-->>User: Render answer stream
        end
    end
```

---

## 3. Quiz Generation & Submission Flow

> Source: `src/app/api/quiz/generate/route.ts`, `src/app/api/quiz/submit/route.ts`, `src/hooks/useQuiz.ts`

```mermaid
sequenceDiagram
    participant User
    participant Frontend as Frontend (QuizPanel + useQuiz)
    participant GenAPI as POST /api/quiz/generate
    participant SubAPI as POST /api/quiz/submit
    participant MongoDB as MongoDB Atlas
    participant LLM as OpenRouter (LLM, temp=0.7)

    %% Step 1: Generate Quiz
    User->>Frontend: Select document + question count, click "Generate Quiz"
    Frontend->>GenAPI: POST { documentId, count }

    GenAPI->>GenAPI: checkRateLimit() rate limit
    GenAPI->>GenAPI: guardDocumentId() validate ID format

    GenAPI->>MongoDB: Chunk.find({ pdfId }) sort by page+chunkIndex
    MongoDB-->>GenAPI: Return document chunks

    GenAPI->>GenAPI: Combine context (limit 12,000 chars)
    GenAPI->>LLM: quizPromptTemplate → generate MCQ JSON
    LLM-->>GenAPI: JSON array (question, options, correctIndex, topic, explanation)

    GenAPI->>GenAPI: JSON.parse + validate + filter invalid questions
    GenAPI->>MongoDB: QuizAttempt.create() save full questions (with answers)
    MongoDB-->>GenAPI: Return quizId

    GenAPI-->>Frontend: { quizId, questions (hidden correctIndex), totalQuestions }
    Frontend-->>User: Display multiple choice interface

    %% Step 2: Complete & Submit
    User->>Frontend: Select answers sequentially
    User->>Frontend: Click "Submit"
    Frontend->>SubAPI: POST { quizId, answers[] }

    SubAPI->>MongoDB: QuizAttempt.findById(quizId)
    alt Quiz already submitted
        MongoDB-->>SubAPI: submittedAt already exists
        SubAPI-->>Frontend: 409: quiz already submitted
    else First submission
        SubAPI->>SubAPI: Compare with correctIndex, calculate score
        SubAPI->>MongoDB: Update score + submittedAt + userAnswer
        MongoDB-->>SubAPI: Save successful
        SubAPI-->>Frontend: { score, totalQuestions, percentage, results[] }
        Frontend-->>User: Display score + per-question answers/explanations
    end
```

---

## 4. Knowledge Gap Stats Flow

> Source: `src/app/api/quiz/stats/route.ts`, `src/components/KnowledgeGap.tsx`, `src/hooks/useStats.ts`

```mermaid
sequenceDiagram
    participant User
    participant Frontend as Frontend (KnowledgeGap + useStats)
    participant API as GET /api/quiz/stats
    participant MongoDB as MongoDB Atlas

    User->>Frontend: Switch to Quiz Tab (auto load)
    Frontend->>API: GET /api/quiz/stats

    API->>MongoDB: QuizAttempt.find({ submittedAt: { $ne: null } })
    MongoDB-->>API: All submitted quiz attempts

    API->>API: Group by topic and calculate accuracy
    Note over API: Weak spots (low accuracy) sorted first

    API-->>Frontend: { topics[], overall: { totalAttempts, accuracy } }
    Frontend-->>User: Display topic accuracy ranking + overall performance

    opt User clicks "Reset Stats"
        User->>Frontend: Click Reset
        Frontend->>API: DELETE /api/quiz/stats
        API->>MongoDB: QuizAttempt.deleteMany({})
        MongoDB-->>API: { deleted: count }
        API-->>Frontend: 200
        Frontend-->>User: Stats cleared
    end
```

---

## 5. Summary Generation Flow

> Source: `src/app/api/summary/generate/route.ts`, `src/components/SummaryPanel.tsx`

```mermaid
sequenceDiagram
    participant User
    participant Frontend as Frontend (SummaryPanel)
    participant API as POST /api/summary/generate
    participant MongoDB as MongoDB Atlas
    participant LLM as OpenRouter (LLM, streaming)

    User->>Frontend: Select document, click "Generate Summary"
    Frontend->>API: POST { documentId }

    API->>API: checkRateLimit() rate limit
    API->>API: guardDocumentId() validate ID

    API->>MongoDB: Chunk.find({ pdfId }) sort by page+chunkIndex
    MongoDB-->>API: Return chunks

    alt No content
        API-->>Frontend: 404: Could not find document content
        Frontend-->>User: Show error message
    else Content exists
        API->>API: Combine context (limit 20,000 chars)
        API->>LLM: summaryPromptTemplate → streaming generate outline

        loop NDJSON Streaming response
            LLM-->>API: Markdown snippet
            API-->>Frontend: { token } chunked response
            Frontend-->>User: Incrementally render Markdown outline
        end

        API-->>Frontend: { done: true }
    end
```

---

## 6. Document List Loading Flow

> Source: `src/app/api/documents/route.ts`, `src/components/DocumentList.tsx` (`useQuery` / `useMutation`, `queryKey: ["documents"]`), `src/context/UploadContext.tsx` (on ingest success `invalidateQueries({ queryKey: ["documents"] })`)

```mermaid
sequenceDiagram
    participant User
    participant FE as Frontend (TanStack Query)
    participant API as GET /api/documents
    participant MongoDB as MongoDB Atlas

    User->>FE: Open App / Switch Tab
    FE->>API: GET /api/documents
    API->>MongoDB: Document.find().sort({ uploadedAt: -1 })
    MongoDB-->>API: Document list
    API-->>FE: JSON array
    FE-->>User: DocumentList / Quiz / Summary selector
```

---

## 7. Delete Indexed Document Flow

> Source: `src/app/api/documents/[id]/route.ts`, `src/components/DocumentList.tsx`

```mermaid
sequenceDiagram
    participant User
    participant FE as DocumentList
    participant API as DELETE /api/documents/[id]
    participant MongoDB as MongoDB Atlas

    User->>FE: Click "Delete" and confirm
    FE->>API: DELETE /api/documents/{id}
    API->>MongoDB: Chunk.deleteMany({ pdfId })
    API->>MongoDB: QuizAttempt.deleteMany({ documentId })
    API->>MongoDB: Document.findByIdAndDelete
    MongoDB-->>API: OK
    API-->>FE: { success, deletedChunks }
    FE->>FE: invalidateQueries(["documents"])
    FE-->>User: List updated
```

---
*Updated: 2026-03-26 — Mapped to actual `src/` codebase*

