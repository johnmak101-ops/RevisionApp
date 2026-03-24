# Glossary

| Term | Full Name | Definition |
|------|-----------|------------|
| **RAG** | Retrieval-Augmented Generation | A technique that retrieves relevant content from a knowledge base and injects it into an LLM prompt to generate answers |
| **Embedding** | Embedding / Vector Embedding | Converting text into numerical vectors (e.g., dimensions detected at startup), enabling computation of semantic similarity between texts |
| **Chunk** | Text Chunk | A text segment after document splitting. Each chunk is independently embedded and stored |
| **Vector Search** | Vector Search | Uses cosine similarity to find chunks semantically closest to a query |
| **Cosine Similarity** | Cosine Similarity | A metric measuring directional similarity between two vectors. 1 = identical, 0 = unrelated |
| **Streaming** | Streaming Response | Token-by-token LLM response delivery, improving UX by not waiting for the complete answer |
| **NDJSON** | Newline-Delimited JSON | A format with one JSON object per line, used for Summary streaming (Chat uses Vercel AI SDK) |
| **LLM** | Large Language Model | Large Language Model (e.g., Google Gemini) |
| **OpenRouter** | OpenRouter | A unified AI API gateway that allows accessing multiple LLM models with a single API key |
| **Gemini** | Google Gemini | Google's LLM model series. This project uses `gemini-2.5-flash-lite` |
| **MCQ** | Multiple Choice Question | Multiple choice question |
| **Knowledge Gap** | Knowledge Gap Analysis | Analysis based on quiz error statistics to identify weak topics for learners |
| **Atlas** | MongoDB Atlas | MongoDB's cloud Database-as-a-Service with vector search capabilities |
| **M0** | M0 Free Tier | MongoDB Atlas's free plan with 512MB storage |
| **Warmup** | Embedding Warmup | A startup test request to pre-warm the embedding model and detect vector dimensions |
| **Keyword Fallback** | Keyword Fallback Search | A backup mechanism using regex keyword search when vector search returns no results |
| **Score Filter** | Vector Score Filter | Filters vector search results with cosine score below threshold (0.4) to avoid low-quality answers |
| **Context Window** | Context Window | Maximum token limit an LLM can process in a single request. This project limits context characters accordingly |
| **LlamaParse** | LlamaParse | Cloud PDF parsing service by LlamaIndex, supporting multilingual and scanned PDFs |
| **Ingest** | Document Ingestion | Document ingestion pipeline: upload → extract → split → embed → store |
| **Prompt Injection** | Prompt Injection Attack | An attack where users craft special input to bypass or override the LLM's system instructions |
| **Vard** | Vard Prompt Guard | Open-source prompt injection detection library (`@andersmyrmel/vard`) supporting pattern matching, category blocking, and text sanitization |
| **Rate Limiting** | Rate Limiting | Limiting the number of requests per IP within a specified time window to prevent API resource abuse |
| **ChatPromptTemplate** | LangChain Chat Prompt Template | LangChain's prompt template system that explicitly separates system and user roles, preventing users from injecting system-level instructions |
| **Multi-Query Search** | Multi-Query Search | Uses LLM to split a user question into 3 search perspectives, searches in parallel, then merges and deduplicates results to improve recall |
| **Chunk Guard** | Chunk Content Guard | Security scan during document ingestion that detects indirect prompt injection in chunk content (uses Vard pattern matching) |
| **Qwen3 Embedding** | Qwen3 Embedding 8B | Default embedding model (`qwen/qwen3-embedding-8b`), called via OpenRouter |


---

*Last updated: 2026-03-24*
