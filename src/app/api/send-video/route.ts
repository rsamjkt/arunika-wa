import { NextRequest, NextResponse } from "next/server";
import { sendVideo, WahaError, type FileInput } from "@/lib/waha";
import { logEvent } from "@/lib/messageLog";

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
  try {
    const message = await sendVideo(session, chatId, file as FileInput, caption);
    logEvent({ direction: "out", session, chatId, kind: "video", status: "sent", source: "manual" });
    return NextResponse.json(message, { status: 201 });
  } catch (err) {
    const status = err instanceof WahaError ? err.status : 500;
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    logEvent({ direction: "out", session, chatId, kind: "video", status: "failed", source: "manual", error: errorMessage });
    return NextResponse.json({ error: errorMessage }, { status });
  }
}
