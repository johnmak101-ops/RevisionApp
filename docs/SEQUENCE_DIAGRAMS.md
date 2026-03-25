# 系統時序圖 (Sequence Diagrams)

以下是 Revision App 各個核心功能嘅時序圖 (Sequence Diagrams)，全部對照 `src/` 目錄下嘅實際程式碼繪製。

---

## 1. 文件上傳與處理時序圖 (Document Ingestion Flow)

> 對應程式碼：`src/app/api/ingest/route.ts`、`src/lib/pdf.ts`、`src/lib/md.ts`、`src/lib/chunking.ts`、`src/lib/embedding.ts`、`src/lib/promptGuard.ts`

```mermaid
sequenceDiagram
    participant User
    participant Frontend as Frontend (FileUpload)
    participant API as POST /api/ingest
    participant LlamaCloud as LlamaCloud (LlamaParse)
    participant OpenRouter as OpenRouter (qwen3-embedding-4b)
    participant MongoDB as MongoDB Atlas

    User->>Frontend: 上傳文件 (PDF/MD)
    Frontend->>Frontend: 前端驗證 (格式/大小)
    alt 文件無效
        Frontend-->>User: 顯示錯誤 Toast
    else 文件有效
        Frontend->>API: POST /api/ingest (FormData)
        API->>API: isAcceptedFile() 驗證 MIME/副檔名
        API->>API: 檢查檔案大小 (上限 100MB)

        alt PDF 文件
            API->>LlamaCloud: uploadPdf(parsing_instruction) → waitForJob() → fetchMarkdown()
            LlamaCloud-->>API: 回傳 Markdown（按 --- 分頁）
        else Markdown 文件
            API->>API: extractMdText() 本地解析
        end

        API->>API: chunkText() 文本分割
        API->>API: guardChunkContent() 掃描 Prompt Injection
        Note over API: 移除被標記為可疑嘅 chunks

        API->>MongoDB: Document.findOne() 檢查同名文件
        alt 同名存在
            MongoDB-->>API: 已存在
            API-->>Frontend: 409: 文件已存在
        else 不存在
            API->>MongoDB: Document.create() 建立文件記錄
            loop 每批 20 個 chunks
                API->>OpenRouter: embedTexts() 取得向量
                OpenRouter-->>API: 回傳 embedding vectors
            end
            API->>MongoDB: Chunk.insertMany() 儲存 chunks + embeddings
            MongoDB-->>API: 儲存成功
            API-->>Frontend: 200: { success, documentId, chunkCount }
            Frontend-->>User: 顯示上傳成功 Toast
        end
    end
```

---

## 2. RAG 智能問答時序圖 (Chat RAG Flow)

> 對應程式碼：`src/app/api/chat/route.ts`、`src/lib/search.ts`、`src/lib/promptGuard.ts`、`src/lib/rateLimiter.ts`

```mermaid
sequenceDiagram
    participant User
    participant Frontend as Frontend (ChatBox + useChat)
    participant API as POST /api/chat
    participant Guard as promptGuard
    participant Search as multiQuerySearch
    participant ToolLLM as OpenRouter (子查詢生成)
    participant EmbedAPI as OpenRouter (qwen3-embedding-4b)
    participant MongoDB as MongoDB Atlas ($vectorSearch)
    participant LLM as OpenRouter (LLM Chain)

    User->>Frontend: 輸入問題
    Frontend->>API: POST /api/chat { messages: UIMessage[] }

    API->>API: checkRateLimit() IP 限流
    alt 超出限制
        API-->>Frontend: 429 Too Many Requests
    end

    API->>API: extractTextFromUIMessage() 取得最後用戶訊息
    API->>Guard: guardUserMessage() 檢查 Prompt Injection
    alt 不安全
        Guard-->>API: { safe: false, reason }
        API-->>Frontend: ⚠️ 安全警告訊息 (streaming)
    end

    API->>Search: multiQuerySearch(question)

    Note over Search: Step 1: LLM 生成 3 個搜尋角度
    Search->>ToolLLM: 生成 3 個 sub-queries
    ToolLLM-->>Search: ["query1", "query2", "query3"]

    Note over Search: Step 2: 並行向量搜尋
    loop 每個 sub-query
        Search->>EmbedAPI: embedText(subQuery)
        EmbedAPI-->>Search: query vector
        Search->>MongoDB: $vectorSearch (cosine similarity)
        MongoDB-->>Search: Top chunks + scores
    end

    Note over Search: Step 3: 合併去重 + 過濾 (score >= 0.60)

    alt 向量搜尋無結果
        Search->>MongoDB: keywordFallback() $regex 搜尋
        MongoDB-->>Search: 備援 chunks (score=0.5)
    end

    Search-->>API: 最佳 8 個 chunks

    alt 無相關結果 (score < 0.40)
        API-->>Frontend: ⚠️ 冇搵到相關文件內容
    else 有相關結果
        API->>API: 組合 context + history (最多 10 條)
        API->>LLM: chain.stream({ context, history, question })

        loop Streaming 回傳
            LLM-->>API: AIMessageChunk token
            API-->>Frontend: toUIMessageStream → SSE
            Frontend-->>User: 逐字渲染回答
        end
    end
```

