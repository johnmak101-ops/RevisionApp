import { ChatOpenAI } from "@langchain/openai";

/**
 * @module lib/llm
 *
 * 共享 LLM singleton — chat route 同 search module 共用，避免每次 request 都重新初始化。
 * （quiz / summary routes 因 config 不同，各自建立獨立嘅 ChatOpenAI instance。）
 *
 * 使用 OpenRouter 作為 OpenAI-compatible gateway，
 * 透過環境變數切換模型，方便測試不同 provider。
 */

/** OpenRouter LLM singleton（streaming 模式，用於 chat route 回應） */
export const streamingLLM = new ChatOpenAI({
  model: process.env.OPENROUTER_MODEL ?? "google/gemini-2.5-flash-lite",
  apiKey: process.env.OPENROUTER_API_KEY,
  configuration: {
    baseURL: "https://openrouter.ai/api/v1",
  },
  maxRetries: 2,
  streaming: true,
});

/**
 * 輕量 LLM singleton（非 streaming，用於工具呼叫如 multi-query 生成）。
 * 溫度設低（0.2）確保輸出穩定，max_tokens 設小節省費用。
 */
export const toolLLM = new ChatOpenAI({
  model: process.env.OPENROUTER_MODEL ?? "google/gemini-2.5-flash-lite",
  apiKey: process.env.OPENROUTER_API_KEY,
  configuration: {
    baseURL: "https://openrouter.ai/api/v1",
  },
  maxRetries: 1,
  streaming: false,
  temperature: 0.2,
  maxTokens: 200,
});
