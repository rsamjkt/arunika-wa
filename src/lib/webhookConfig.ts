import crypto from "node:crypto";
import { readJson, writeJson } from "./store";

export type OutboundWebhookConfig = {
  url: string;
  events: string[];
  enabled: boolean;
  secret: string;
  lastDeliveryAt: string | null;
  lastDeliveryOk: boolean | null;
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
  const store = allConfigs();
  store[ownerId] = { ...current, lastDeliveryAt: new Date().toISOString(), lastDeliveryOk: ok };
  writeJson(FILE, store);
}

async function send(url: string, secret: string, body: unknown): Promise<boolean> {
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
    return res.ok;
  } catch {
    return false;
  }
}

export async function deliverOutboundWebhook(ownerId: string, event: string, body: unknown) {
  const cfg = getWebhookConfig(ownerId);
  if (!cfg.enabled || !cfg.url || !cfg.events.includes(event)) return;

  let ok = await send(cfg.url, cfg.secret, body);
  if (!ok) {
    await new Promise((r) => setTimeout(r, 1500));
    ok = await send(cfg.url, cfg.secret, body);
  }
  recordDelivery(ownerId, ok);
}

/** Sends a test payload regardless of the enabled/events gate. */
export async function testOutboundWebhook(ownerId: string): Promise<{ ok: boolean; error?: string }> {
  const cfg = getWebhookConfig(ownerId);
  if (!cfg.url) return { ok: false, error: "Belum ada URL webhook yang diset" };
  const ok = await send(cfg.url, cfg.secret, {
    event: "test",
    timestamp: Date.now(),
    payload: { message: "Ini adalah test webhook dari Arunika-WA." },
  });
  recordDelivery(ownerId, ok);
  return { ok };
}
