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
  // connect.arunify.id resolves to Cloudflare's anycast IPs (confirmed via
  // DNS + `server: cloudflare` on live responses) — Cloudflare sits in
  // front of this box's Caddy, which is itself in front of the app. That
  // makes CF-Connecting-IP the most trustworthy source: Cloudflare's edge
  // always sets it fresh from the real TCP connection it terminated,
  // overwriting any client-supplied value, so it can't be spoofed the way
  // X-Forwarded-For can. Prefer it when present.
  const cfIp = headers.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim();

  // Fallback for direct (non-Cloudflare-fronted) access — e.g. hitting the
  // origin IP directly, or if the domain is ever moved off Cloudflare.
  // Caddy (the reverse-proxy hop, see /etc/caddy/Caddyfile) appends the IP
  // it actually observed rather than replacing a client-supplied header,
  // so the trustworthy value in that case is the LAST one — taking the
  // first let an attacker send a different fake X-Forwarded-For on every
  // request to get a fresh rate-limit key each time.
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const parts = xff
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1];
  }
  return headers.get("x-real-ip") ?? "unknown";
}
