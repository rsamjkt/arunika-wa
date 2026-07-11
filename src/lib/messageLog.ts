import crypto from "node:crypto";
import { readJson, writeJson } from "./store";

export type LogEntry = {
  id: string;
  timestamp: string;
  ownerId: string;
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
