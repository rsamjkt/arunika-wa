import { NextRequest, NextResponse } from "next/server";
import { sendLinkPreview, WahaError } from "@/lib/waha";
import { logEvent } from "@/lib/messageLog";
import { getCurrentApiKey } from "@/lib/currentUser";
import { getSessionOwner, requireSessionAccess } from "@/lib/tenancy";
import { reserveQuota, refundQuota, quotaExceededResponse } from "@/lib/authz";
import { parseJsonBody } from "@/lib/parseJsonBody";
import { isSafeExternalUrl } from "@/lib/urlSafety";

export async function POST(req: NextRequest) {
  const { body, response: parseError } = await parseJsonBody(req);
  if (parseError) return parseError;
  const { session, chatId, url, title } = body!;
  if (!session || !chatId || !url || !title) {
    return NextResponse.json(
      { error: "session, chatId, url, dan title wajib diisi" },
      { status: 400 },
    );
  }
  if (!isSafeExternalUrl(url)) {
    return NextResponse.json({ error: "URL tidak valid atau menunjuk ke alamat internal" }, { status: 400 });
  }
  const { user, response } = await requireSessionAccess(session);
  if (response) return response;
  if (!reserveQuota(user!)) return quotaExceededResponse();
  const ownerId = getSessionOwner(session) ?? user!.id;
  const apiKey = await getCurrentApiKey();

  try {
    const message = await sendLinkPreview(session, chatId, url, title);
    logEvent({ ownerId, actorId: user!.id, apiKeyId: apiKey?.id, direction: "out", session, chatId, kind: "other", status: "sent", source: "manual" });
    return NextResponse.json(message, { status: 201 });
  } catch (err) {
    const status = err instanceof WahaError ? err.status : 500;
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    refundQuota(user!);
    logEvent({ ownerId, actorId: user!.id, apiKeyId: apiKey?.id, direction: "out", session, chatId, kind: "other", status: "failed", source: "manual", error: errorMessage });
    return NextResponse.json({ error: errorMessage }, { status });
  }
}
