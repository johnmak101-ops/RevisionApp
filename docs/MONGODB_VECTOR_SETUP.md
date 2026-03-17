# MongoDB 向量資料庫設定指南

revision-app 使用 MongoDB Atlas 的 **Vector Search** 功能，需在 Atlas 上建立叢集與向量索引。

---

## 一、建立 MongoDB Atlas 帳號與叢集

### 1. 註冊 / 登入
- 前往 [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- 使用 Google / GitHub 或 Email 註冊

### 2. 建立免費叢集
1. 點擊 **Build a Database**
2. 選擇 **M0 FREE**（免費方案）
3. 選擇雲端供應商與區域（建議選離你較近的，如 `AWS ap-northeast-1`）
4. 叢集名稱可自訂（例如 `revision-cluster`）
5. 點擊 **Create**

### 3. 建立資料庫使用者
1. 在 **Security Quickstart** 選擇 **Username and Password**
2. 輸入使用者名稱與密碼（請妥善保存）
3. 點擊 **Create Database User**

### 4. 設定網路存取
1. 在 **Where would you like to connect from?** 選擇 **My Local Environment**
2. 點擊 **Add My Current IP Address**（或選 **Allow Access from Anywhere** `0.0.0.0/0` 以方便開發，正式環境建議限制 IP）

### 5. 取得連線字串
1. 點擊 **Connect**
2. 選擇 **Drivers**（或 Compass）
3. 複製連線字串，格式如下：

```
mongodb+srv://<username>:<password>@revision-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

4. 將 `<username>` 和 `<password>` 替換為你的資料庫帳密
5. 在 `?` 前加上資料庫名稱（例如 `revision`）：

```
mongodb+srv://<username>:<password>@revision-cluster.xxxxx.mongodb.net/revision?retryWrites=true&w=majority
```

---

## 二、建立 Vector Search 索引

revision-app 的 `Chunk` collection 需要一個向量索引，才能使用 `$vectorSearch`。

### 方法 A：Atlas UI 建立（建議）

1. 進入 Atlas 控制台 → 選擇你的叢集
2. 點擊 **Search** 標籤
3. 點擊 **Create Search Index**
4. 選擇 **JSON Editor**，點擊 **Next**
5. 設定：
   - **Database**: 選擇你的資料庫（例如 `revision`）
   - **Collection**: 選擇 `chunks`（Mongoose 預設會用複數）
6. 貼上以下 JSON：

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 768,
      "similarity": "cosine"
    }
  ]
}
```

7. **Index Name** 設為 `chunk_vector_index`（需與 `src/lib/search.ts` 中的 `VECTOR_INDEX` 一致）
8. 點擊 **Create Search Index**
9. 等待索引狀態變為 **Ready**（約 1–3 分鐘）

### 方法 B：MongoDB Shell / Compass

若使用 mongosh 或 Compass，可執行：

```javascript
// 切換到正確的資料庫
use revision

// 建立向量索引
db.chunks.createSearchIndex({
  name: "chunk_vector_index",
  definition: {
    fields: [
      {
        type: "vector",
        path: "embedding",
        numDimensions: 768,
        similarity: "cosine"
      }
    ]
  }
})
```

---

## 三、設定 .env.local

在專案根目錄的 `.env.local` 加入：

```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/revision?retryWrites=true&w=majority
```

> 若密碼含特殊字元（如 `@`, `#`, `:`），需進行 [URL 編碼](https://www.w3schools.com/tags/ref_urlencode.asp)。

---

## 四、驗證設定

1. 啟動 app：`npm run dev`
2. 上傳一份 PDF 或 Markdown
3. 在聊天框發問

若索引正確，應能正常搜尋並回覆。

---

## 五、重要參數對照

| 項目 | 值 | 說明 |
|------|-----|------|
| 向量維度 | 768 | 來自 Ollama `nomic-embed-text` |
| 相似度 | cosine | 與 embedding 的 normalize 方式一致 |
| 索引名稱 | chunk_vector_index | 需與 `src/lib/search.ts` 一致 |
| Collection | chunks | Mongoose model `Chunk` 對應的 collection |

---

## 六、常見問題

### Q: 出現 "MongoServerError: $vectorSearch is not supported"
- 確認使用 **MongoDB Atlas**（M0 以上），本地 MongoDB 不支援 Vector Search
- 確認叢集版本為 6.0.11+ / 7.0.2+

### Q: 索引建立後仍搜尋失敗
- 確認索引狀態為 **Ready**
- 確認 collection 名稱是 `chunks`（Mongoose 預設複數）
- 確認 `embedding` 欄位為長度 768 的 number 陣列

### Q: 想換成其他 embedding 模型
- 若維度不同（例如 768），需修改 `numDimensions` 並重建索引
- 同時更新 `src/lib/embedding.ts` 與 `src/models/Chunk.ts` 的驗證
