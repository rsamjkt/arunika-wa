import { NextRequest, NextResponse } from "next/server";
import { sendText, WahaError } from "@/lib/waha";
import { logEvent } from "@/lib/messageLog";
import { getCurrentApiKey } from "@/lib/currentUser";
import { getSessionOwner, requireSessionAccess } from "@/lib/tenancy";
import { hasQuotaRemaining, quotaExceededResponse } from "@/lib/authz";
import { incrementQuotaUsage } from "@/lib/users";

export async function POST(req: NextRequest) {
  const { session, chatId, text } = await req.json();
  if (!session || !chatId || !text) {
    return NextResponse.json(
      { error: "session, chatId, dan text wajib diisi" },
      { status: 400 },
    );
  }
  const { user, response } = await requireSessionAccess(session);
  if (response) return response;
  if (!hasQuotaRemaining(user!)) return quotaExceededResponse();
  const ownerId = getSessionOwner(session) ?? user!.id;
  const apiKey = await getCurrentApiKey();

  try {
    const message = await sendText(session, chatId, text);
    logEvent({ ownerId, actorId: user!.id, apiKeyId: apiKey?.id, direction: "out", session, chatId, kind: "text", status: "sent", source: "manual" });
    incrementQuotaUsage(ownerId);
    return NextResponse.json(message, { status: 201 });
  } catch (err) {
    const status = err instanceof WahaError ? err.status : 500;
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    logEvent({ ownerId, actorId: user!.id, apiKeyId: apiKey?.id, direction: "out", session, chatId, kind: "text", status: "failed", source: "manual", error: errorMessage });
    return NextResponse.json({ error: errorMessage }, { status });
  }
}
