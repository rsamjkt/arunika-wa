import crypto from "node:crypto";
import { readJson, writeJson } from "./store";
import { logWebhookDelivery } from "./webhookLog";
import { createNotification } from "./notifications";

const CONSECUTIVE_FAILURE_THRESHOLD = 3;

export type OutboundWebhookConfig = {
  url: string;
  events: string[];
  enabled: boolean;
  secret: string;
  lastDeliveryAt: string | null;
  lastDeliveryOk: boolean | null;
  consecutiveFailures: number;
  failureNotified: boolean;
};

const FILE = "webhook-config.json";

function defaults(): OutboundWebhookConfig {
  return {
    url: "",
    events: ["message", "message.ack", "session.status"],
    enabled: false,
    secret: crypto.randomBytes(24).toString("hex"),
    lastDeliveryAt: null,
    lastDeliveryOk: null,
    consecutiveFailures: 0,
    failureNotified: false,
  };
}

type Store = Record<string, OutboundWebhookConfig>;

function allConfigs(): Store {
  return readJson<Store>(FILE, {});
}

export function getWebhookConfig(ownerId: string): OutboundWebhookConfig {
  const store = allConfigs();
  const stored = store[ownerId];
  if (stored) return { ...defaults(), ...stored };

  // First read for this tenant — persist a freshly generated secret so it
  // doesn't change on every subsequent call.
  const fresh = defaults();
  store[ownerId] = fresh;
  writeJson(FILE, store);
  return fresh;
}

export function updateWebhookConfig(
  ownerId: string,
  patch: Partial<Pick<OutboundWebhookConfig, "url" | "events" | "enabled">>,
): OutboundWebhookConfig {
  const current = getWebhookConfig(ownerId);
  const defined = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
  const next = { ...current, ...defined };
  const store = allConfigs();
  store[ownerId] = next;
  writeJson(FILE, store);
  return next;
}

/** Cascade delete — used when a tenant account is removed entirely. */
export function deleteConfigForOwner(ownerId: string): void {
  const store = allConfigs();
  delete store[ownerId];
  writeJson(FILE, store);
}

export function regenerateWebhookSecret(ownerId: string): OutboundWebhookConfig {
  const current = getWebhookConfig(ownerId);
  const next = { ...current, secret: crypto.randomBytes(24).toString("hex") };
  const store = allConfigs();
  store[ownerId] = next;
  writeJson(FILE, store);
  return next;
}

function recordDelivery(ownerId: string, ok: boolean) {
  const current = getWebhookConfig(ownerId);
  const consecutiveFailures = ok ? 0 : current.consecutiveFailures + 1;
  const store = allConfigs();
  store[ownerId] = {
    ...current,
    lastDeliveryAt: new Date().toISOString(),
    lastDeliveryOk: ok,
    consecutiveFailures,
    // Reset once it recovers, so a future run of failures notifies again
    // instead of staying silent forever after the first alert.
    failureNotified: ok ? false : current.failureNotified,
  };
  writeJson(FILE, store);

  if (!ok && consecutiveFailures >= CONSECUTIVE_FAILURE_THRESHOLD && !current.failureNotified) {
    store[ownerId].failureNotified = true;
    writeJson(FILE, store);
    createNotification(
      ownerId,
      "webhook_failing",
      "Webhook gagal berkali-kali",
      `Pengiriman webhook ke ${current.url} gagal ${consecutiveFailures}x berturut-turut.`,
      "/settings/webhook",
    );
  }
}

type SendResult = { ok: boolean; status?: number; error?: string };

async function send(url: string, secret: string, body: unknown): Promise<SendResult> {
  const payload = JSON.stringify(body);
  const signature = crypto.createHmac("sha256", secret).update(payload).digest("hex");

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Hmac": signature,
        "User-Agent": "Arunika-WA-Webhook/1.0",
      },
      body: payload,
      signal: AbortSignal.timeout(8000),
    });
    return { ok: res.ok, status: res.status };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function deliverOutboundWebhook(ownerId: string, event: string, body: unknown) {
  const cfg = getWebhookConfig(ownerId);
  if (!cfg.enabled || !cfg.url || !cfg.events.includes(event)) return;

  let result = await send(cfg.url, cfg.secret, body);
  if (!result.ok) {
    await new Promise((r) => setTimeout(r, 1500));
    result = await send(cfg.url, cfg.secret, body);
  }
  recordDelivery(ownerId, result.ok);
  logWebhookDelivery({ ownerId, event, ok: result.ok, status: result.status, error: result.error });
}

/** Sends a test payload regardless of the enabled/events gate. */
export async function testOutboundWebhook(ownerId: string): Promise<{ ok: boolean; error?: string }> {
  const cfg = getWebhookConfig(ownerId);
  if (!cfg.url) return { ok: false, error: "Belum ada URL webhook yang diset" };
  const result = await send(cfg.url, cfg.secret, {
    event: "test",
    timestamp: Date.now(),
    payload: { message: "Ini adalah test webhook dari Arunika-WA." },
  });
  recordDelivery(ownerId, result.ok);
  logWebhookDelivery({ ownerId, event: "test", ok: result.ok, status: result.status, error: result.error });
  return { ok: result.ok, error: result.error };
}
