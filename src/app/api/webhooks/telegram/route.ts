import { NextRequest, NextResponse } from "next/server";
import { getTelegramConfig, telegramSend } from "@/lib/telegram";
import { getAISettings, canUseAIToday, recordAIUsage } from "@/lib/aiAutoReply";
import { isModelConfigured } from "@/lib/aiClient";
import { generateChannelReply } from "@/lib/arunikaBrain";
import { needsHumanHandoff } from "@/lib/handoff";

// Webhook Telegram — Arunika menjawab di Telegram memakai "otak" yang sama
// (persona + KB/RAG + model-router + mode agent). Multiplatform: WA & Telegram
// berbagi satu otak. Selalu balas 200 agar Telegram tidak retry membanjiri.
export async function POST(req: NextRequest) {
  const cfg = getTelegramConfig();
  // Verifikasi secret (bila diatur saat setWebhook) — tolak diam-diam bila salah.
  if (cfg.webhookSecret) {
    if (req.headers.get("x-telegram-bot-api-secret-token") !== cfg.webhookSecret) {
      return NextResponse.json({ ok: true });
    }
  }

  const update = await req.json().catch(() => null);
  const msg = update?.message;
  const text: unknown = msg?.text;
  const chatId: unknown = msg?.chat?.id;
  if (typeof text !== "string" || !text.trim() || (typeof chatId !== "number" && typeof chatId !== "string") || !cfg.ownerId) {
    return NextResponse.json({ ok: true });
  }

  const ownerId = cfg.ownerId;
  const settings = getAISettings(ownerId);
  if (!settings.enabled || !isModelConfigured(settings.model) || !canUseAIToday(ownerId)) {
    return NextResponse.json({ ok: true });
  }

  try {
    let reply: string;
    if (needsHumanHandoff(text)) {
      reply = "Baik, akan saya sambungkan ke tim kami ya 🙏 Mohon tunggu sebentar.";
    } else {
      reply = await generateChannelReply({
        ownerId,
        settings,
        session: "telegram",
        chatId: `tg-${chatId}`,
        transcript: `Pelanggan: ${text}`,
        latestInbound: text,
      });
      recordAIUsage(ownerId);
    }
    await telegramSend(chatId, reply);
  } catch (err) {
    console.error("[telegram] gagal memproses update:", err);
  }
  return NextResponse.json({ ok: true });
}