---

## 3. 測驗生成與提交時序圖 (Quiz Generation & Submission Flow)

> 對應程式碼：`src/app/api/quiz/generate/route.ts`、`src/app/api/quiz/submit/route.ts`、`src/hooks/useQuiz.ts`

```mermaid
sequenceDiagram
    participant User
    participant Frontend as Frontend (QuizPanel + useQuiz)
    participant GenAPI as POST /api/quiz/generate
    participant SubAPI as POST /api/quiz/submit
    participant MongoDB as MongoDB Atlas
    participant LLM as OpenRouter (LLM, temp=0.7)

    %% 步驟一: 生成測驗
    User->>Frontend: 選擇文件 + 題目數量，點擊「Generate Quiz」
    Frontend->>GenAPI: POST { documentId, count }

    GenAPI->>GenAPI: checkRateLimit() 限流
    GenAPI->>GenAPI: guardDocumentId() 驗證 ID 格式

    GenAPI->>MongoDB: Chunk.find({ pdfId }) 按 page+chunkIndex 排序
    MongoDB-->>GenAPI: 回傳文件 chunks

    GenAPI->>GenAPI: 組合 context (上限 12,000 字元)
    GenAPI->>LLM: quizPromptTemplate → 生成 MCQ JSON
    LLM-->>GenAPI: JSON array (question, options, correctIndex, topic, explanation)

    GenAPI->>GenAPI: JSON.parse + 驗證 + 過濾無效題目
    GenAPI->>MongoDB: QuizAttempt.create() 儲存完整題目 (含答案)
    MongoDB-->>GenAPI: 回傳 quizId

    GenAPI-->>Frontend: { quizId, questions (隱藏 correctIndex), totalQuestions }
    Frontend-->>User: 顯示選擇題介面

    %% 步驟二: 完成並提交
    User->>Frontend: 逐題選擇答案
    User->>Frontend: 點擊「Submit」
    Frontend->>SubAPI: POST { quizId, answers[] }

    SubAPI->>MongoDB: QuizAttempt.findById(quizId)
    alt Quiz 已提交過
        MongoDB-->>SubAPI: submittedAt 已存在
        SubAPI-->>Frontend: 409: quiz 已經交咗
    else 首次提交
        SubAPI->>SubAPI: 對比 correctIndex，計算得分
        SubAPI->>MongoDB: 更新 score + submittedAt + userAnswer
        MongoDB-->>SubAPI: 儲存成功
        SubAPI-->>Frontend: { score, totalQuestions, percentage, results[] }
        Frontend-->>User: 顯示成績 + 逐題答案/解釋
    end
```

---

## 4. Knowledge Gap 分析時序圖 (Quiz Stats Flow)

> 對應程式碼：`src/app/api/quiz/stats/route.ts`、`src/components/KnowledgeGap.tsx`、`src/hooks/useStats.ts`

