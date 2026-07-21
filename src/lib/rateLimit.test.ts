import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkAndCountRequest, checkRateLimit, clientIp, recordFailure, recordSuccess } from "./rateLimit";

describe("checkRateLimit / recordFailure / recordSuccess (login lockout)", () => {
  it("allows a key with no recorded attempts", () => {
    expect(checkRateLimit("fresh-key-1")).toEqual({ allowed: true });
  });

  it("locks out after 5 recorded failures within the window", () => {
    const key = "lockout-key-1";
    for (let i = 0; i < 4; i++) recordFailure(key);
    expect(checkRateLimit(key).allowed).toBe(true); // still under the 5-attempt threshold

    recordFailure(key); // 5th failure crosses MAX_ATTEMPTS
    const result = checkRateLimit(key);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSec).toBeGreaterThan(0);
  });

  it("recordSuccess clears a key's lockout state entirely", () => {
    const key = "lockout-key-2";
    for (let i = 0; i < 5; i++) recordFailure(key);
    expect(checkRateLimit(key).allowed).toBe(false);

    recordSuccess(key);
    expect(checkRateLimit(key)).toEqual({ allowed: true });
  });

  it("tracks separate keys independently", () => {
    for (let i = 0; i < 5; i++) recordFailure("victim-a");
    expect(checkRateLimit("victim-a").allowed).toBe(false);
    expect(checkRateLimit("victim-b").allowed).toBe(true);
  });
});

describe("checkAndCountRequest (fixed-window limiter)", () => {
  it("allows calls up to the max, then blocks the next one in the same window", () => {
    const key = `window-key-${Math.random()}`;
    expect(checkAndCountRequest(key, 3, 60_000)).toBe(true);
    expect(checkAndCountRequest(key, 3, 60_000)).toBe(true);
    expect(checkAndCountRequest(key, 3, 60_000)).toBe(true);
    expect(checkAndCountRequest(key, 3, 60_000)).toBe(false); // 4th call exceeds max of 3
  });

  it("resets the count once the window has elapsed", () => {
    vi.useFakeTimers();
    try {
      const key = `window-reset-${Math.random()}`;
      expect(checkAndCountRequest(key, 1, 1000)).toBe(true);
      expect(checkAndCountRequest(key, 1, 1000)).toBe(false);

      vi.advanceTimersByTime(1001);
      expect(checkAndCountRequest(key, 1, 1000)).toBe(true); // new window, count reset
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("clientIp", () => {
  beforeEach(() => {
    // no-op, each test builds its own Headers
  });

  it("prefers CF-Connecting-IP when present (Cloudflare edge, unspoofable)", () => {
    const headers = new Headers({
      "cf-connecting-ip": "1.2.3.4",
      "x-forwarded-for": "9.9.9.9, 8.8.8.8",
    });
    expect(clientIp(headers)).toBe("1.2.3.4");
  });

  it("falls back to the LAST X-Forwarded-For entry when no CF header (Caddy appends its observed peer)", () => {
    const headers = new Headers({ "x-forwarded-for": "203.0.113.5, 198.51.100.9" });
    expect(clientIp(headers)).toBe("198.51.100.9");
  });

  it("falls back to X-Real-IP when neither CF nor XFF headers are present", () => {
    const headers = new Headers({ "x-real-ip": "5.6.7.8" });
    expect(clientIp(headers)).toBe("5.6.7.8");
  });

  it("returns 'unknown' when no IP-carrying header is present at all", () => {
    expect(clientIp(new Headers())).toBe("unknown");
  });
});
