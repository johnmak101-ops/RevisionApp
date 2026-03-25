# UI Flow Diagram

## 1. Overall Application Flow

```mermaid
flowchart TD
    START["🏠 Home Page Load"]
    UPLOAD["📤 File Upload Area"]
    TAB["📑 Tab Navigation Bar"]
    
    CHAT["💬 Chat Tab"]
    QUIZ["📝 Quiz Tab"]
    SUMMARY["📋 Summary Tab"]
    
    START --> UPLOAD
    START --> TAB
    TAB --> CHAT
    TAB --> QUIZ
    TAB --> SUMMARY
```

---

## 2. File Upload Flow

```mermaid
flowchart TD
    A["User selects file"] --> B{"Format check"}
    B -->|"✅ PDF/MD"| C{"Size check"}
    B -->|"❌ Unsupported"| ERR1["Show error: Only PDF/Markdown accepted"]
    
    C -->|"≤ 100MB"| D["POST /api/ingest"]
    C -->|"> 100MB"| ERR2["Show error: File too large"]
    
    D --> E{"Server validation"}
    E -->|"Duplicate name"| ERR3["409: Already uploaded — delete from Indexed documents first"]
    E -->|"Empty/corrupted"| ERR4["400: Invalid file"]
    E -->|"✅ Passed"| F["Extract text"]
    
    F --> G["Split into Chunks (512 chars)"]
    G --> PG{"PromptGuard scan"}
    PG -->|"All flagged"| ERR5["422: Content rejected by security"]
    PG -->|"✅ Safe (flagged chunks removed)"| H["Batch Embedding (20 per batch)"]
    H --> I["Store in MongoDB"]
    I --> J["✅ Show success + chunk count"]
    J --> K["Invalidate documents query cache"]
    
    style J fill:#2d8a4e,color:#fff
    style K fill:#2d8a4e,color:#fff
    style ERR1 fill:#cc3333,color:#fff
    style ERR2 fill:#cc3333,color:#fff
    style ERR3 fill:#cc3333,color:#fff
    style ERR4 fill:#cc3333,color:#fff
    style ERR5 fill:#cc3333,color:#fff
```

---

## 2a. Delete Indexed Document (summary)

```mermaid
flowchart TD
    A["User clicks Delete"] --> B{"Confirm?"}
    B -->|"Cancel"| Z["No-op"]
    B -->|"OK"| C["DELETE /api/documents/id"]
    C --> D{"Result"}
    D -->|"200"| E["Invalidate documents query cache"]
    D -->|"4xx/5xx"| F["Show error"]
    E --> G["List and Quiz/Summary selectors refresh"]
```

---

## 3. RAG Chat Flow

```mermaid
flowchart TD
    A["User enters question"] --> B{"Message validation"}
    B -->|"Empty"| ERR1["400: Message cannot be empty"]
    B -->|"✅ Has content"| PG{"PromptGuard check"}
    PG -->|"⚠️ Injection detected"| WARN["Return warning message"]
    PG -->|"✅ Safe"| MQ["Multi-Query: LLM generates 3 sub-queries"]
    
    MQ --> D["Parallel $vectorSearch × 3"]
    D --> MERGE["Merge + Deduplicate results"]
    MERGE --> E{"Relevant results?"}
    
    E -->|"Found (normalized ≥ 0.40)"| F["Combine Context + Chat History (max 10)"]
    E -->|"Vector failed"| G["Keyword Fallback Search"]
    E -->|"All normalized < 0.40"| H["⚠️ No relevant content found"]
    
    G --> F
    F --> I["Call LLM (Streaming)"]
    I --> J["Frontend token-by-token rendering"]
    J --> K["✅ Complete answer displayed"]
    
    style K fill:#2d8a4e,color:#fff
    style ERR1 fill:#cc3333,color:#fff
    style H fill:#e6a817,color:#000
    style WARN fill:#e6a817,color:#000
```

> **Implementation**: After `$vectorSearch`, `search.ts` drops chunks with **raw** cosine < **0.60**, then normalizes remaining scores to 0–1. The diagram’s “normalized” refers to that value; `chat/route.ts` only builds context from chunks with normalized ≥ **0.40**.

---

## 4. Quiz Complete Flow

