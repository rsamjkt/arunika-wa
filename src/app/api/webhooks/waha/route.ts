import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getMessages, sendText } from "@/lib/waha";
import { logEvent } from "@/lib/messageLog";
import { deliverOutboundWebhook } from "@/lib/webhookConfig";
import { getSessionOwner } from "@/lib/tenancy";
import { checkLeadOptOut } from "@/lib/leadOutreach";
import {
  getSettings,
  hasSeenContact,
  isWithinBusinessHours,
  markSeenContact,
  matchKeywordRule,
} from "@/lib/autoreply";
import { canUseAIToday, getAISettings, recordAIUsage, type AIAutoReplySettings } from "@/lib/aiAutoReply";
import { generateAIReply, isModelConfigured } from "@/lib/aiClient";

const WEBHOOK_SECRET = process.env.WAHA_WEBHOOK_SECRET ?? "";

function verifySignature(rawBody: string, signature: string | null): boolean {
  if (!signature || !WEBHOOK_SECRET) return false;
  const expected = crypto.createHmac("sha512", WEBHOOK_SECRET).update(rawBody).digest("hex");
  const a = Buffer.from(signature, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

interface WahaWebhookPayload {
  event: string;
  session: string;
  payload: {
    id?: string;
    from?: string;
    to?: string;
    fromMe?: boolean;
    body?: string;
    hasMedia?: boolean;
  };
}

async function runAutoReply(ownerId: string, session: string, chatId: string, text: string) {
  const settings = getSettings(ownerId);
  const aiSettings = getAISettings(ownerId);
  if (!settings.enabled && !aiSettings.enabled) return;

  const isNewContact = !hasSeenContact(session, chatId);
  markSeenContact(session, chatId);

  if (settings.enabled) {
    if (isNewContact && settings.welcomeEnabled) {
      await sendReply(ownerId, session, chatId, settings.welcomeMessage);
      return;
    }

    if (!isWithinBusinessHours(settings)) {
      if (settings.outsideHoursEnabled) {
        await sendReply(ownerId, session, chatId, settings.outsideHoursMessage);
      }
      return;
    }

    const rule = matchKeywordRule(settings, text);
    if (rule) {
      await sendReply(ownerId, session, chatId, rule.reply);
      return;
    }
  }

  // AI auto-reply is a fallback layer, independent of the keyword bot's own
  // on/off switch — only reached when no keyword rule matched (or keyword
  // auto-reply is off entirely).
  if (aiSettings.enabled) {
    scheduleAIAutoReply(ownerId, session, chatId, aiSettings);
  }
}

// Debounces rapid-fire messages from the same chat (very common on
// WhatsApp — people send 2-3 short messages in a row instead of one).
// Without this, each message would independently trigger its own paid AI
// call and its own reply, producing disjointed multi-message bursts and
// multiplying cost for what should be a single coherent answer. Keyed by
// session+chat; in-memory is fine since this is a persistent `next start`
// process (same pattern as campaigns.ts's activeCampaigns Set).
const aiDebounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
const AI_DEBOUNCE_MS = 3000;

function scheduleAIAutoReply(ownerId: string, session: string, chatId: string, aiSettings: AIAutoReplySettings) {
  const key = `${session}:${chatId}`;
  const existing = aiDebounceTimers.get(key);
  if (existing) clearTimeout(existing);
  const timer = setTimeout(() => {
    aiDebounceTimers.delete(key);
    runAIAutoReply(ownerId, session, chatId, aiSettings).catch((err) => {
      console.error("[ai-autoreply] failed:", err);
    });
  }, AI_DEBOUNCE_MS);
  aiDebounceTimers.set(key, timer);
}

function buildSystemPrompt(settings: AIAutoReplySettings): string {
  return [
    `Anda adalah asisten customer service WhatsApp untuk ${settings.businessName || "sebuah bisnis"}.`,
    `Gaya bicara: ${settings.tone}.`,
    `Jawab HANYA berdasarkan informasi bisnis di bawah ini. Jika pertanyaan pelanggan tidak bisa dijawab dari informasi tersebut, katakan dengan jujur bahwa Anda akan menghubungkan ke tim, jangan mengarang jawaban.`,
    `--- Informasi bisnis ---`,
    settings.knowledgeBase.trim() || "(belum ada informasi tambahan yang diberikan)",
    `--- selesai ---`,
    `Jawab singkat (maksimal 3-4 kalimat pendek), dalam Bahasa Indonesia, gaya percakapan WhatsApp — bukan email formal.`,
  ].join("\n");
}

async function runAIAutoReply(ownerId: string, session: string, chatId: string, aiSettings: AIAutoReplySettings) {
  if (!isModelConfigured(aiSettings.model) || !canUseAIToday(ownerId)) return;
  try {
    const history = await getMessages(session, chatId, 10).catch(() => []);
    const transcript = history
      .slice()
      .reverse()
      .map((m) => `${m.fromMe ? "Anda" : "Pelanggan"}: ${m.body || (m.hasMedia ? "[mengirim media]" : "")}`)
      .join("\n");

    const reply = await generateAIReply(
      buildSystemPrompt(aiSettings),
      `${transcript}\n\nBalas pesan terakhir dari pelanggan di atas.`,
      aiSettings.model,
    );
    recordAIUsage(ownerId);
    await sendReply(ownerId, session, chatId, reply);
  } catch (err) {
    console.error("[ai-autoreply] failed:", err);
  }
}

async function sendReply(ownerId: string, session: string, chatId: string, text: string) {
  try {
    await sendText(session, chatId, text);
    logEvent({ ownerId, direction: "out", session, chatId, kind: "text", status: "sent", source: "autoreply" });
  } catch (err) {
    logEvent({
      ownerId,
      direction: "out",
      session,
      chatId,
      kind: "text",
      status: "failed",
      source: "autoreply",
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-webhook-hmac");

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let data: WahaWebhookPayload;
  try {
    data = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const ownerId = getSessionOwner(data.session);
  if (!ownerId) {
    // Session not (yet) attributed to any tenant — nothing to log or act on.
    return NextResponse.json({ ok: true });
  }

  // Forward to the owning tenant's configured outbound webhook (if any)
  // without blocking the response — WAHA expects a fast 200 or it retries.
  deliverOutboundWebhook(ownerId, data.event, data).catch(() => {});

  if (data.event === "message" && data.payload && !data.payload.fromMe) {
    const chatId = data.payload.from;
    const text = data.payload.body ?? "";
    logEvent({
      ownerId,
      direction: "in",
      session: data.session,
      chatId: chatId ?? "unknown",
      kind: data.payload.hasMedia ? "other" : "text",
      status: "received",
    });
    if (chatId) {
      checkLeadOptOut(data.session, chatId, text);
      runAutoReply(ownerId, data.session, chatId, text).catch((err) => {
        console.error("[autoreply] failed:", err);
      });
    }
  }

  return NextResponse.json({ ok: true });
}
