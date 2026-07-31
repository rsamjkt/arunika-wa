import dns from "node:dns/promises";
import { lookup as dnsLookup } from "node:dns";
import net from "node:net";
import http from "node:http";
import https from "node:https";

// Shared guard for any server-side fetch of a caller-supplied URL — used
// wherever this app (or, via file.url, the WA engine on our behalf) fetches
// a URL that ultimately traces back to tenant/attacker input. Rejects
// anything pointing at loopback/private/link-local/cloud-metadata
// addresses so it can't be turned into an internal-network probe against
// this server or its private-network neighbors.
//
// This resolves DNS and checks the ACTUAL resolved IP address(es), not
// just the hostname string — a plain hostname-regex blocklist (the
// previous implementation) is bypassable via DNS rebinding: an
// attacker-controlled domain whose A/AAAA record points at 127.0.0.1 or
// 169.254.169.254 sails straight through a string check, then resolves to
// the private address at actual fetch time. IPv6 addresses are fully
// expanded (not string-prefix-matched) before classification — Node's own
// URL parser normalizes an IPv4-mapped literal like `::ffff:127.0.0.1`
// into hex-hextet form (`::ffff:7f00:1`), which a naive dotted-decimal
// regex silently fails to recognize as loopback.

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) return true; // malformed -> treat as unsafe
  const [a, b] = parts;
  if (a === 0) return true; // 0.0.0.0/8 ("this network" — resolves to localhost on many OSes)
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 127) return true; // 127.0.0.0/8 loopback
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local + cloud metadata (169.254.169.254)
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 (carrier-grade NAT)
  return false;
}

/** Expands any valid IPv6 literal (compressed "::" form or not) into 8
 * lowercase, zero-padded 4-hex-digit groups. Returns null if it can't be
 * parsed as IPv6 at all — callers must treat that as unsafe, not skip. */
function expandIPv6(raw: string): string[] | null {
  const ip = raw.toLowerCase();
  const doubleColonParts = ip.split("::");
  if (doubleColonParts.length > 2) return null; // "::" may appear at most once

  const parseGroups = (s: string) => (s.length === 0 ? [] : s.split(":"));
  const head = parseGroups(doubleColonParts[0]);
  const tail = doubleColonParts.length === 2 ? parseGroups(doubleColonParts[1]) : [];

  let groups: string[];
  if (doubleColonParts.length === 2) {
    const missing = 8 - head.length - tail.length;
    if (missing < 0) return null;
    groups = [...head, ...new Array(missing).fill("0"), ...tail];
  } else {
    groups = head;
  }
  if (groups.length !== 8 || groups.some((g) => !/^[0-9a-f]{1,4}$/.test(g))) return null;
  return groups.map((g) => g.padStart(4, "0"));
}

function hextetsToIPv4(high: string, low: string): string {
  const h = parseInt(high, 16);
  const l = parseInt(low, 16);
  return `${(h >> 8) & 0xff}.${h & 0xff}.${(l >> 8) & 0xff}.${l & 0xff}`;
}

function isPrivateIPv6(raw: string): boolean {
  const g = expandIPv6(raw);
  if (!g) return true; // unparseable -> can't confirm safety -> reject

  const joined = g.join(":");
  if (joined === "0000:0000:0000:0000:0000:0000:0000:0001") return true; // ::1 loopback
  if (joined === "0000:0000:0000:0000:0000:0000:0000:0000") return true; // :: unspecified

  const firstByte = parseInt(g[0].slice(0, 2), 16);
  const secondByte = parseInt(g[0].slice(2, 4), 16);
  if (firstByte === 0xfe && secondByte >= 0x80 && secondByte <= 0xbf) return true; // fe80::/10 link-local
  if (firstByte === 0xfc || firstByte === 0xfd) return true; // fc00::/7 unique local

  // IPv4-mapped (::ffff:a.b.c.d, RFC 4291 ::ffff:0:0/96) — Node's URL
  // parser normalizes the embedded IPv4 into hex hextets, so check the
  // structural pattern (first 5 groups zero, 6th = ffff) rather than
  // looking for literal dotted-decimal text.
  if (g.slice(0, 5).every((x) => x === "0000") && g[5] === "ffff") {
    return isPrivateIPv4(hextetsToIPv4(g[6], g[7]));
  }
  // IPv4-compatible (::a.b.c.d, RFC 4291 ::/96 — deprecated but still parseable)
  if (g.slice(0, 6).every((x) => x === "0000")) {
    return isPrivateIPv4(hextetsToIPv4(g[6], g[7]));
  }

  return false;
}

