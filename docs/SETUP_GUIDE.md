# 開發環境設定指南

## 前置條件

- **Node.js** ≥ 18.x
- **npm** ≥ 9.x
- **MongoDB Atlas** 帳號（M0 免費叢集）
- **OpenRouter** 帳號（免費 API key）

---

## 1. 安裝依賴

```bash
cd revision-app
npm install
```

## 2. 環境變數

複製 `.env.example` 為 `.env.local`：

```bash
cp .env.example .env.local
```

填入以下變數：

```env
# MongoDB Atlas 連線字串
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/revision?retryWrites=true&w=majority

# OpenRouter API（https://openrouter.ai/keys 取得）
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxx
OPENROUTER_MODEL=nvidia/nemotron-3-nano-30b-a3b:free
OPENROUTER_EMBED_MODEL=nvidia/llama-nemotron-embed-vl-1b-v2:free
```

### 模型說明

| 用途 | 模型 | 備註 |
|------|------|------|
| **Chat LLM** | `nvidia/nemotron-3-nano-30b-a3b:free` | 30B 參數，免費 |
| **Embedding** | `nvidia/llama-nemotron-embed-vl-1b-v2:free` | 多模態 embed，免費 |

## 3. MongoDB Atlas 向量索引

1. 登入 [MongoDB Atlas](https://cloud.mongodb.com)
2. 進入 Cluster → **Atlas Search** → **Create Index**
3. 選擇 **JSON Editor**，貼上以下內容：

```json
{
  "name": "chunk_vector_index",
  "type": "vectorSearch",
  "definition": {
    "fields": [
      {
        "type": "vector",
        "path": "embedding",
        "numDimensions": 768,
        "similarity": "cosine"
      }
    ]
  }
}
```

> ⚠️ `numDimensions` 需與 embedding 模型輸出維度一致。`nvidia/llama-nemotron-embed-vl-1b-v2:free` 啟動時會 warmup 偵測維度，console 會顯示實際維度。

4. 資料庫名稱：`revision`，Collection：`chunks`

## 4. 啟動開發伺服器

```bash
npm run dev
```

開啟 http://localhost:3000

## 5. 驗證

1. 上傳一個 PDF 或 Markdown 文件
2. 等待 ingest 完成（console 會顯示 chunk 及 embedding 進度）
3. 切換到 Chat Tab 試問問題
4. 切換到 Quiz Tab 生成測驗

---

## 常見問題

### Embedding warmup 失敗

```
[Embeddings] ⚠️ OpenRouter embedding warmup failed
```

**原因**：`OPENROUTER_API_KEY` 未設定或無效
**解決**：檢查 `.env.local` 中嘅 API key

### 向量搜尋無結果

**原因**：Atlas 向量索引未建立，或 `numDimensions` 不匹配
**解決**：
1. 確認 Atlas 已建立 `chunk_vector_index`
2. 檢查 console 中 warmup 顯示嘅維度是否與索引一致

### Ingest TypeError

```
TypeError: Cannot read properties of undefined (reading '0')
```

**原因**：Embedding API 回傳格式異常
**解決**：檢查 OpenRouter API key 額度同模型可用性

---

## 部署到 Vercel

1. 推送至 GitHub
2. 在 [Vercel](https://vercel.com) 匯入專案
3. 設定環境變數：`MONGODB_URI`、`OPENROUTER_API_KEY`、`OPENROUTER_MODEL`、`OPENROUTER_EMBED_MODEL`
4. 部署

---

*更新日期：2026-03-17*
