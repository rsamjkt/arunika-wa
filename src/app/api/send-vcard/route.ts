import { NextRequest, NextResponse } from "next/server";
import { sendContactVcard, WahaError, type VCardContact } from "@/lib/waha";
import { logEvent } from "@/lib/messageLog";
import { getCurrentApiKey } from "@/lib/currentUser";
import { getSessionOwner, requireSessionAccess } from "@/lib/tenancy";
import { hasQuotaRemaining, quotaExceededResponse } from "@/lib/authz";
import { incrementQuotaUsage } from "@/lib/users";
import { parseJsonBody } from "@/lib/parseJsonBody";

export async function POST(req: NextRequest) {
  const { body, response: parseError } = await parseJsonBody(req);
  if (parseError) return parseError;
  const { session, chatId, contacts } = body!;
  if (!session || !chatId || !Array.isArray(contacts) || contacts.length === 0) {
    return NextResponse.json(
      { error: "session, chatId, dan contacts (array vcard) wajib diisi" },
      { status: 400 },
    );
  }
  const { user, response } = await requireSessionAccess(session);
  if (response) return response;
  if (!hasQuotaRemaining(user!)) return quotaExceededResponse();
  const ownerId = getSessionOwner(session) ?? user!.id;
  const apiKey = await getCurrentApiKey();

  try {
    const message = await sendContactVcard(
      session,
      chatId,
      contacts as VCardContact[],
    );
    logEvent({ ownerId, actorId: user!.id, apiKeyId: apiKey?.id, direction: "out", session, chatId, kind: "vcard", status: "sent", source: "manual" });
    incrementQuotaUsage(ownerId);
    return NextResponse.json(message, { status: 201 });
  } catch (err) {
    const status = err instanceof WahaError ? err.status : 500;
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    logEvent({ ownerId, actorId: user!.id, apiKeyId: apiKey?.id, direction: "out", session, chatId, kind: "vcard", status: "failed", source: "manual", error: errorMessage });
    return NextResponse.json({ error: errorMessage }, { status });
  }
}