```mermaid
flowchart TD
    A["User selects document"] --> B["Set question count (3-15)"]
    B --> C["POST /api/quiz/generate"]
    
    C --> D{"Generation result?"}
    D -->|"❌ No Chunks"| ERR1["404: Document has no content"]
    D -->|"❌ Invalid LLM response"| ERR2["502: Generation failed, please retry"]
    D -->|"✅ Success"| E["Display questions (answers hidden)"]
    
    E --> F["User selects answer for each question"]
    F --> G{"All answered?"}
    G -->|"Incomplete"| F
    G -->|"✅ All done"| H["POST /api/quiz/submit"]
    
    H --> I{"Submission result?"}
    I -->|"❌ Already submitted"| ERR3["409: Duplicate submission"]
    I -->|"✅ Success"| J["Show score + per-question results"]
    
    J --> K{"Score?"}
    K -->|"≥ 80%"| L["🎉 好掂！繼續保持！"]
    K -->|"≥ 60%"| M["💪 唔錯，仲有進步空間"]
    K -->|"< 60%"| N["📚 加油，建議重溫弱項"]
    
    style ERR1 fill:#cc3333,color:#fff
    style ERR2 fill:#cc3333,color:#fff
    style ERR3 fill:#cc3333,color:#fff
    style L fill:#2d8a4e,color:#fff
    style M fill:#3d7bbf,color:#fff
    style N fill:#e6a817,color:#000
```

---

## 5. Summary Generation Flow

```mermaid
flowchart TD
    A["User selects document"] --> B["POST /api/summary/generate"]
    
    B --> C{"Result?"}
    C -->|"❌ No Chunks"| ERR1["404: Document has no content"]
    C -->|"✅ Has content"| D["Retrieve Chunks (max 20,000 chars)"]
    
    D --> E["Call LLM (Streaming)"]
    E --> F["Frontend progressive Markdown rendering"]
    F --> G["✅ Complete summary displayed"]
    
    style G fill:#2d8a4e,color:#fff
    style ERR1 fill:#cc3333,color:#fff
```

---

## 6. Page Component Layout

```mermaid
graph TD
    subgraph "Main Page page.tsx"
        HEADER["Header: Title + Description"]
        UPLOAD["FileUpload Component"]
        TABNAV["TabNav: Chat | Quiz | Summary"]
        
        subgraph "Tab Content Area"
            CHAT["ChatBox Component"]
            
            subgraph "Quiz Area (2:1 Grid)"
                QUIZPANEL["QuizPanel Component"]
                KNOWLEDGEGAP["KnowledgeGap Component"]
            end
            
            SUMMARYPANEL["SummaryPanel Component"]
        end
    end
    
    HEADER --> UPLOAD
    UPLOAD --> TABNAV
    TABNAV -->|"chat"| CHAT
    TABNAV -->|"quiz"| QUIZPANEL
    TABNAV -->|"quiz"| KNOWLEDGEGAP
    TABNAV -->|"summary"| SUMMARYPANEL
```

---

## 7. Data Flow

```mermaid
flowchart LR
    subgraph "Frontend (Next.js)"
        FU["FileUpload"]
        CB["ChatBox"]
        QP["QuizPanel"]
        KG["KnowledgeGap"]
        SP["SummaryPanel"]
    end
    
    subgraph "API Routes"
        AI["/api/ingest"]
        AC["/api/chat"]
        QG["/api/quiz/generate"]
        QS["/api/quiz/submit"]
        QST["/api/quiz/stats"]
        SG["/api/summary/generate"]
        AD["/api/documents"]
    end
    
    subgraph "External Services"
        OR["OpenRouter API"]
        MDB["MongoDB Atlas"]
        LP["LlamaCloud (LlamaParse + parsing_instruction)"]
    end
    
    FU --> AI
    CB --> AC
    QP --> QG
    QP --> QS
    KG --> QST
    SP --> SG
    FU --> AD
    QP --> AD
    SP --> AD
    
    AI --> OR
    AI --> MDB
    AI --> LP
    AC --> OR
    AC --> MDB
    QG --> OR
    QG --> MDB
    QS --> MDB
    QST --> MDB
    SG --> OR
    SG --> MDB
    AD --> MDB
```

---

*Last updated: 2026-03-24*
