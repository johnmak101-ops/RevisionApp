import { ChatOpenAI } from "@langchain/openai";

/**
 * @module lib/llm
 *
 * 共享 LLM singleton — 整個 app 只建立一次，避免每次 request 都重新初始化。
 *
 * 使用 OpenRouter 作為 OpenAI-compatible gateway，
 * 透過環境變數切換模型，方便測試不同 provider。
 */

/** OpenRouter LLM singleton（streaming 模式，用於 chat route 回應） */
export const streamingLLM = new ChatOpenAI({
  model: process.env.OPENROUTER_MODEL ?? "nvidia/nemotron-3-nano-30b-a3b:free",
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
  model: process.env.OPENROUTER_MODEL ?? "nvidia/nemotron-3-nano-30b-a3b:free",
  apiKey: process.env.OPENROUTER_API_KEY,
  configuration: {
    baseURL: "https://openrouter.ai/api/v1",
  },
  maxRetries: 1,
  streaming: false,
  temperature: 0.2,
  maxTokens: 200,
});
