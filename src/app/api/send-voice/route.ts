import { NextRequest, NextResponse } from "next/server";
import { sendVoice, WahaError, type FileInput } from "@/lib/waha";
import { logEvent } from "@/lib/messageLog";
import { getSessionOwner, requireSessionAccess } from "@/lib/tenancy";

export async function POST(req: NextRequest) {
  const { session, chatId, file } = await req.json();
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
  const ownerId = getSessionOwner(session) ?? user!.id;

  try {
    const message = await sendVoice(session, chatId, file as FileInput);
    logEvent({ ownerId, direction: "out", session, chatId, kind: "voice", status: "sent", source: "manual" });
    return NextResponse.json(message, { status: 201 });
  } catch (err) {
    const status = err instanceof WahaError ? err.status : 500;
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    logEvent({ ownerId, direction: "out", session, chatId, kind: "voice", status: "failed", source: "manual", error: errorMessage });
    return NextResponse.json({ error: errorMessage }, { status });
  }
}
