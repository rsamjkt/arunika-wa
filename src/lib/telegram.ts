import { readJson, writeJson } from "./store";

// Adapter channel TELEGRAM. Config di data/telegram.json (gitignored) atau env.
// botToken = dari @BotFather; ownerId = tenant yang setelan AI-nya dipakai bot ini;
// webhookSecret = token rahasia yang dikirim balik Telegram di header (verifikasi).
const FILE = "telegram.json";
type Cfg = { botToken?: string; ownerId?: string; webhookSecret?: string };

export function getTelegramConfig(): Cfg {
  return readJson<Cfg>(FILE, {});
}
export function getTelegramToken(): string {
  return getTelegramConfig().botToken || process.env.TELEGRAM_BOT_TOKEN || "";
}
export function isTelegramConfigured(): boolean {
  const c = getTelegramConfig();
  return (c.botToken || process.env.TELEGRAM_BOT_TOKEN || "").length > 0 && !!c.ownerId;
}

export async function telegramSend(chatId: number | string, text: string): Promise<void> {
  const token = getTelegramToken();
  if (!token) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  }).catch(() => {});
}

export function setTelegramConfig(patch: Partial<Cfg>): Cfg {
  const defined = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
  const next = { ...getTelegramConfig(), ...defined };
  writeJson<Cfg>(FILE, next);
  return next;
}

export function maskedTelegramToken(): string | null {
  const t = getTelegramToken();
  if (!t) return null;
  return t.length <= 10 ? "••••" : `${t.slice(0, 6)}••••${t.slice(-4)}`;
}

/** Daftarkan webhook ke Telegram (setWebhook) menunjuk ke app ini. */
export async function setTelegramWebhook(appUrl: string): Promise<{ ok: boolean; description?: string }> {
  const token = getTelegramToken();
  if (!token) return { ok: false, description: "Bot token belum diisi." };
  const cfg = getTelegramConfig();
  const url = `${appUrl.replace(/\/$/, "")}/api/webhooks/telegram`;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, secret_token: cfg.webhookSecret || undefined, allowed_updates: ["message"] }),
    });
    const d = (await res.json()) as { ok?: boolean; description?: string };
    return { ok: !!d.ok, description: d.description };
  } catch (e) {
    return { ok: false, description: e instanceof Error ? e.message : "gagal menghubungi Telegram" };
  }
}
