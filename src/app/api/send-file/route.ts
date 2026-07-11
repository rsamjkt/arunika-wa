import { NextRequest, NextResponse } from "next/server";
import { sendFile, WahaError, type FileInput } from "@/lib/waha";
import { logEvent } from "@/lib/messageLog";
import { getSessionOwner, requireSessionAccess } from "@/lib/tenancy";
import { hasQuotaRemaining, quotaExceededResponse } from "@/lib/authz";
import { incrementQuotaUsage } from "@/lib/users";

export async function POST(req: NextRequest) {
  const { session, chatId, file, caption } = await req.json();
  if (!session || !chatId || !file?.mimetype || !(file.url || file.data)) {
    return NextResponse.json(
      {
        error:
          "session, chatId, dan file (mimetype + url atau data base64) wajib diisi",
      },
      { status: 400 },
    );
  }
  const { user, response } = await requireSessionAccess(session);
  if (response) return response;
  if (!hasQuotaRemaining(user!)) return quotaExceededResponse();
  const ownerId = getSessionOwner(session) ?? user!.id;

  try {
    const message = await sendFile(session, chatId, file as FileInput, caption);
    logEvent({ ownerId, direction: "out", session, chatId, kind: "file", status: "sent", source: "manual" });
    incrementQuotaUsage(ownerId);
    return NextResponse.json(message, { status: 201 });
  } catch (err) {
    const status = err instanceof WahaError ? err.status : 500;
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    logEvent({ ownerId, direction: "out", session, chatId, kind: "file", status: "failed", source: "manual", error: errorMessage });
    return NextResponse.json({ error: errorMessage }, { status });
  }
}