function isPrivateIp(ip: string): boolean {
  const version = net.isIP(ip);
  if (version === 4) return isPrivateIPv4(ip);
  if (version === 6) return isPrivateIPv6(ip);
  return true; // not a recognizable IP -> treat as unsafe
}

export async function isSafeExternalUrl(raw: string): Promise<boolean> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;

  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  if (hostname.toLowerCase() === "localhost") return false;

  // Literal IP in the URL — check directly, no DNS involved.
  if (net.isIP(hostname)) return !isPrivateIp(hostname);

  // Hostname — resolve DNS and check EVERY returned address (A and AAAA).
  // A domain resolving to even one private/loopback address is rejected,
  // since an attacker only needs one to land the SSRF.
  try {
    const records = await dns.lookup(hostname, { all: true, verbatim: true });
    if (records.length === 0) return false;
    return records.every((r) => !isPrivateIp(r.address));
  } catch {
    return false; // can't resolve -> can't confirm safety -> reject
  }
}

// DNS lookup yang MEMVALIDASI IP saat koneksi dibuat. Dipakai sebagai opsi
// `lookup` pada http/https.request → menutup celah DNS-rebinding TOCTOU:
// isSafeExternalUrl() memeriksa saat check, tapi fetch() biasa me-resolve ulang
// saat connect (bisa berpindah ke IP internal). Di sini koneksi HANYA dibuat ke
// IP yang lolos validasi; kalau resolve-nya jatuh ke IP private → connect gagal.
function validatingLookup(hostname: string, options: unknown, callback: (err: Error | null, address?: string, family?: number) => void): void {
  dnsLookup(hostname, { all: true, verbatim: true }, (err, addresses) => {
    if (err) return callback(err);
    const list = Array.isArray(addresses) ? addresses : [addresses];
    if (list.length === 0) return callback(new Error("no address"));
    for (const a of list) {
      if (isPrivateIp(a.address)) return callback(new Error("blocked: resolves to private address"));
    }
    callback(null, list[0].address, list[0].family);
  });
}

export type SafeFetchResult = { ok: boolean; status: number; redirect: boolean; text: string; error?: string };

// GET/POST yang aman-SSRF: validasi statis + koneksi hanya ke IP tervalidasi
// (validatingLookup) + TIDAK mengikuti redirect. maxBytes>0 utk membaca body
// (dibatasi); 0 = abaikan body (hemat). Tak melempar — selalu return hasil.
export async function safeFetch(
  raw: string,
  opts: { method?: string; headers?: Record<string, string>; body?: string; timeoutMs?: number; maxBytes?: number } = {},
): Promise<SafeFetchResult> {
  const empty = (error: string): SafeFetchResult => ({ ok: false, status: 0, redirect: false, text: "", error });
  if (!(await isSafeExternalUrl(raw))) return empty("URL menunjuk alamat internal / tidak valid");
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return empty("URL tidak valid");
  }
  const mod = url.protocol === "https:" ? https : http;
  const { method = "GET", headers = {}, body, timeoutMs = 8000, maxBytes = 0 } = opts;
  return new Promise<SafeFetchResult>((resolve) => {
    let settled = false;
    const done = (r: SafeFetchResult) => {
      if (!settled) {
        settled = true;
        resolve(r);
      }
    };
    const req = mod.request(
      url,
      { method, headers, lookup: validatingLookup as never, timeout: timeoutMs },
      (res) => {
        const status = res.statusCode || 0;
        if (status >= 300 && status < 400) {
          res.destroy();
          return done({ ok: false, status, redirect: true, text: "" });
        }
        if (maxBytes <= 0) {
          res.resume();
          return done({ ok: status >= 200 && status < 300, status, redirect: false, text: "" });
        }
        const chunks: Buffer[] = [];
        let total = 0;
        res.on("data", (c: Buffer) => {
          total += c.length;
          if (total <= maxBytes) chunks.push(c);
          else res.destroy();
        });
        res.on("end", () => done({ ok: status >= 200 && status < 300, status, redirect: false, text: Buffer.concat(chunks).toString("utf8") }));
        res.on("error", () => done({ ok: false, status, redirect: false, text: Buffer.concat(chunks).toString("utf8"), error: "stream error" }));
      },
    );
    req.on("timeout", () => {
      req.destroy();
      done(empty("timeout"));
    });
    req.on("error", (e: Error) => done(empty(e.message)));
    if (body) req.write(body);
    req.end();
  });
}
