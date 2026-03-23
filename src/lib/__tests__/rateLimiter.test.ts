import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  checkRateLimit,
  getClientIp,
  type RateLimitConfig,
} from "@/lib/rateLimiter";

/**
 * Rate limiter tests — 用 vi.useFakeTimers 控制時間。
 */
describe("checkRateLimit", () => {
  const config: RateLimitConfig = { maxRequests: 3, windowMs: 10_000 };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("allows requests within limit", () => {
    const key = "test-ip:chat";
    const r1 = checkRateLimit(key, config);
    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(2);

    const r2 = checkRateLimit(key, config);
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(1);

    const r3 = checkRateLimit(key, config);
    expect(r3.allowed).toBe(true);
    expect(r3.remaining).toBe(0);
  });

  it("blocks when limit exceeded", () => {
    const key = "block-ip:chat";
    checkRateLimit(key, config);
    checkRateLimit(key, config);
    checkRateLimit(key, config);

    const blocked = checkRateLimit(key, config);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });

  it("allows again after window resets", () => {
    const key = "reset-ip:chat";
    checkRateLimit(key, config);
    checkRateLimit(key, config);
    checkRateLimit(key, config);

    // Advance past the window
    vi.advanceTimersByTime(11_000);

    const afterReset = checkRateLimit(key, config);
    expect(afterReset.allowed).toBe(true);
  });

  it("isolates different keys", () => {
    const key1 = "ip1:chat";
    const key2 = "ip2:chat";

    checkRateLimit(key1, config);
    checkRateLimit(key1, config);
    checkRateLimit(key1, config);

    // key1 is exhausted but key2 should be fresh
    const r1 = checkRateLimit(key1, config);
    const r2 = checkRateLimit(key2, config);

    expect(r1.allowed).toBe(false);
    expect(r2.allowed).toBe(true);
  });
});

describe("getClientIp", () => {
  it("extracts IP from x-forwarded-for", () => {
    const req = new Request("http://localhost", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  it("falls back to x-real-ip", () => {
    const req = new Request("http://localhost", {
      headers: { "x-real-ip": "9.8.7.6" },
    });
    expect(getClientIp(req)).toBe("9.8.7.6");
  });

  it("returns 'unknown' when no IP headers", () => {
    const req = new Request("http://localhost");
    expect(getClientIp(req)).toBe("unknown");
  });
});
