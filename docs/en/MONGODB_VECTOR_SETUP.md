# MongoDB Vector Database Setup Guide

revision-app uses MongoDB Atlas **Vector Search** functionality, requiring a cluster and vector index on Atlas.

---

## 1. Create MongoDB Atlas Account & Cluster

### 1. Register / Sign In
- Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- Register with Google / GitHub or Email

### 2. Create a Free Cluster
1. Click **Build a Database**
2. Select **M0 FREE** (free plan)
3. Choose cloud provider and region (recommend choosing one close to you, e.g., `AWS ap-northeast-1`)
4. Customize the cluster name (e.g., `revision-cluster`)
5. Click **Create**

### 3. Create a Database User
1. In **Security Quickstart**, select **Username and Password**
2. Enter a username and password (save them securely)
3. Click **Create Database User**

### 4. Configure Network Access
1. In **Where would you like to connect from?**, select **My Local Environment**
2. Click **Add My Current IP Address** (or select **Allow Access from Anywhere** `0.0.0.0/0` for development convenience; restrict IPs in production)

### 5. Get Connection String
1. Click **Connect**
2. Select **Drivers** (or Compass)
3. Copy the connection string, formatted as:

```
mongodb+srv://<username>:<password>@revision-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

4. Replace `<username>` and `<password>` with your database credentials
5. Add the database name before `?` (e.g., `revision`):

```
mongodb+srv://<username>:<password>@revision-cluster.xxxxx.mongodb.net/revision?retryWrites=true&w=majority
```

---

## 2. Create Vector Search Index

The revision-app `Chunk` collection requires a vector index to use `$vectorSearch`.

### Method A: Atlas UI (Recommended)

1. Go to Atlas Console → Select your cluster
2. Click the **Search** tab
3. Click **Create Search Index**
4. Select **JSON Editor**, click **Next**
5. Configure:
   - **Database**: Select your database (e.g., `revision`)
   - **Collection**: Select `chunks` (Mongoose uses plural by default)
6. Paste the following JSON:

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 2560,
      "similarity": "cosine"
    },
    {
      "type": "filter",
      "path": "filename"
    },
    {
      "type": "filter",
      "path": "chapter"
    }
  ]
}
```

7. Set **Index Name** to `chunk_vector_index` (must match `VECTOR_INDEX` in `src/lib/search.ts`; full JSON template in `scripts/vector-index.json`)
8. Click **Create Search Index**
9. Wait for index status to become **Ready** (approximately 1–3 minutes)

> ⚠️ The `numDimensions` value must match the embedding model's output dimensions. The application detects dimensions dynamically during warmup — check the console log for the actual dimension value.

### Method B: MongoDB Shell / Compass

If using mongosh or Compass, execute:

```javascript
// Switch to the correct database
use revision

// Create vector index
db.chunks.createSearchIndex({
  name: "chunk_vector_index",
  definition: {
    fields: [
      {
        type: "vector",
        path: "embedding",
        numDimensions: 2560,
        similarity: "cosine"
      },
      { type: "filter", path: "filename" },
      { type: "filter", path: "chapter" }
    ]
  }
})
```

---

## 3. Configure .env.local

Add the following to `.env.local` in the project root:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/revision?retryWrites=true&w=majority
```

> If your password contains special characters (e.g., `@`, `#`, `:`), they need to be [URL encoded](https://www.w3schools.com/tags/ref_urlencode.asp).

---

## 4. Verify Setup

1. Start the app: `npm run dev`
2. Upload a PDF or Markdown file
3. Ask a question in the chat box

If the index is correctly configured, search and response should work normally.

---

## 5. Key Parameter Reference

| Item | Value | Description |
|------|-------|-------------|
| Vector Dimensions | Detected at startup | Default `qwen/qwen3-embedding-4b` outputs 2560 dims |
| Similarity | cosine | Matches embedding normalization method |
| Index Name | chunk_vector_index | Must match `src/lib/search.ts` |
| Collection | chunks | Collection mapped by Mongoose model `Chunk` |

---

## 6. FAQ

### Q: Getting "MongoServerError: $vectorSearch is not supported"
- Confirm you are using **MongoDB Atlas** (M0 or above); local MongoDB does not support Vector Search
- Confirm cluster version is 6.0.11+ / 7.0.2+

### Q: Search fails even after index is created
- Confirm index status is **Ready**
- Confirm collection name is `chunks` (Mongoose plural default)
- Confirm `embedding` field is a non-empty number array matching the configured `numDimensions`

### Q: Want to use a different embedding model
- If dimensions differ (e.g., 1024), modify `numDimensions` and rebuild the index
- Also update `OPENROUTER_EMBED_MODEL` in `src/lib/embedding.ts`

---

*Last updated: 2026-03-25*
