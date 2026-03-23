# Development Environment Setup Guide

## Prerequisites

- **Node.js** ≥ 18.x
- **npm** ≥ 9.x
- **MongoDB Atlas** account (M0 free cluster)
- **OpenRouter** account (free API key)

---

## 1. Install Dependencies

```bash
cd revision-app
npm install
```

## 2. Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in the following variables:

```env
# MongoDB Atlas connection string
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/revision?retryWrites=true&w=majority

# OpenRouter API (get your key at https://openrouter.ai/keys)
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxx
OPENROUTER_MODEL=google/gemini-2.5-flash-lite
OPENROUTER_EMBED_MODEL=qwen/qwen3-embedding-8b
```

### Model Reference

| Purpose | Model | Notes |
|---------|-------|-------|
| **Chat LLM** | `google/gemini-2.5-flash-lite` | Google Gemini 2.5 Flash Lite |
| **Embedding** | `qwen/qwen3-embedding-8b` | Qwen3 8B embedding, 4096 dims |

## 3. MongoDB Atlas Vector Index

1. Log in to [MongoDB Atlas](https://cloud.mongodb.com)
2. Navigate to Cluster → **Atlas Search** → **Create Index**
3. Select **JSON Editor** and paste the following:

```json
{
  "name": "chunk_vector_index",
  "type": "vectorSearch",
  "definition": {
    "fields": [
      {
        "type": "vector",
        "path": "embedding",
        "numDimensions": 4096,
        "similarity": "cosine"
      }
    ]
  }
}
```

> ⚠️ `numDimensions` must match the embedding model's output dimensions. `qwen/qwen3-embedding-8b` outputs 4096 dims. The system detects dimensions during warmup at startup — check the console for the actual dimension value.

4. Database name: `revision`, Collection: `chunks`

## 4. Start Development Server

```bash
npm run dev
```

Open http://localhost:3000

## 5. Verification

1. Upload a PDF or Markdown file
2. Wait for ingestion to complete (console will show chunk and embedding progress)
3. Switch to the Chat Tab and try asking a question
4. Switch to the Quiz Tab and generate a quiz

---

## Troubleshooting

### Embedding warmup failed

```
[Embeddings] ⚠️ OpenRouter embedding warmup failed
```

**Cause**: `OPENROUTER_API_KEY` is not set or invalid
**Solution**: Check the API key in `.env.local`

### Vector search returns no results

**Cause**: Atlas vector index not created, or `numDimensions` mismatch
**Solution**:
1. Confirm Atlas has the `chunk_vector_index` created
2. Check if the dimension shown in console during warmup matches the index

### Ingest TypeError

```
TypeError: Cannot read properties of undefined (reading '0')
```

**Cause**: Embedding API returned an abnormal response format
**Solution**: Check OpenRouter API key quota and model availability

---

## Deploy to Vercel

1. Push to GitHub
2. Import the project on [Vercel](https://vercel.com)
3. Set environment variables: `MONGODB_URI`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `OPENROUTER_EMBED_MODEL`
4. Deploy

---

*Last updated: 2026-03-17*