```mermaid
sequenceDiagram
    participant User
    participant Frontend as Frontend (KnowledgeGap + useStats)
    participant API as GET /api/quiz/stats
    participant MongoDB as MongoDB Atlas

    User->>Frontend: 切換至 Quiz Tab (自動載入)
    Frontend->>API: GET /api/quiz/stats

    API->>MongoDB: QuizAttempt.find({ submittedAt: { $ne: null } })
    MongoDB-->>API: 所有已提交嘅 quiz attempts

    API->>API: 按 topic 分組計算正確率
    Note over API: 弱項 (低正確率) 排前面

    API-->>Frontend: { topics[], overall: { totalAttempts, accuracy } }
    Frontend-->>User: 顯示 topic 正確率排行 + 整體表現

    opt 用戶點擊「重置統計」
        User->>Frontend: 點擊 Reset
        Frontend->>API: DELETE /api/quiz/stats
        API->>MongoDB: QuizAttempt.deleteMany({})
        MongoDB-->>API: { deleted: count }
        API-->>Frontend: 200
        Frontend-->>User: 統計已清除
    end
```

---

## 5. 懶人包生成時序圖 (Summary Generation Flow)

> 對應程式碼：`src/app/api/summary/generate/route.ts`、`src/components/SummaryPanel.tsx`

```mermaid
sequenceDiagram
    participant User
    participant Frontend as Frontend (SummaryPanel)
    participant API as POST /api/summary/generate
    participant MongoDB as MongoDB Atlas
    participant LLM as OpenRouter (LLM, streaming)

    User->>Frontend: 選擇文件，點擊「Generate Summary」
    Frontend->>API: POST { documentId }

    API->>API: checkRateLimit() 限流
    API->>API: guardDocumentId() 驗證 ID

    API->>MongoDB: Chunk.find({ pdfId }) 按 page+chunkIndex 排序
    MongoDB-->>API: 回傳 chunks

    alt 無內容
        API-->>Frontend: 404: 搵唔到文件內容
        Frontend-->>User: 顯示錯誤提示
    else 有內容
        API->>API: 組合 context (上限 20,000 字元)
        API->>LLM: summaryPromptTemplate → streaming 生成大綱

        loop NDJSON Streaming 回傳
            LLM-->>API: Markdown 片段
            API-->>Frontend: { token } 逐段回傳
            Frontend-->>User: 逐步渲染 Markdown 大綱
        end

        API-->>Frontend: { done: true }
    end
```

---

## 6. 文件列表載入時序圖 (Document List Flow)

> 對應程式碼：`src/app/api/documents/route.ts`、`src/components/DocumentList.tsx`、`src/hooks/useQuiz.ts`、`src/components/SummaryPanel.tsx`、`src/context/UploadContext.tsx`（ingest 成功後 `invalidateQueries(["documents"])`）

```mermaid
sequenceDiagram
    participant User
    participant FE as Frontend (TanStack Query)
    participant API as GET /api/documents
    participant MongoDB as MongoDB Atlas

    User->>FE: 開啟應用 / 切換 Tab
    FE->>API: GET /api/documents
    API->>MongoDB: Document.find().sort({ uploadedAt: -1 })
    MongoDB-->>API: 文件列表
    API-->>FE: JSON array
    FE-->>User: DocumentList / Quiz / Summary 選擇器
```

---

## 7. 刪除已索引文件時序圖 (Delete Document Flow)

> 對應程式碼：`src/app/api/documents/[id]/route.ts`、`src/components/DocumentList.tsx`

```mermaid
sequenceDiagram
    participant User
    participant FE as DocumentList
    participant API as DELETE /api/documents/[id]
    participant MongoDB as MongoDB Atlas

    User->>FE: 按「刪除」並確認
    FE->>API: DELETE /api/documents/{id}
    API->>MongoDB: Chunk.deleteMany({ pdfId })
    API->>MongoDB: QuizAttempt.deleteMany({ documentId })
    API->>MongoDB: Document.findByIdAndDelete
    MongoDB-->>API: OK
    API-->>FE: { success, deletedChunks }
    FE->>FE: invalidateQueries(["documents"])
    FE-->>User: 清單更新
```

---
*更新日期：2026-03-25 — 全部時序圖已對照 `src/` 目錄實際程式碼驗證*
