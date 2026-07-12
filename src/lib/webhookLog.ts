import crypto from "node:crypto";
import { readJson, writeJson } from "./store";

export type WebhookLogEntry = {
  id: string;
  timestamp: string;
  ownerId: string;
  event: string;
  ok: boolean;
  status?: number;
  error?: string;
};

const FILE = "webhook-log.json";
const MAX_ENTRIES = 2000;

export function logWebhookDelivery(entry: Omit<WebhookLogEntry, "id" | "timestamp">) {
  try {
    const log = readJson<WebhookLogEntry[]>(FILE, []);
    log.push({ id: crypto.randomUUID(), timestamp: new Date().toISOString(), ...entry });
    const trimmed = log.length > MAX_ENTRIES ? log.slice(log.length - MAX_ENTRIES) : log;
    writeJson(FILE, trimmed);
  } catch {
    // logging must never break the actual delivery flow
  }
}

export function getRecentWebhookDeliveries(ownerId: string, limit = 20): WebhookLogEntry[] {
  const log = readJson<WebhookLogEntry[]>(FILE, []).filter((e) => e.ownerId === ownerId);
  return log.slice(-limit).reverse();
}

/** Cascade delete — used when a tenant account is removed entirely. */
export function deleteWebhookLogForOwner(ownerId: string): void {
  const log = readJson<WebhookLogEntry[]>(FILE, []);
  writeJson(FILE, log.filter((e) => e.ownerId !== ownerId));
}

export function getWebhookStats(ownerId: string, days = 14) {
  const log = readJson<WebhookLogEntry[]>(FILE, []).filter((e) => e.ownerId === ownerId);
  const now = Date.now();
  const cutoff = now - days * 24 * 60 * 60 * 1000;
  const recent = log.filter((e) => new Date(e.timestamp).getTime() >= cutoff);

  const totalOk = recent.filter((e) => e.ok).length;
  const totalFailed = recent.filter((e) => !e.ok).length;
  const successRate = totalOk + totalFailed > 0 ? totalOk / (totalOk + totalFailed) : 1;

  return { totalOk, totalFailed, successRate };
}
