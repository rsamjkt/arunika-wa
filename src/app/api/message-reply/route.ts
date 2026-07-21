import { NextRequest, NextResponse } from "next/server";
import { replyMessage, WahaError } from "@/lib/waha";
import { logEvent } from "@/lib/messageLog";
import { getCurrentApiKey } from "@/lib/currentUser";
import { getSessionOwner, requireSessionAccess } from "@/lib/tenancy";
import { reserveQuota, refundQuota, quotaExceededResponse } from "@/lib/authz";
import { parseJsonBody } from "@/lib/parseJsonBody";

export async function POST(req: NextRequest) {
  const { body, response: parseError } = await parseJsonBody(req);
  if (parseError) return parseError;
  const { session, chatId, replyTo, text } = body!;
  if (!session || !chatId || !replyTo || !text) {
    return NextResponse.json(
      { error: "session, chatId, replyTo, dan text wajib diisi" },
      { status: 400 },
    );
  }
  const { user, response } = await requireSessionAccess(session);
  if (response) return response;
  // Same real outbound send as send-text — must count against the same
  // plan quota, or a tenant can bypass the monthly limit entirely by
  // always replying instead of sending fresh (see security audit finding).
  if (!reserveQuota(user!)) return quotaExceededResponse();
  const ownerId = getSessionOwner(session) ?? user!.id;
  const apiKey = await getCurrentApiKey();

  try {
    const message = await replyMessage(session, chatId, replyTo, text);
    logEvent({ ownerId, actorId: user!.id, apiKeyId: apiKey?.id, direction: "out", session, chatId, kind: "text", status: "sent", source: "manual" });
    return NextResponse.json(message, { status: 201 });
  } catch (err) {
    const status = err instanceof WahaError ? err.status : 500;
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    refundQuota(user!);
    logEvent({ ownerId, actorId: user!.id, apiKeyId: apiKey?.id, direction: "out", session, chatId, kind: "text", status: "failed", source: "manual", error: errorMessage });
    return NextResponse.json({ error: errorMessage }, { status });
  }
}
