import { readJson } from "./store";

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
