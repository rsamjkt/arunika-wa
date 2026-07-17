const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const LOCK_MS = 15 * 60 * 1000;

type Attempt = { count: number; firstAttempt: number; lockedUntil: number };

const attempts = new Map<string, Attempt>();

export function checkRateLimit(key: string): { allowed: boolean; retryAfterSec?: number } {
  const now = Date.now();
  const rec = attempts.get(key);
  if (rec?.lockedUntil && rec.lockedUntil > now) {
    return { allowed: false, retryAfterSec: Math.ceil((rec.lockedUntil - now) / 1000) };
  }
  return { allowed: true };
}

export function recordFailure(key: string) {
  const now = Date.now();
  const rec = attempts.get(key);
  if (!rec || now - rec.firstAttempt > WINDOW_MS) {
    attempts.set(key, { count: 1, firstAttempt: now, lockedUntil: 0 });
    return;
  }
  rec.count += 1;
  if (rec.count >= MAX_ATTEMPTS) {
    rec.lockedUntil = now + LOCK_MS;
  }
}

export function recordSuccess(key: string) {
  attempts.delete(key);
}

// A separate, simpler fixed-window limiter for endpoints with no
// success/failure concept (registration, password-reset requests) — every
// call counts against the limit regardless of outcome, unlike the
// lockout-on-failure model above which only reacts to bad login attempts.
type WindowRec = { count: number; windowStart: number };
const windows = new Map<string, WindowRec>();

/** Returns true if `key` is still under `maxPerWindow` calls within
 * `windowMs`, and counts this call toward that limit. */
export function checkAndCountRequest(key: string, maxPerWindow: number, windowMs: number): boolean {
  const now = Date.now();
  const rec = windows.get(key);
  if (!rec || now - rec.windowStart > windowMs) {
    windows.set(key, { count: 1, windowStart: now });
    return true;
  }
  if (rec.count >= maxPerWindow) return false;
  rec.count += 1;
  return true;
}

export function clientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const parts = xff
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    // Caddy (the only reverse-proxy hop in front of this app, see
    // /etc/caddy/Caddyfile) appends the IP it actually observed rather than
    // replacing a client-supplied header, so the trustworthy value is the
    // LAST one. Taking the first (as this used to) let an attacker send a
    // different fake X-Forwarded-For on every request to get a fresh
    // rate-limit key each time, defeating the login lockout entirely.
    if (parts.length > 0) return parts[parts.length - 1];
  }
  return headers.get("x-real-ip") ?? "unknown";
}
