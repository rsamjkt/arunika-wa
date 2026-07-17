import { NextRequest, NextResponse } from "next/server";
import { sendText, WahaError } from "@/lib/waha";
import { logEvent } from "@/lib/messageLog";
import { getCurrentApiKey } from "@/lib/currentUser";
import { getSessionOwner, requireSessionAccess } from "@/lib/tenancy";
import { reserveQuota, refundQuota, quotaExceededResponse } from "@/lib/authz";
import { parseJsonBody } from "@/lib/parseJsonBody";

export async function POST(req: NextRequest) {
  const { body, response: parseError } = await parseJsonBody(req);
  if (parseError) return parseError;
  const { session, chatId, text } = body!;
  if (!session || !chatId || !text) {
    return NextResponse.json(
      { error: "session, chatId, dan text wajib diisi" },
      { status: 400 },
    );
  }
  const { user, response } = await requireSessionAccess(session);
  if (response) return response;
  if (!reserveQuota(user!)) return quotaExceededResponse();
  const ownerId = getSessionOwner(session) ?? user!.id;
  const apiKey = await getCurrentApiKey();

  try {
    const message = await sendText(session, chatId, text);
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
