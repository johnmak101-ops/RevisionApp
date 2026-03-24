import vard, { PromptInjectionError } from "@andersmyrmel/vard";

/**
 * @module promptGuard
 *
 * Prompt injection 防護層 — 用 Vard 做 pattern-based detection。
 * 提供兩個 helper:
 * - `guardUserMessage()` — chat 用，block + sanitize
 * - `guardDocumentId()` — quiz/summary 用，驗證 documentId 格式
 */

// ─── Chat guard ────────────────────────────────
// Moderate preset + custom delimiters 保護 prompt 結構
const chatGuard = vard
  .moderate()
  .delimiters(["CONTEXT:", "USER QUERY:", "CHAT HISTORY:", "SYSTEM:"])
  .maxLength(2000)
  .block("instructionOverride")
  .block("systemPromptLeak")
  .block("roleManipulation")
  .sanitize("delimiterInjection")
  .sanitize("encoding")
  // Custom patterns for common jailbreaks Vard doesn't cover by default
  .pattern(/you are now \w+/i, 0.9, "roleManipulation")
  .pattern(/act as (?:if you|an? )(?:unrestricted|unfiltered|evil)/i, 0.9, "roleManipulation")
  .pattern(/repeat (?:the|your) (?:system|initial|original) (?:prompt|message|instructions?)/i, 0.95, "systemPromptLeak")
  .pattern(/(?:show|reveal|display|output) (?:the|your) (?:system|hidden|secret) (?:prompt|instructions?|message)/i, 0.95, "systemPromptLeak");

/** 用戶訊息上限（chars） */
export const MAX_USER_MESSAGE_LENGTH = 2000;

export interface GuardResult {
  safe: boolean;
  sanitizedText?: string;
  reason?: string;
}

/**
 * 驗證 + sanitize 用戶 chat 訊息。
 *
 * @returns `{ safe: true, sanitizedText }` 或 `{ safe: false, reason }`
 */
export function guardUserMessage(text: string): GuardResult {
  if (!text || text.trim().length === 0) {
    return { safe: false, reason: "Message cannot be empty" };
  }

  if (text.length > MAX_USER_MESSAGE_LENGTH) {
    return {
      safe: false,
      reason: `Message too long (max ${MAX_USER_MESSAGE_LENGTH} characters)`,
    };
  }

  const result = chatGuard.safeParse(text);

  if (result.safe) {
    return { safe: true, sanitizedText: result.data };
  }

  // Log for monitoring (但唔 expose 俾用戶)
  console.warn(
    "[PromptGuard] Injection detected:",
    result.threats.map((t) => `${t.type}(${t.severity})`).join(", ")
  );

  return {
    safe: false,
    reason:
      "Your message was flagged by our safety system. Please rephrase your question about the course material.",
  };
}

/**
 * 驗證 documentId — 應該係 MongoDB ObjectId 格式 (24 hex chars)。
 */
export function guardDocumentId(id: unknown): id is string {
  if (typeof id !== "string") return false;
  return /^[a-f0-9]{24}$/i.test(id);
}

// ─── Chunk content guard ────────────────────────
// Lighter config — 唔需要 maxLength / delimiters，
// 只偵測 injection patterns，用於 ingest 時掃描 document chunks。
const chunkGuard = vard
  .moderate()
  .block("instructionOverride")
  .block("systemPromptLeak")
  .block("roleManipulation")
  .sanitize("delimiterInjection")
  .sanitize("encoding")
  // Common indirect injection patterns found in documents
  .pattern(/ignore (?:all )?(?:previous|above|prior) (?:instructions?|prompts?|rules?)/i, 0.9, "instructionOverride")
  .pattern(/disregard (?:all )?(?:previous|above|prior|your) (?:instructions?|prompts?|rules?|guidelines?)/i, 0.9, "instructionOverride")
  .pattern(/you are now (?:a |an )?/i, 0.85, "roleManipulation")
  .pattern(/from now on,? (?:you |act |behave )/i, 0.85, "roleManipulation")
  .pattern(/(?:new|override|replace) (?:system |base )?(?:prompt|instructions?|persona)/i, 0.9, "instructionOverride")
  .pattern(/\[system\]|\[INST\]|<\|im_start\|>|<\|system\|>/i, 0.95, "instructionOverride");

export interface ChunkGuardResult {
  /** chunk index → threat types */
  flagged: Map<number, string[]>;
  /** Total number of flagged chunks */
  flaggedCount: number;
}

/**
 * 掃描 chunk 內容，偵測 indirect prompt injection。
 *
 * @param chunks - `{ content: string }[]` 從 chunkText() 出嚟嘅 chunks
 * @returns flagged chunks 嘅 index + threat types，caller 負責 strip
 */
export function guardChunkContent(
  chunks: { content: string }[]
): ChunkGuardResult {
  const flagged = new Map<number, string[]>();

  for (let i = 0; i < chunks.length; i++) {
    const result = chunkGuard.safeParse(chunks[i].content);
    if (!result.safe) {
      const threats = result.threats.map(
        (t) => `${t.type}(${t.severity})`
      );
      flagged.set(i, threats);
      console.warn(
        `[ChunkGuard] Flagged chunk #${i}: ${threats.join(", ")}`
      );
    }
  }

  return { flagged, flaggedCount: flagged.size };
}
