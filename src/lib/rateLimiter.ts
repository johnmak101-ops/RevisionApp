/**
 * @module rateLimiter
 *
 * In-memory sliding-window rate limiter — 每個 IP per endpoint 獨立計數。
 * 適合 serverless（Vercel 單實例），唔需要 Redis。
 *
 * ⚠️ 局限：Vercel serverless function 會隨時重啟，所以呢個只係 best-effort。
 *    如果需要更嚴格嘅 rate limiting，應該用 Vercel Edge Middleware + KV。
 */

interface RateLimitEntry {
  timestamps: number[];
}

/** 存儲每個 key (IP + endpoint) 嘅 request timestamps */
const store = new Map<string, RateLimitEntry>();

/** 定期清理過期 entries（防止 memory leak） */
const CLEANUP_INTERVAL_MS = 60_000; // 1 min
let lastCleanup = Date.now();

function cleanup(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  const cutoff = now - windowMs;
  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
    if (entry.timestamps.length === 0) {
      store.delete(key);
    }
  }
}

export interface RateLimitConfig {
  /** Max requests per window */
  maxRequests: number;
  /** Window size in milliseconds */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs?: number;
}

/** 預設 configs for 各個 endpoint */
export const RATE_LIMITS = {
  chat: { maxRequests: 20, windowMs: 60_000 } as RateLimitConfig,
  quiz: { maxRequests: 10, windowMs: 60_000 } as RateLimitConfig,
  summary: { maxRequests: 10, windowMs: 60_000 } as RateLimitConfig,
} as const;

/**
 * 檢查 rate limit。
 *
 * @param key - 通常係 `${ip}:${endpoint}`
 * @param config - rate limit 設定
 * @returns `{ allowed, remaining, retryAfterMs? }`
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  cleanup(config.windowMs);

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // 移除 window 外嘅 timestamps
  const cutoff = now - config.windowMs;
  entry.timestamps = entry.timestamps.filter((t) => t > cutoff);

  if (entry.timestamps.length >= config.maxRequests) {
    const oldestInWindow = entry.timestamps[0]!;
    const retryAfterMs = oldestInWindow + config.windowMs - now;
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.max(retryAfterMs, 1000),
    };
  }

  // 允許 + 記錄
  entry.timestamps.push(now);
  return {
    allowed: true,
    remaining: config.maxRequests - entry.timestamps.length,
  };
}

/**
 * 從 NextRequest 提取 client IP。
 * Vercel 會設 x-forwarded-for，fallback 用 "unknown"。
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]!.trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}
