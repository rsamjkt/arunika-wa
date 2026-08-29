import crypto from "node:crypto";
import { readJson, writeJson } from "./store";

export type LogEntry = {
  id: string;
  timestamp: string;
  ownerId: string;
  /** The specific user (owner or staff) who triggered a manual send —
   * left undefined for automated sends (campaign/autoreply). */
  actorId?: string;
  /** Set when the send was authenticated via an external API key
   * rather than the browser dashboard — which key, specifically. */
  apiKeyId?: string;
  direction: "out" | "in";
  session: string;
  chatId: string;
  kind: "text" | "image" | "file" | "video" | "voice" | "location" | "vcard" | "other";
  status: "sent" | "failed" | "received";
  source?: "manual" | "broadcast" | "autoreply";
  templateId?: string;
  campaignId?: string;
  error?: string;
};

const FILE = "message-log.json";
const MAX_ENTRIES = 4000;

export function logEvent(entry: Omit<LogEntry, "id" | "timestamp">) {
  try {
    const log = readJson<LogEntry[]>(FILE, []);
    log.push({ id: crypto.randomUUID(), timestamp: new Date().toISOString(), ...entry });
    const trimmed = log.length > MAX_ENTRIES ? log.slice(log.length - MAX_ENTRIES) : log;
    writeJson(FILE, trimmed);
  } catch {
    // logging must never break the caller's actual send/receive flow
  }
}

/** Cascade delete — used when a tenant account is removed entirely. */
export function deleteAllForOwner(ownerId: string): void {
  const log = readJson<LogEntry[]>(FILE, []);
  writeJson(FILE, log.filter((e) => e.ownerId !== ownerId));
}

export function getRecentLogs(ownerId: string, limit = 200): LogEntry[] {
  const log = readJson<LogEntry[]>(FILE, []).filter((e) => e.ownerId === ownerId);
  return log.slice(-limit).reverse();
}

export function getStats(ownerId: string, days = 14) {
  const log = readJson<LogEntry[]>(FILE, []).filter((e) => e.ownerId === ownerId);
  const now = Date.now();
  const cutoff = now - days * 24 * 60 * 60 * 1000;
  const recent = log.filter((e) => new Date(e.timestamp).getTime() >= cutoff);

  const byDay = new Map<string, { sent: number; failed: number; received: number }>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    byDay.set(key, { sent: 0, failed: 0, received: 0 });
  }
  for (const e of recent) {
    const key = e.timestamp.slice(0, 10);
    const bucket = byDay.get(key);
    if (!bucket) continue;
    if (e.direction === "in") bucket.received += 1;
    else if (e.status === "failed") bucket.failed += 1;
    else bucket.sent += 1;
  }

  const totalSent = recent.filter((e) => e.direction === "out" && e.status === "sent").length;
  const totalFailed = recent.filter((e) => e.direction === "out" && e.status === "failed").length;
  const totalReceived = recent.filter((e) => e.direction === "in").length;
  const successRate = totalSent + totalFailed > 0 ? totalSent / (totalSent + totalFailed) : 1;

  return {
    days: Array.from(byDay.entries()).map(([date, v]) => ({ date, ...v })),
    totalSent,
    totalFailed,
    totalReceived,
    successRate,
  };
}

/** Per-agent breakdown of manual sends over the window — entries with
 * no actorId (campaign/autoreply) are bucketed under "system". */
export function getAgentStats(ownerId: string, days = 14): { actorId: string; sent: number; failed: number }[] {
  const log = readJson<LogEntry[]>(FILE, []).filter((e) => e.ownerId === ownerId && e.direction === "out");
  const now = Date.now();
  const cutoff = now - days * 24 * 60 * 60 * 1000;
  const recent = log.filter((e) => new Date(e.timestamp).getTime() >= cutoff);

  const byActor = new Map<string, { sent: number; failed: number }>();
  for (const e of recent) {
    const key = e.actorId ?? "system";
    const bucket = byActor.get(key) ?? { sent: 0, failed: 0 };
    if (e.status === "failed") bucket.failed += 1;
    else bucket.sent += 1;
    byActor.set(key, bucket);
  }

  return Array.from(byActor.entries())
    .map(([actorId, v]) => ({ actorId, ...v }))
    .sort((a, b) => b.sent - a.sent);
}

/** Per-API-key breakdown of manual sends over the window — entries with
 * no apiKeyId (dashboard/browser sends) are bucketed under "dashboard". */
export function getApiKeyStats(ownerId: string, days = 14): { apiKeyId: string; sent: number; failed: number }[] {
  const log = readJson<LogEntry[]>(FILE, []).filter(
    (e) => e.ownerId === ownerId && e.direction === "out" && e.source === "manual",
  );
  const now = Date.now();
  const cutoff = now - days * 24 * 60 * 60 * 1000;
  const recent = log.filter((e) => new Date(e.timestamp).getTime() >= cutoff);

  const byKey = new Map<string, { sent: number; failed: number }>();
  for (const e of recent) {
    const key = e.apiKeyId ?? "dashboard";
    const bucket = byKey.get(key) ?? { sent: 0, failed: 0 };
    if (e.status === "failed") bucket.failed += 1;
    else bucket.sent += 1;
    byKey.set(key, bucket);
  }

  return Array.from(byKey.entries())
    .map(([apiKeyId, v]) => ({ apiKeyId, ...v }))
    .sort((a, b) => b.sent - a.sent);
}

/** Timestamp entri paling awal untuk sebuah session — dipakai memperkirakan
 * "umur" nomor (agar nomor lama tidak diperlakukan sebagai baru saat warmup). */
export function getSessionFirstSeen(session: string): string | null {
  const log = readJson<LogEntry[]>(FILE, []);
  let earliest: string | null = null;
  for (const e of log) {
    if (e.session !== session) continue;
    if (!earliest || e.timestamp < earliest) earliest = e.timestamp;
  }
  return earliest;
}

function wibDay(iso: string): string {
  return new Date(new Date(iso).getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** Jumlah pesan keluar BERHASIL hari ini (WIB) untuk sebuah session — untuk
 * menegakkan batas warmup harian per-nomor. Menghitung semua sumber (broadcast,
 * auto-reply, manual) karena warmup soal total volume harian sebuah nomor. */
export function getSessionSentToday(session: string): number {
  const today = wibDay(new Date().toISOString());
  const log = readJson<LogEntry[]>(FILE, []);
  let n = 0;
  for (const e of log) {
    if (e.session === session && e.direction === "out" && e.status === "sent" && wibDay(e.timestamp) === today) n++;
  }
  return n;
}

/** Kirim/gagal/masuk untuk sebuah session dalam N hari terakhir — untuk skor kesehatan. */
export function getSessionCounts(session: string, days = 7): { sent: number; failed: number; received: number } {
  const cutoff = Date.now() - days * 86_400_000;
  const log = readJson<LogEntry[]>(FILE, []);
  let sent = 0;
  let failed = 0;
  let received = 0;
  for (const e of log) {
    if (e.session !== session || new Date(e.timestamp).getTime() < cutoff) continue;
    if (e.direction === "in") received += 1;
    else if (e.status === "sent") sent += 1;
    else if (e.status === "failed") failed += 1;
  }
  return { sent, failed, received };
}
