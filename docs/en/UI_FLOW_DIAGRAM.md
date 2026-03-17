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
    E -->|"Duplicate name"| ERR3["409: File already exists"]
    E -->|"Empty/corrupted"| ERR4["400: Invalid file"]
    E -->|"✅ Passed"| F["Extract text"]
    
    F --> G["Split into Chunks (512 chars)"]
    G --> H["Batch Embedding (20 per batch)"]
    H --> I["Store in MongoDB"]
    I --> J["✅ Show success + chunk count"]
    
    style J fill:#2d8a4e,color:#fff
    style ERR1 fill:#cc3333,color:#fff
    style ERR2 fill:#cc3333,color:#fff
    style ERR3 fill:#cc3333,color:#fff
    style ERR4 fill:#cc3333,color:#fff
```

---

## 3. RAG Chat Flow

```mermaid
flowchart TD
    A["User enters question"] --> B{"Message validation"}
    B -->|"Empty"| ERR1["400: Message cannot be empty"]
    B -->|"✅ Has content"| C["Question → Embedding Vector"]
    
    C --> D["MongoDB $vectorSearch"]
    D --> E{"Search results?"}
    
    E -->|"Found (score ≥ 0.4)"| F["Combine Context + Chat History"]
    E -->|"Failed"| G["Keyword Fallback Search"]
    E -->|"All scores < 0.4"| H["Prompt: No relevant content found"]
    
    G --> F
    F --> I["Call LLM (Streaming)"]
    I --> J["Frontend token-by-token rendering"]
    J --> K["✅ Complete answer displayed"]
    
    style K fill:#2d8a4e,color:#fff
    style ERR1 fill:#cc3333,color:#fff
    style H fill:#e6a817,color:#000
```

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
    K -->|"≥ 80%"| L["🎉 Excellent! Keep it up!"]
    K -->|"≥ 60%"| M["💪 Good job, room for improvement"]
    K -->|"< 60%"| N["📚 Keep going, review weak topics"]
    
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

*Last updated: 2026-03-17*
