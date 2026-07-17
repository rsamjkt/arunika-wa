import { NextRequest, NextResponse } from "next/server";
import { sendVoice, WahaError, type FileInput } from "@/lib/waha";
import { logEvent } from "@/lib/messageLog";
import { getCurrentApiKey } from "@/lib/currentUser";
import { getSessionOwner, requireSessionAccess } from "@/lib/tenancy";
import { reserveQuota, refundQuota, quotaExceededResponse } from "@/lib/authz";
import { isSafeExternalUrl } from "@/lib/urlSafety";
import { parseJsonBody } from "@/lib/parseJsonBody";

export async function POST(req: NextRequest) {
  const { body, response: parseError } = await parseJsonBody(req);
  if (parseError) return parseError;
  const { session, chatId, file } = body!;
  if (!session || !chatId || !file?.mimetype || !(file.url || file.data)) {
    return NextResponse.json(
      {
        error:
          "session, chatId, dan file (mimetype + url atau data base64) wajib diisi",
      },
      { status: 400 },
    );
  }
  if (file.url && !isSafeExternalUrl(file.url)) {
    return NextResponse.json({ error: "URL file tidak valid atau menunjuk ke alamat internal" }, { status: 400 });
  }
  const { user, response } = await requireSessionAccess(session);
  if (response) return response;
  if (!reserveQuota(user!)) return quotaExceededResponse();
  const ownerId = getSessionOwner(session) ?? user!.id;
  const apiKey = await getCurrentApiKey();

  try {
    const message = await sendVoice(session, chatId, file as FileInput);
    logEvent({ ownerId, actorId: user!.id, apiKeyId: apiKey?.id, direction: "out", session, chatId, kind: "voice", status: "sent", source: "manual" });
    return NextResponse.json(message, { status: 201 });
  } catch (err) {
    const status = err instanceof WahaError ? err.status : 500;
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    refundQuota(user!);
    logEvent({ ownerId, actorId: user!.id, apiKeyId: apiKey?.id, direction: "out", session, chatId, kind: "voice", status: "failed", source: "manual", error: errorMessage });
    return NextResponse.json({ error: errorMessage }, { status });
  }
}
