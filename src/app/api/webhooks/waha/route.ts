import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { sendText } from "@/lib/waha";
import { logEvent } from "@/lib/messageLog";
import { deliverOutboundWebhook } from "@/lib/webhookConfig";
import { getSessionOwner } from "@/lib/tenancy";
import {
  getSettings,
  hasSeenContact,
  isWithinBusinessHours,
  markSeenContact,
  matchKeywordRule,
} from "@/lib/autoreply";

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
  if (!settings.enabled) return;

  const isNewContact = !hasSeenContact(session, chatId);
  markSeenContact(session, chatId);

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
      runAutoReply(ownerId, data.session, chatId, text).catch((err) => {
        console.error("[autoreply] failed:", err);
      });
    }
  }

  return NextResponse.json({ ok: true });
}
