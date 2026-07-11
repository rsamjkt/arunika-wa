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

const DEFAULTS: OutboundWebhookConfig = {
  url: "",
  events: ["message", "message.ack", "session.status"],
  enabled: false,
  secret: crypto.randomBytes(24).toString("hex"),
  lastDeliveryAt: null,
  lastDeliveryOk: null,
};

export function getWebhookConfig(): OutboundWebhookConfig {
  const stored = readJson<Partial<OutboundWebhookConfig>>(FILE, DEFAULTS);
  return { ...DEFAULTS, ...stored };
}

export function updateWebhookConfig(
  patch: Partial<Pick<OutboundWebhookConfig, "url" | "events" | "enabled">>,
): OutboundWebhookConfig {
  const current = getWebhookConfig();
  const defined = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
  const next = { ...current, ...defined };
  writeJson(FILE, next);
  return next;
}

export function regenerateWebhookSecret(): OutboundWebhookConfig {
  const current = getWebhookConfig();
  const next = { ...current, secret: crypto.randomBytes(24).toString("hex") };
  writeJson(FILE, next);
  return next;
}

function recordDelivery(ok: boolean) {
  const current = getWebhookConfig();
  writeJson(FILE, { ...current, lastDeliveryAt: new Date().toISOString(), lastDeliveryOk: ok });
}

async function send(url: string, secret: string, body: unknown): Promise<boolean> {
  const payload = JSON.stringify(body);
  const signature = crypto.createHmac("sha256", secret).update(payload).digest("hex");

  for (let attempt = 0; attempt < 2; attempt++) {
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
      recordDelivery(res.ok);
      if (res.ok) return true;
    } catch {
      // fall through to retry / final failure record
    }
    if (attempt === 0) await new Promise((r) => setTimeout(r, 1500));
  }
  recordDelivery(false);
  return false;
}

export async function deliverOutboundWebhook(event: string, body: unknown) {
  const cfg = getWebhookConfig();
  if (!cfg.enabled || !cfg.url || !cfg.events.includes(event)) return;
  await send(cfg.url, cfg.secret, body);
}

/** Sends a test payload regardless of the enabled/events gate. */
export async function testOutboundWebhook(): Promise<{ ok: boolean; error?: string }> {
  const cfg = getWebhookConfig();
  if (!cfg.url) return { ok: false, error: "Belum ada URL webhook yang diset" };
  const ok = await send(cfg.url, cfg.secret, {
    event: "test",
    timestamp: Date.now(),
    payload: { message: "Ini adalah test webhook dari Arunika-WA." },
  });
  return { ok };
}
