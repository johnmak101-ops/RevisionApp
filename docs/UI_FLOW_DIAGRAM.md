# UI 流程圖 (UI Flow Diagram)

## 1. 應用整體流程

```mermaid
flowchart TD
    START["🏠 首頁載入"]
    UPLOAD["📤 文件上傳區"]
    TAB["📑 Tab 導航列"]
    
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

## 2. 文件上傳流程

```mermaid
flowchart TD
    A["用戶選擇文件"] --> B{"格式（瀏覽器 accept）"}
    B -->|"❌ 副檔名唔係 PDF/MD"| ERR1["無法選擇／需換檔"]
    B -->|"✅ PDF/MD"| D["POST /api/ingest（無前端大小檢查；超限 → API 413）"]

    D --> E{"伺服器驗證與處理"}
    E -->|"413 超過 100MB"| ERR413["Toast：檔案過大"]
    E -->|"409 同名已存在"| ERR3["已上傳過 → 請先刪除已索引文件"]
    E -->|"400 空檔／解析失敗／無文字"| ERR4["文件無效或無法擷取文字"]
    E -->|"✅ 進入處理管道"| F["擷取文字"]

    F --> G["分割 Chunks（512／overlap 100）"]
    G --> PG{"Chunk Guard（可疑段移除）"}
    PG -->|"移除後無剩餘 chunk"| ERR5["422：安全系統拒絕整份內容"]
    PG -->|"尚有內容"| H["批次 Embedding（每批 20）"]
    H --> I["儲存至 MongoDB"]
    I --> J["✅ 成功 + chunk 數量（可有 warning）"]
    J --> K["invalidate 文件清單快取"]

    style J fill:#2d8a4e,color:#fff
    style K fill:#2d8a4e,color:#fff
    style ERR1 fill:#cc3333,color:#fff
    style ERR413 fill:#cc3333,color:#fff
    style ERR3 fill:#cc3333,color:#fff
    style ERR4 fill:#cc3333,color:#fff
    style ERR5 fill:#cc3333,color:#fff
```

---

## 2a. 已索引文件刪除（簡要）

```mermaid
flowchart TD
    A["用戶按「刪除」"] --> B{"確認？"}
    B -->|"取消"| Z["無操作"]
    B -->|"確定"| C["DELETE /api/documents/id"]
    C --> D{"結果"}
    D -->|"200"| E["invalidate documents 快取"]
    D -->|"4xx/5xx"| F["顯示錯誤"]
    E --> G["清單與 Quiz/Summary 下拉更新"]
```

---

## 3. RAG 聊天流程

```mermaid
flowchart TD
    A["用戶輸入問題"] --> B{"訊息驗證"}
    B -->|"空白"| ERR1["400: 訊息不能為空"]
    B -->|"✅ 有內容"| C["問題 → Embedding Vector"]
    
    C --> D["MongoDB $vectorSearch"]
    D --> E{"搜尋結果？"}
    
    E -->|"有 (normalized ≥ 0.40)"| F["組合 Context + 對話歷史"]
    E -->|"失敗"| G["Keyword Fallback 搜尋"]
    E -->|"normalized 全部 < 0.40"| H["提示：冇搵到相關內容"]
    
    G --> F
    F --> I["呼叫 LLM (Streaming)"]
    I --> J["前端逐 token 渲染"]
    J --> K["✅ 完整回答顯示"]
    
    style K fill:#2d8a4e,color:#fff
    style ERR1 fill:#cc3333,color:#fff
    style H fill:#e6a817,color:#000
```

> **實作細節**：`$vectorSearch` 結果喺 `search.ts` 會先丟棄 **raw** cosine < **0.60**，再將餘下分數正規化至 0–1；圖中「normalized」即該正規化分數。`chat/route.ts` 只用 normalized ≥ 0.40 嘅 chunk 組 context。

---

## 4. Quiz 完整流程

```mermaid
flowchart TD
    A["用戶選擇文件"] --> B["設定題目數 (3-15)"]
    B --> C["POST /api/quiz/generate"]
    
    C --> D{"生成結果？"}
    D -->|"❌ 無 Chunks"| ERR1["404: 文件無內容"]
    D -->|"❌ LLM 回傳無效"| ERR2["502: 生成失敗，請重試"]
    D -->|"✅ 成功"| E["顯示題目 (隱藏答案)"]
    
    E --> F["用戶逐題選擇答案"]
    F --> G{"全部答完？"}
    G -->|"未完成"| F
    G -->|"✅ 全部"| H["POST /api/quiz/submit"]
    
    H --> I{"提交結果？"}
    I -->|"❌ 已提交過"| ERR3["409: 重複提交"]
    I -->|"✅ 成功"| J["顯示分數 + 每題結果"]
    
    J --> K{"分數？"}
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

## 5. Summary 生成流程

```mermaid
flowchart TD
    A["用戶選擇文件"] --> B["POST /api/summary/generate"]
    
    B --> C{"結果？"}
    C -->|"❌ 無 Chunks"| ERR1["404: 文件冇內容"]
    C -->|"✅ 有內容"| D["檢索 Chunks (上限 20,000 chars)"]
    
    D --> E["呼叫 LLM (Streaming)"]
    E --> F["前端逐步渲染 Markdown"]
    F --> G["✅ 完整摘要顯示"]
    
    style G fill:#2d8a4e,color:#fff
    style ERR1 fill:#cc3333,color:#fff
```

---

## 6. 頁面組件佈局

```mermaid
graph TD
    subgraph "主頁面 page.tsx"
        HEADER["Header: 標題 + 描述"]
        UPLOAD["FileUpload 組件"]
        TABNAV["TabNav: Chat | Quiz | Summary"]
        
        subgraph "Tab 內容區"
            CHAT["ChatBox 組件"]
            
            subgraph "Quiz 區 (2:1 Grid)"
                QUIZPANEL["QuizPanel 組件"]
                KNOWLEDGEGAP["KnowledgeGap 組件"]
            end
            
            SUMMARYPANEL["SummaryPanel 組件"]
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

## 7. 數據流向

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

*更新日期：2026-03-17*
